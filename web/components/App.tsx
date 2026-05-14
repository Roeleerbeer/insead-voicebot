"use client";

import { useEffect, useState } from "react";
import TopNav, { type Route } from "./TopNav";
import VoiceMode from "./VoiceMode";
import Transcript from "./Transcript";
import BusinessCase from "./BusinessCase";
import TechStack from "./TechStack";
import About from "./About";
import FAQ from "./FAQ";
import { useVoiceSession } from "./useVoiceSession";
import type { StatusState } from "./ui/StatusPill";

function detectUnsupported(): string | null {
  if (typeof window === "undefined") return null;
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Your browser doesn't expose a microphone API.";
  }
  if (!("AudioContext" in window) && !("webkitAudioContext" in window)) {
    return "Your browser doesn't support the Web Audio API.";
  }
  if (!("RTCPeerConnection" in window)) {
    return "Your browser doesn't support WebRTC.";
  }
  return null;
}

type Props = {
  businessCaseHtml: string;
  courseHtml: string;
  teamHtml: string;
  faqHtml: string;
};

export default function App({
  businessCaseHtml,
  courseHtml,
  teamHtml,
  faqHtml,
}: Props) {
  const [route, setRoute] = useState<Route>("voice");
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const session = useVoiceSession();

  useEffect(() => {
    setUnsupported(detectUnsupported());
  }, []);

  if (unsupported) {
    return (
      <div className="unsupported">
        <h1>Use Chrome or Safari to try the voicebot.</h1>
        <p>{unsupported}</p>
        <p>
          This page needs microphone access, WebRTC, and the Web Audio API.
          It works in recent Chrome, Edge, and Safari. Firefox is best-effort.
        </p>
      </div>
    );
  }

  const navStatus: StatusState =
    session.phase === "connecting" ? "connecting" :
    session.phase !== "connected" ? "idle" :
    session.orbState === "idle" ? "connected" :
    session.orbState;

  const askResona = () => setRoute("voice");

  return (
    <div className="app">
      <TopNav current={route} onNavigate={setRoute} status={navStatus} />
      <div className="app-body">
        <div className={`screen ${route === "voice" ? "is-active" : ""}`}>
          <VoiceMode
            phase={session.phase}
            orbState={session.orbState}
            conversation={session.conversation}
            elapsedSec={session.elapsedSec}
            localStream={session.localStream}
            remoteStream={session.remoteStream}
            errorMessage={session.errorMessage}
            onStart={session.start}
            onEnd={session.end}
          />
        </div>
        <div className={`screen ${route === "transcript" ? "is-active" : ""}`}>
          <Transcript
            conversation={session.conversation}
            orbState={session.orbState}
          />
        </div>
        <div className={`screen ${route === "case" ? "is-active" : ""}`}>
          <BusinessCase html={businessCaseHtml} onAskResona={askResona} />
        </div>
        <div className={`screen ${route === "tech" ? "is-active" : ""}`}>
          <TechStack onAskResona={askResona} />
        </div>
        <div className={`screen ${route === "about" ? "is-active" : ""}`}>
          <About
            courseHtml={courseHtml}
            teamHtml={teamHtml}
            onAskResona={askResona}
          />
        </div>
        <div className={`screen ${route === "faq" ? "is-active" : ""}`}>
          <FAQ html={faqHtml} onAskResona={askResona} />
        </div>
      </div>
    </div>
  );
}
