import type { CSSProperties } from "react";

const ICONS: Record<string, string> = {
  mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z|M19 10v2a7 7 0 0 1-14 0v-2|M12 19v3",
  volume: "M11 5 6 9H2v6h4l5 4V5Z|M19.07 4.93a10 10 0 0 1 0 14.14|M15.54 8.46a5 5 0 0 1 0 7.07",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  settings:
    "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z|circle:12,12,3",
  close: "M18 6 6 18|m6 6 12 12",
  arrow: "M5 12h14|m12 5 7 7-7 7",
  clock: "M12 6v6l4 2|circle:12,12,10",
  check: "M20 7 9 18l-5-5",
  alert: "circle:12,12,10|M12 8v4|M12 16h0",
  copy: "rect:8,8,14,14,2|M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  trend: "M3 3v18h18|m19 9-5 5-4-4-3 3",
  pause: "rect:6,4,4,16,1|rect:14,4,4,16,1",
  play: "M5 3l14 9-14 9V3z",
  user: "circle:12,8,4|M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  send: "m22 2-7 20-4-9-9-4z|M22 2 11 13",
  sun: "circle:12,12,4|M12 2v2|M12 20v2|m4.93 4.93 1.41 1.41|m17.66 17.66 1.41 1.41|M2 12h2|M20 12h2|m6.34 17.66-1.41 1.41|m19.07 4.93-1.41 1.41",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
};

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName | string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
};

export default function Icon({
  name,
  size = 18,
  strokeWidth = 1.5,
  color = "currentColor",
  style,
}: Props) {
  const def = ICONS[name];
  if (!def) return null;
  const parts = def.split("|");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {parts.map((p, i) => {
        if (p.startsWith("circle:")) {
          const [cx, cy, r] = p.slice(7).split(",").map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        if (p.startsWith("rect:")) {
          const [x, y, w, h, rx] = p.slice(5).split(",").map(Number);
          return <rect key={i} x={x} y={y} width={w} height={h} rx={rx || 0} />;
        }
        return <path key={i} d={p} />;
      })}
    </svg>
  );
}
