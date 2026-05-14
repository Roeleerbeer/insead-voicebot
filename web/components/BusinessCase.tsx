"use client";

import Icon from "./ui/Icon";

type Props = {
  /** Pre-rendered HTML from agent/content/use-case.md (single source of truth
   *  shared with the LiveKit agent's system prompt, so the page and the bot
   *  describe the same case). */
  html: string;
  onAskResona: () => void;
};

export default function BusinessCase({ html, onAskResona }: Props) {
  return (
    <div className="case">
      <div
        className="case-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="ask-resona">
        <div className="mini-orb" />
        <p>
          Rather hear this out loud?
          <small>
            The voicebot can walk you through any section in about ninety
            seconds.
          </small>
        </p>
        <button className="btn btn-primary" onClick={onAskResona}>
          <Icon name="mic" size={16} />
          Ask the voicebot
        </button>
      </div>
    </div>
  );
}
