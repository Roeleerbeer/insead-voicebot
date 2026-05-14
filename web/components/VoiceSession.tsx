"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type TranscriptionSegment,
  type Participant,
} from "livekit-client";

type TranscriptTurn = { id: string; role: "user" | "bot"; text: string; final: boolean };

export default function VoiceSession() {
  const [status, setStatus] = useState<string>("idle");
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const roomRef = useRef<Room | null>(null);

  const cleanup = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setConnecting(true);
    setStatus("requesting token");
    setTranscript([]);

    try {
      const res = await fetch("/api/token", { method: "POST" });
      if (!res.ok) throw new Error(`token endpoint: ${res.status}`);
      const { token, url } = (await res.json()) as { room: string; token: string; url: string };

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setStatus(state);
        if (state === ConnectionState.Disconnected) cleanup();
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        // Agent left (silence timeout, 5-min cap, crash) — end the session our side too.
        cleanup();
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
        }
      });

      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant?: Participant) => {
          const role: "user" | "bot" = participant?.isLocal ? "user" : "bot";
          setTranscript((prev) => {
            const next = [...prev];
            for (const seg of segments) {
              const idx = next.findIndex((t) => t.id === seg.id);
              const turn: TranscriptTurn = {
                id: seg.id,
                role,
                text: seg.text,
                final: seg.final,
              };
              if (idx >= 0) next[idx] = turn;
              else next.push(turn);
            }
            return next;
          });
        },
      );

      setStatus("connecting");
      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setStatus("connected");
    } catch (err) {
      console.error(err);
      setStatus(`error: ${(err as Error).message}`);
      cleanup();
    } finally {
      setConnecting(false);
    }
  }, [cleanup]);

  const end = useCallback(() => cleanup(), [cleanup]);

  const active = roomRef.current !== null && status !== "idle" && !status.startsWith("error");

  return (
    <>
      <div className="status">status: {status}</div>
      {active ? (
        <button onClick={end}>End</button>
      ) : (
        <button onClick={start} disabled={connecting}>
          {connecting ? "Starting…" : "Start conversation"}
        </button>
      )}
      <div className="transcript">
        {transcript.length === 0 ? (
          <span className="transcript-empty">Transcript appears here.</span>
        ) : (
          transcript.map((t) => (
            <div key={t.id} className={t.role === "user" ? "role-user" : "role-bot"}>
              <strong>{t.role === "user" ? "You" : "Bot"}:</strong> {t.text}
            </div>
          ))
        )}
      </div>
    </>
  );
}
