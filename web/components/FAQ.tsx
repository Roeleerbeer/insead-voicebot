"use client";

import Icon from "./ui/Icon";

type Props = {
  /** Pre-rendered HTML from agent/content/faq.md */
  html: string;
  onAskResona: () => void;
};

export default function FAQ({ html, onAskResona }: Props) {
  return (
    <div className="case">
      <div
        className="case-body faq-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="ask-resona">
        <div className="mini-orb" />
        <p>
          Got a question that's not here?
          <small>
            Tap through to the voice tab and just ask — the bot is built on
            this same set of answers.
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
