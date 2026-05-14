"use client";

import { useEffect, useId, useMemo, useState } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

type Props = {
  state?: OrbState;
  size?: number;
  onClick?: () => void;
  /** 0..1 RMS amplitude of current audio buffer. If undefined, simulator runs. */
  amplitude?: number;
  /** N normalized FFT bins (low→high), N=36 recommended. If undefined, simulator runs. */
  frequencyBands?: number[];
};

const VB = 400;
const N_TENDRILS = 36;

const RINGS = [
  { r: 142, sw: 1.2, op: 0.55, dash: "" },
  { r: 132, sw: 1.6, op: 0.85, dash: "" },
  { r: 124, sw: 1.0, op: 0.95, dash: "" },
  { r: 118, sw: 1.4, op: 0.7,  dash: "" },
  { r: 110, sw: 0.9, op: 0.55, dash: "2 6" },
];

export default function Orb({
  state = "idle",
  size = 280,
  onClick,
  amplitude,
  frequencyBands,
}: Props) {
  const isInteractive = Boolean(onClick);
  const uid = useId().replace(/:/g, "");

  // Simulator — runs only when no real audio is supplied.
  const [simAmp, setSimAmp] = useState(0);
  const [simBands, setSimBands] = useState<number[]>(() =>
    new Array(N_TENDRILS).fill(0)
  );
  useEffect(() => {
    if (amplitude !== undefined) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const base =
        state === "idle" ? 0.1 :
        state === "listening" ? 0.55 :
        state === "thinking" ? 0.25 :
        0.75;
      const wobble =
        state === "speaking"
          ? 0.35 * (Math.sin(t * 7) * 0.5 + Math.sin(t * 13) * 0.3 + Math.sin(t * 23) * 0.2)
          : state === "listening"
          ? 0.3 * (Math.sin(t * 4) * 0.6 + Math.sin(t * 11) * 0.4)
          : state === "thinking"
          ? 0.1 * Math.sin(t * 3)
          : 0.05 * Math.sin(t * 1.2);
      const amp = Math.max(0, Math.min(1, base + wobble));
      setSimAmp(amp);
      const bands = new Array(N_TENDRILS);
      for (let i = 0; i < N_TENDRILS; i++) {
        const phase = i * 0.45;
        const lowBias =
          state === "speaking" ? Math.exp(-i / 14) : Math.exp(-i / 22);
        bands[i] = Math.max(
          0,
          Math.min(
            1,
            amp * (0.4 + 0.6 * lowBias) *
              (0.7 + 0.5 * Math.sin(t * (3 + (i % 5)) + phase))
          )
        );
      }
      setSimBands(bands);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, amplitude]);

  const amp = amplitude !== undefined ? amplitude : simAmp;
  const bands = frequencyBands && frequencyBands.length ? frequencyBands : simBands;

  // State baseline → amplitude-modulated render params
  const params = useMemo(() => {
    const base =
      state === "idle"
        ? { freq: 0.012, scale: 10, speed: 14,  glow: 0.30 }
        : state === "listening"
        ? { freq: 0.020, scale: 18, speed: 4,   glow: 0.45 }
        : state === "thinking"
        ? { freq: 0.018, scale: 20, speed: 6,   glow: 0.45 }
        : { freq: 0.026, scale: 22, speed: 2.6, glow: 0.55 };
    return {
      freq: base.freq * (1 + amp * 0.8),
      scale: base.scale + amp * 36,
      speed: base.speed,
      glow: Math.min(1, base.glow + amp * 0.55),
      strokeBoost: 1 + amp * 0.9,
    };
  }, [state, amp]);

  const cx = VB / 2;
  const cy = VB / 2;
  const tendrils = useMemo(() => {
    return Array.from({ length: N_TENDRILS }, (_, i) => {
      const a = (i / N_TENDRILS) * Math.PI * 2;
      const inner = 145 + (i % 3) * 4;
      const bandEnergy = bands[i] || 0;
      const outer = inner + 18 + bandEnergy * 60 + ((i * 17) % 18);
      return {
        x1: cx + Math.cos(a) * inner,
        y1: cy + Math.sin(a) * inner,
        x2: cx + Math.cos(a) * outer,
        y2: cy + Math.sin(a) * outer,
        op: 0.22 + bandEnergy * 0.7,
        sw: 0.7 + bandEnergy * 1.6,
      };
    });
  }, [bands, cx, cy]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={`orb orb-anim-${state}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: 0,
        padding: 0,
        background: "transparent",
        cursor: isInteractive ? "pointer" : "default",
        willChange: "transform, filter",
        outline: "none",
        position: "relative",
        overflow: "visible",
      }}
      aria-label={`Orb · ${state}`}
    >
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        style={{ display: "block", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <filter id={`${uid}-wisp`} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={params.freq}
              numOctaves={2}
              seed={3}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur={`${params.speed}s`}
                values={`${params.freq};${params.freq * 1.8};${params.freq}`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="seed"
                dur={`${params.speed * 2}s`}
                values="3;7;13;19;3"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={params.scale} />
          </filter>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={8} />
          </filter>
          <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  style={{ stopColor: "var(--orb-halo-2)", stopOpacity: 0 }} />
            <stop offset="48%" style={{ stopColor: "var(--orb-halo-2)", stopOpacity: 0 }} />
            <stop offset="60%" style={{ stopColor: "var(--orb-halo-1)", stopOpacity: params.glow * 0.55 }} />
            <stop offset="78%" style={{ stopColor: "var(--orb-halo-2)", stopOpacity: params.glow * 0.35 }} />
            <stop offset="100%" style={{ stopColor: "var(--orb-halo-2)", stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  style={{ stopColor: "var(--orb-core-0)", stopOpacity: 1 }} />
            <stop offset="55%" style={{ stopColor: "var(--orb-core-1)", stopOpacity: 0.9 }} />
            <stop offset="85%" style={{ stopColor: "var(--orb-core-1)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={195} fill={`url(#${uid}-halo)`} />

        <g filter={`url(#${uid}-glow)`} opacity={0.7}>
          <g filter={`url(#${uid}-wisp)`}>
            {RINGS.map((r, i) => (
              <circle
                key={`b${i}`}
                cx={cx}
                cy={cy}
                r={r.r}
                fill="none"
                style={{ stroke: "var(--orb-bloom)" }}
                strokeWidth={r.sw * 2.2 * params.strokeBoost}
                opacity={r.op * 0.6}
              />
            ))}
          </g>
        </g>

        <g filter={`url(#${uid}-wisp)`}>
          {tendrils.map((t, i) => (
            <line
              key={`t${i}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              style={{ stroke: "var(--orb-tendril)" }}
              strokeWidth={t.sw}
              strokeLinecap="round"
              opacity={t.op}
            />
          ))}
          {RINGS.map((r, i) => (
            <circle
              key={`r${i}`}
              cx={cx}
              cy={cy}
              r={r.r}
              fill="none"
              style={{ stroke: "var(--orb-stroke)" }}
              strokeWidth={r.sw * params.strokeBoost}
              strokeDasharray={r.dash}
              opacity={r.op}
            />
          ))}
        </g>

        <circle cx={cx} cy={cy} r={105} fill={`url(#${uid}-core)`} />
      </svg>
    </button>
  );
}
