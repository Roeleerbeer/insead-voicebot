"use client";

import Icon from "./ui/Icon";
import Pill, { Eyebrow } from "./ui/Pill";

const PIPELINE = [
  { step: "01", role: "Capture", vendor: "Deepgram Nova-3",  desc: "Streaming ASR. ~80ms first-token latency." },
  { step: "02", role: "Reason",  vendor: "Claude Haiku 4.5", desc: "Anthropic LLM handles understanding + response." },
  { step: "03", role: "Ground",  vendor: "Inline corpus",    desc: "Persona, FAQ, team and use-case markdown." },
  { step: "04", role: "Speak",   vendor: "ElevenLabs Flash", desc: "Sub-300ms TTS with one consistent voice." },
];

const ROWS: { title: string; body: string[]; meta: string[] }[] = [
  {
    title: "Realtime voice pipeline",
    body: [
      "LiveKit Agents orchestrates the realtime loop. Deepgram does streaming ASR, Claude Haiku 4.5 generates responses, ElevenLabs Flash returns sub-300ms TTS. The full round-trip targets under 800ms end-to-end.",
      "Turn-taking is voice-activity driven (Silero VAD). The agent worker runs as a Python process; the browser holds a LiveKit WebRTC session over a self-hosted livekit-server.",
    ],
    meta: ["livekit-agents", "<800ms p50", "silero vad"],
  },
  {
    title: "Speech in & out",
    body: [
      "Deepgram Nova-3 handles streaming ASR with low first-token latency. ElevenLabs Flash provides a consistent cloned voice.",
      "Both providers are wrapped behind LiveKit's plugin interface so we can swap if vendor pricing or SLAs change.",
    ],
    meta: ["deepgram nova-3", "elevenlabs flash", "plugin adapter"],
  },
  {
    title: "Knowledge grounding",
    body: [
      "Persona, course summary, FAQ, team bios, and the use-case brief are inlined as Markdown into the system prompt — small enough to fit fully cached, large enough to answer detailed questions.",
      "Anthropic prompt caching keeps the system prompt on the cache hit path between turns.",
    ],
    meta: ["inline markdown", "ephemeral cache", "no rag"],
  },
  {
    title: "Transcript streaming",
    body: [
      "Bot transcript appears in the browser word-by-word, paced to TTS audio playback. Driven by LiveKit Agents' TranscriptSynchronizer.",
      "User transcript appears as Deepgram finalizes segments. Both are rendered as participants emit segments on RoomEvent.TranscriptionReceived.",
    ],
    meta: ["audio-synced", "RoomEvent.TranscriptionReceived"],
  },
  {
    title: "Lifecycle & safety",
    body: [
      "Sessions cap at five minutes and auto-end after sixty seconds of silence, with a spoken goodbye.",
      "Default LiveKit dev keys are used for the local stack; production deployment uses generated keys per the deployment plan.",
    ],
    meta: ["5-min cap", "60s silence timeout", "dev keys local-only"],
  },
];

export default function TechStack({ onAskResona }: { onAskResona: () => void }) {
  return (
    <div className="tech">
      <div className="tech-head">
        <Eyebrow>Tech stack</Eyebrow>
        <h1>
          How the voicebot <em>actually works.</em>
        </h1>
        <p>
          A tight realtime voice loop on LiveKit Agents, with off-the-shelf
          STT, LLM, and TTS providers wrapped behind swappable plugins.
        </p>
      </div>

      <div className="tech-pipeline">
        {PIPELINE.map((stage) => (
          <div key={stage.step} className="tech-stage">
            <div className="step">{stage.step}</div>
            <div className="role">{stage.role}</div>
            <div className="vendor">{stage.vendor}</div>
            <div className="desc">{stage.desc}</div>
            <div className="arrow">
              <Icon name="arrow" size={20} strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div>
        {ROWS.map((row) => (
          <div key={row.title} className="tech-row">
            <h2>{row.title}</h2>
            <div>
              {row.body.map((b, i) => (
                <p key={i}>{b}</p>
              ))}
              <div className="meta-row">
                {row.meta.map((m) => (
                  <Pill key={m}>{m}</Pill>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="mini-launcher" onClick={onAskResona}>
        <span className="mini-orb" />
        Ask the voicebot about this
      </button>
    </div>
  );
}
