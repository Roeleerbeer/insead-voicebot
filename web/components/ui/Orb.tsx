"use client";

import { useEffect, useId, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

type Props = {
  state?: OrbState;
  size?: number;
  onClick?: () => void;
  /** 0..1 RMS amplitude. Undefined → simulator runs. */
  amplitude?: number;
};

const VB = 400;

const RINGS = [
  { r: 142, sw: 1.2, op: 0.55, dash: "" },
  { r: 132, sw: 1.6, op: 0.85, dash: "" },
  { r: 124, sw: 1.0, op: 0.95, dash: "" },
  { r: 118, sw: 1.4, op: 0.7,  dash: "" },
  { r: 110, sw: 0.9, op: 0.55, dash: "2 6" },
];

type Baseline = { freq: number; scale: number; speed: number; glow: number };

function baseline(state: OrbState): Baseline {
  // idle reuses listening's baseline so the pre-tap orb matches the
  // connected-but-quiet orb (filter wispiness, halo glow, ring strokes).
  if (state === "idle" || state === "listening") {
    return { freq: 0.020, scale: 18, speed: 4, glow: 0.45 };
  }
  if (state === "thinking") return { freq: 0.018, scale: 20, speed: 6, glow: 0.45 };
  return { freq: 0.026, scale: 22, speed: 2.6, glow: 0.55 };
}

const cx = VB / 2;
const cy = VB / 2;

export default function Orb({
  state = "idle",
  size = 280,
  onClick,
  amplitude,
}: Props) {
  const isInteractive = Boolean(onClick);
  const uid = useId().replace(/:/g, "");

  // ---- Refs the rAF loop reads (latest props without retriggering effects) ----
  const stateRef = useRef(state);
  stateRef.current = state;
  const ampPropRef = useRef(amplitude);
  ampPropRef.current = amplitude;

  // ---- Element refs the rAF loop mutates ----
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const ringMainRefs = useRef<(SVGCircleElement | null)[]>(
    new Array(RINGS.length).fill(null)
  );
  const ringBloomRefs = useRef<(SVGCircleElement | null)[]>(
    new Array(RINGS.length).fill(null)
  );
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const haloStop60 = useRef<SVGStopElement | null>(null);
  const haloStop78 = useRef<SVGStopElement | null>(null);

  // EMA-smoothed amp. Higher alpha = snappier; lower = smoother.
  // 0.10 at 60fps ≈ 0.16s time constant — wave-like, no spikes.
  const smoothedAmpRef = useRef(0);
  // Smoothed real-audio level (independent of simulator) — used to fade breathing
  // out when someone is actually talking, regardless of state.
  const smoothedRealAudioRef = useRef(0);

  // ---- Single rAF loop — never re-renders React ----
  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const s = stateRef.current;
      const b = baseline(s);

      // idle (pre-tap) shares the listening look so the orb feels continuous
      // before and during a connected-but-quiet session.
      const sim = s === "idle" ? "listening" : s;

      // ---- Target amp (prop wins; else slow single-wave simulator) ----
      let targetAmp: number;
      if (ampPropRef.current !== undefined) {
        targetAmp = ampPropRef.current;
      } else {
        const base =
          sim === "listening" ? 0.40 :
          sim === "thinking" ? 0.30 :
          sim === "speaking" ? 0.70 :
          0.40;
        const wobble =
          sim === "speaking" ? 0.22 * Math.sin(t * 2.4)
          : sim === "thinking" ? 0.06 * Math.sin(t * 1.0)
          : 0.10 * Math.sin(t * 1.3);
        targetAmp = Math.max(0, Math.min(1, base + wobble));
      }

      // ---- EMA smoothing — kills spikes from sim harmonics or noisy audio ----
      const alpha = 0.10;
      smoothedAmpRef.current += (targetAmp - smoothedAmpRef.current) * alpha;
      const amp = smoothedAmpRef.current;

      // Real-audio level (0 when no audio wired) drives breath suppression.
      const realAudio = ampPropRef.current ?? 0;
      smoothedRealAudioRef.current +=
        (realAudio - smoothedRealAudioRef.current) * alpha;
      // breathFactor: 1 when quiet, fades to 0 as real audio comes in.
      const breathFactor = Math.max(0, 1 - smoothedRealAudioRef.current * 3.5);

      // Button-level scale: gentle breathing when waiting, steady when someone talks.
      const breathScale = 1 + breathFactor * 0.028 * Math.sin(t * 1.85);
      if (buttonRef.current) {
        buttonRef.current.style.transform = `scale(${breathScale})`;
      }

      // Amplitude-modulated filter/halo/ring params. Multipliers scale up with
      // real-audio intensity so the orb is calm while waiting but energetic
      // when someone is actually talking.
      const intensity = 1 - breathFactor; // 0 waiting → 1 talking
      const scale = b.scale + amp * (14 + intensity * 26);
      const glow = Math.min(1, b.glow + amp * (0.35 + intensity * 0.35));
      const strokeBoost = 1 + amp * (0.35 + intensity * 0.65);

      // 1. Displacement scale (drives the wispy distortion)
      dispRef.current?.setAttribute("scale", String(scale));

      // 2. Halo gradient stops (drive the bloom intensity)
      haloStop60.current?.setAttribute("stop-opacity", String(glow * 0.55));
      haloStop78.current?.setAttribute("stop-opacity", String(glow * 0.35));

      // 3. Ring stroke widths
      for (let i = 0; i < RINGS.length; i++) {
        const r = RINGS[i];
        const main = ringMainRefs.current[i];
        const bloom = ringBloomRefs.current[i];
        if (main) main.setAttribute("stroke-width", String(r.sw * strokeBoost));
        if (bloom) bloom.setAttribute("stroke-width", String(r.sw * 2.2 * strokeBoost));
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Initial SSR + first-paint values come from current state at amp=0.
  const b0 = baseline(state);

  return (
    <button
      ref={buttonRef}
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
              baseFrequency={b0.freq}
              numOctaves={1}
              seed={3}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur={`${b0.speed * 1.8}s`}
                values={`${b0.freq};${b0.freq * 1.3};${b0.freq}`}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="noise"
              scale={b0.scale}
            />
          </filter>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={8} />
          </filter>
          <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  style={{ stopColor: "var(--orb-halo-2)", stopOpacity: 0 }} />
            <stop offset="48%" style={{ stopColor: "var(--orb-halo-2)", stopOpacity: 0 }} />
            <stop
              ref={haloStop60}
              offset="60%"
              style={{ stopColor: "var(--orb-halo-1)", stopOpacity: b0.glow * 0.55 }}
            />
            <stop
              ref={haloStop78}
              offset="78%"
              style={{ stopColor: "var(--orb-halo-2)", stopOpacity: b0.glow * 0.35 }}
            />
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
                ref={(el) => {
                  ringBloomRefs.current[i] = el;
                }}
                cx={cx}
                cy={cy}
                r={r.r}
                fill="none"
                style={{ stroke: "var(--orb-bloom)" }}
                strokeWidth={r.sw * 2.2}
                opacity={r.op * 0.6}
              />
            ))}
          </g>
        </g>

        <g filter={`url(#${uid}-wisp)`}>
          {RINGS.map((r, i) => (
            <circle
              key={`r${i}`}
              ref={(el) => {
                ringMainRefs.current[i] = el;
              }}
              cx={cx}
              cy={cy}
              r={r.r}
              fill="none"
              style={{ stroke: "var(--orb-stroke)" }}
              strokeWidth={r.sw}
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
