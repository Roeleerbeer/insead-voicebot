"use client";

import { useEffect, useRef } from "react";
import StatusPill from "./ui/StatusPill";
import type { ConversationTurn } from "./useVoiceSession";
import type { OrbState } from "./ui/Orb";

type Props = {
  conversation: ConversationTurn[];
  orbState: OrbState;
};

export default function Transcript({ conversation, orbState }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.length]);

  const statusLabel = orbState === "idle" ? "connected" : orbState;

  return (
    <div className="transcript-screen" ref={scrollRef}>
      <div className="transcript-header">
        <h1>Transcript</h1>
        <StatusPill state={statusLabel} />
      </div>
      <div className="transcript-list">
        {conversation.length === 0 ? (
          <p style={{ color: "var(--fg-3)" }}>
            Start a conversation on the Voice tab — this page shows the running
            transcript.
          </p>
        ) : (
          conversation.map((turn) => (
            <div key={turn.id} className={`turn ${turn.role}`}>
              <span className="who">{turn.role === "user" ? "You" : "INSEAD"}</span>
              <div className="bubble">{turn.text}</div>
            </div>
          ))
        )}
        {orbState === "thinking" && (
          <div className="turn bot">
            <span className="who">INSEAD</span>
            <div
              className="bubble"
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                padding: "14px 18px",
              }}
            >
              <DotTyping delay="0s" />
              <DotTyping delay="0.2s" />
              <DotTyping delay="0.4s" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DotTyping({ delay }: { delay: string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--fg-3)",
        animation: "pulse-dot 1.2s var(--ease) infinite",
        animationDelay: delay,
      }}
    />
  );
}
