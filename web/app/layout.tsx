import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INSEAD Voicebot Demo",
  description: "Meta voicebot demo for INSEAD course",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
