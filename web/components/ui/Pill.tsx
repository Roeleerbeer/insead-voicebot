import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  active?: boolean;
  tone?: "default" | "muted" | "active" | "success";
};

export default function Pill({ children, active, tone = "default" }: Props) {
  return (
    <span className={`pill ${active ? "is-active" : ""} pill-${tone}`}>
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
