"use client";

import { useEffect, useRef, useState } from "react";

export type AudioData = { amplitude: number; bands: number[] };

const N_BANDS = 36;

/**
 * Run a Web Audio AnalyserNode on a MediaStream and emit { amplitude, bands }
 * each animation frame. Returns null when no stream is provided.
 *
 * `amplitude` is RMS over the time-domain buffer (0..1, lightly amplified).
 * `bands` are N_BANDS normalized FFT bins, low → high.
 */
export function useAudioAnalyser(
  stream: MediaStream | null | undefined,
): AudioData | null {
  const [data, setData] = useState<AudioData | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setData(null);
      return;
    }

    let cancelled = false;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {
        /* user gesture required; safe to ignore for analysis-only contexts */
      });
    }
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser);

    const time = new Uint8Array(analyser.fftSize);
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.max(1, Math.floor(freq.length / N_BANDS));

    // Per-stream auto-normalization. Mic RMS (with AGC) and TTS playback RMS
    // are very different absolute levels; without this the orb modulates much
    // harder for one source than the other. Track a slowly-decaying running
    // peak and divide by it so loud moments map to ~1 regardless of source.
    let runningPeak = 0.2;
    const PEAK_DECAY = 0.9985; // ~7s half-life @ 60fps
    const PEAK_FLOOR = 0.05;

    const tick = () => {
      if (cancelled) return;
      analyser.getByteTimeDomainData(time);
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / time.length);
      runningPeak = Math.max(runningPeak * PEAK_DECAY, rms);
      const amplitude = Math.min(1, rms / Math.max(runningPeak, PEAK_FLOOR));
      const bands = new Array(N_BANDS);
      for (let i = 0; i < N_BANDS; i++) bands[i] = freq[i * step] / 255;
      setData({ amplitude, bands });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      try {
        src.disconnect();
      } catch {
        /* already disconnected */
      }
      ctx.close().catch(() => {
        /* already closed */
      });
    };
  }, [stream]);

  return data;
}
