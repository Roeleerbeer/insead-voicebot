"use client";

import { useEffect, useMemo, useRef } from "react";
import Orb from "./ui/Orb";
import StatusPill from "./ui/StatusPill";
import Icon from "./ui/Icon";
import { useAudioAnalyser } from "./useAudioAnalyser";
import type { ConversationTurn, ConnectionPhase } from "./useVoiceSession";
import type { OrbState } from "./ui/Orb";

type Props = {
  phase: ConnectionPhase;
  orbState: OrbState;
  conversation: ConversationTurn[];
  elapsedSec: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onStart: () => void;
  onEnd: () => void;
};

const SUGGESTIONS = [
  "Walk me through the whole case",
  "What's the projected ROI?",
  "Summarize the risks",
  "How does this work technically?",
];

const STATE_LABEL: Record<OrbState, string> = {
  idle: "Tap the orb to start",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VoiceMode({
  phase,
  orbState,
  conversation,
  elapsedSec,
  localStream,
  remoteStream,
  onStart,
  onEnd,
}: Props) {
  const activeStream = useMemo(() => {
    if (orbState === "speaking") return remoteStream;
    if (orbState === "listening") return localStream;
    return null;
  }, [orbState, localStream, remoteStream]);
  const audio = useAudioAnalyser(activeStream);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [conversation, orbState]);

  const recent = conversation.slice(-5);
  const showSuggestions = phase === "idle" && recent.length === 0;

  const statusLabel: "idle" | "connecting" | "connected" | "listening" | "thinking" | "speaking" =
    phase === "connecting" ? "connecting" :
    phase !== "connected" ? "idle" :
    orbState === "idle" ? "connected" :
    orbState;

  const onOrbTap = phase === "connected" ? undefined : onStart;

  return (
    <div className="voice">
      <div className="voice-orb-wrap">
        <Orb
          state={orbState}
          size={220}
          onClick={onOrbTap}
          amplitude={audio?.amplitude}
        />
        <div className="voice-caption">
          {phase === "connected" && (
            <div className="label">{STATE_LABEL[orbState]}</div>
          )}
          {phase === "idle" && (
            <div className="label">{STATE_LABEL.idle}</div>
          )}
          {phase === "connecting" && (
            <div className="label">Connecting…</div>
          )}
        </div>

        <div className="voice-transcript" ref={transcriptRef} aria-live="polite">
          <ul>
            {recent.map((turn, i) => {
              const isLatest = i === recent.length - 1;
              const isSpeakingLatest =
                isLatest && turn.role === "bot" && orbState === "speaking";
              return (
                <li
                  key={turn.id}
                  className={`vt-turn vt-${turn.role}${isLatest ? " vt-latest" : ""}${isSpeakingLatest ? " vt-speaking" : ""}`}
                >
                  <span className="vt-role">
                    {turn.role === "bot" ? "INSEAD" : "You"}
                  </span>
                  <span className="vt-text">{turn.text}</span>
                </li>
              );
            })}
            {orbState === "listening" && (
              <li className="vt-turn vt-user vt-latest vt-pending">
                <span className="vt-role">You</span>
                <span className="vt-text vt-dots">
                  <span /><span /><span />
                </span>
              </li>
            )}
          </ul>
        </div>

        {showSuggestions && (
          <div className="voice-suggest">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="voice-suggest-chip"
                onClick={onStart}
                title="Tap to start, then ask aloud"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="voice-dock">
        <div className="voice-dock-status">
          <StatusPill state={statusLabel} />
          <span className="time">{formatTime(elapsedSec)}</span>
        </div>
        <div className="voice-dock-actions">
          <button
            className="btn btn-icon"
            aria-label="settings"
            disabled
            title="Settings (not implemented)"
          >
            <Icon name="settings" size={18} />
          </button>
          <button
            className="btn btn-icon btn-end"
            onClick={onEnd}
            disabled={phase !== "connected"}
            aria-label="end session"
          >
            <Icon name="close" size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
