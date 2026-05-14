"use client";

import Icon from "./ui/Icon";

type Props = {
  /** Pre-rendered HTML from agent/content/course.md */
  courseHtml: string;
  /** Pre-rendered HTML from agent/content/team.md */
  teamHtml: string;
  onAskResona: () => void;
};

export default function About({ courseHtml, teamHtml, onAskResona }: Props) {
  return (
    <div className="case">
      <div
        className="case-body"
        dangerouslySetInnerHTML={{ __html: courseHtml }}
      />
      <div
        className="case-body"
        dangerouslySetInnerHTML={{ __html: teamHtml }}
      />

      <div className="ask-resona">
        <div className="mini-orb" />
        <p>
          Want to hear it instead of reading it?
          <small>
            The voicebot can walk you through the course context and the team
            in about a minute.
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
