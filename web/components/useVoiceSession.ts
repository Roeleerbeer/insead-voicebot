"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type TranscriptionSegment,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type LocalTrackPublication,
} from "livekit-client";
import type { OrbState } from "./ui/Orb";

const AGENT_STATE_ATTR = "lk.agent.state";

export type ConversationTurn = {
  /** segment id when streaming, or a synthetic id once finalized */
  id: string;
  role: "user" | "bot";
  text: string;
  final: boolean;
};

export type ConnectionPhase =
  | "idle"          // pre-tap: never connected, or session ended
  | "connecting"    // token fetch + room connect in flight
  | "connected"     // room connected, agent participant present
  | "error";

export type VoiceSession = {
  phase: ConnectionPhase;
  /** State the orb should render. Derived from phase + agent attribute + local speaking. */
  orbState: OrbState;
  conversation: ConversationTurn[];
  elapsedSec: number;
  errorMessage?: string;
  /** User's local mic stream — feed into the analyser while orbState === "listening". */
  localStream: MediaStream | null;
  /** Agent's remote audio stream — feed into the analyser while orbState === "speaking". */
  remoteStream: MediaStream | null;
  /** Start (or restart) a session. */
  start: () => Promise<void>;
  /** End the current session. */
  end: () => void;
};

export function useVoiceSession(): VoiceSession {
  const [phase, setPhase] = useState<ConnectionPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [agentAttrState, setAgentAttrState] = useState<string | undefined>();
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<HTMLMediaElement[]>([]);

  // ----- Elapsed timer -----
  useEffect(() => {
    if (phase !== "connected") return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ----- Derive orb state -----
  const orbState: OrbState = (() => {
    if (phase !== "connected") return "idle";
    if (agentAttrState === "speaking") return "speaking";
    if (agentAttrState === "thinking" || agentAttrState === "initializing") {
      return "thinking";
    }
    if (userSpeaking) return "listening";
    return "listening";
  })();

  const cleanup = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }
    audioElsRef.current.forEach((el) => el.remove());
    audioElsRef.current = [];
    setPhase("idle");
    setAgentAttrState(undefined);
    setUserSpeaking(false);
    setElapsedSec(0);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setErrorMessage(undefined);
    setPhase("connecting");
    setConversation([]);
    setElapsedSec(0);

    try {
      const res = await fetch("/api/token", { method: "POST" });
      if (!res.ok) throw new Error(`token endpoint: ${res.status}`);
      const { token, url } = (await res.json()) as {
        room: string;
        token: string;
        url: string;
      };

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setPhase("connected");
        else if (state === ConnectionState.Disconnected) cleanup();
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        // Agent left (silence timeout, 5-min cap, crash) — end our side too.
        cleanup();
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLMediaElement;
          el.style.display = "none";
          document.body.appendChild(el);
          audioElsRef.current.push(el);
          setRemoteStream(new MediaStream([track.mediaStreamTrack]));
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) setRemoteStream(null);
      });

      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant?: Participant) => {
          const role: "user" | "bot" = participant?.isLocal ? "user" : "bot";
          setConversation((prev) => {
            const next = [...prev];
            for (const seg of segments) {
              const idx = next.findIndex((t) => t.id === seg.id);
              const turn: ConversationTurn = {
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

      room.on(
        RoomEvent.ParticipantAttributesChanged,
        (changed: Record<string, string>, participant: Participant) => {
          // Only the remote agent participant carries lk.agent.state.
          if (participant.isLocal) return;
          if (AGENT_STATE_ATTR in changed) {
            setAgentAttrState(changed[AGENT_STATE_ATTR]);
          }
        },
      );

      room.on(
        RoomEvent.ParticipantConnected,
        (p: RemoteParticipant) => {
          const s = p.attributes[AGENT_STATE_ATTR];
          if (s) setAgentAttrState(s);
        },
      );

      // Local participant speaking events — drives 'listening' tint.
      room.localParticipant.on("isSpeakingChanged", (speaking: boolean) => {
        setUserSpeaking(speaking);
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      // Surface the local mic track for audio reactivity.
      const micPub: LocalTrackPublication | undefined =
        room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const micTrack = micPub?.track?.mediaStreamTrack;
      if (micTrack) setLocalStream(new MediaStream([micTrack]));

      // Pick up agent state if the agent participant joined before our listeners.
      room.remoteParticipants.forEach((p) => {
        const s = p.attributes[AGENT_STATE_ATTR];
        if (s) setAgentAttrState(s);
      });
    } catch (err) {
      console.error(err);
      setErrorMessage((err as Error).message);
      setPhase("error");
      cleanup();
    }
  }, [cleanup]);

  const end = useCallback(() => cleanup(), [cleanup]);

  return {
    phase,
    orbState,
    conversation,
    elapsedSec,
    errorMessage,
    localStream,
    remoteStream,
    start,
    end,
  };
}
