export type StatusState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "connected"
  | "connecting";

const MAP: Record<StatusState, { label: string; tone: string }> = {
  idle:       { label: "Idle",       tone: "muted" },
  connecting: { label: "Connecting", tone: "muted" },
  listening:  { label: "Listening",  tone: "active" },
  thinking:   { label: "Thinking",   tone: "active" },
  speaking:   { label: "Speaking",   tone: "active" },
  connected:  { label: "Connected",  tone: "success" },
};

export default function StatusPill({ state }: { state: StatusState }) {
  const s = MAP[state] ?? MAP.idle;
  return (
    <span className={`pill pill-${s.tone}`}>
      <span className="pill-dot" />
      {s.label}
    </span>
  );
}
