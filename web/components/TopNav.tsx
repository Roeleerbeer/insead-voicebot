"use client";

import { useEffect, useState } from "react";
import Icon from "./ui/Icon";
import StatusPill, { type StatusState } from "./ui/StatusPill";

export type Route =
  | "voice"
  | "transcript"
  | "case"
  | "tech"
  | "about"
  | "faq";

type Props = {
  current: Route;
  onNavigate: (r: Route) => void;
  status?: StatusState;
};

type Theme = "light" | "dark";

const ITEMS: { id: Route; label: string }[] = [
  { id: "voice", label: "Voice" },
  { id: "case",  label: "Business case" },
  { id: "tech",  label: "Tech stack" },
  { id: "about", label: "About" },
  { id: "faq",   label: "FAQ" },
];

export default function TopNav({ current, onNavigate, status }: Props) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const t = (document.documentElement.dataset.theme as Theme) || "dark";
    setTheme(t);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("insead-voicebot-theme", theme);
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [theme]);

  return (
    <header className="topnav">
      <div className="topnav-brand" onClick={() => onNavigate("voice")}>
        <span className="topnav-mark" />
        <span className="topnav-name">
          INSEAD Voicebot<span className="topnav-cadence" />
        </span>
      </div>
      <nav className="topnav-items">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className={`topnav-item ${current === item.id ? "is-active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="topnav-status">
        <div className="theme-toggle" role="group" aria-label="Theme">
          <button
            className={`theme-toggle-opt${theme === "light" ? " is-active" : ""}`}
            onClick={() => setTheme("light")}
            aria-label="Light mode"
            aria-pressed={theme === "light"}
          >
            <Icon name="sun" size={14} />
          </button>
          <button
            className={`theme-toggle-opt${theme === "dark" ? " is-active" : ""}`}
            onClick={() => setTheme("dark")}
            aria-label="Dark mode"
            aria-pressed={theme === "dark"}
          >
            <Icon name="moon" size={14} />
          </button>
          <span
            className={`theme-toggle-thumb theme-toggle-thumb-${theme}`}
            aria-hidden="true"
          />
        </div>
        {status && <StatusPill state={status} />}
      </div>
    </header>
  );
}
