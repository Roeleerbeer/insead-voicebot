import type { Metadata, Viewport } from "next";
import { Zilla_Slab, Geist_Mono } from "next/font/google";
import "./globals.css";

const zillaSlab = Zilla_Slab({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "INSEAD Voicebot — AI customer-service business case",
  description:
    "A realtime voice agent that walks you through the business case, tech stack, and risks of an AI-powered tier-one customer-service voicebot.",
  openGraph: {
    title: "INSEAD Voicebot",
    description:
      "Talk to the bot. It walks you through the business case for tier-one customer-service AI.",
    type: "website",
    siteName: "INSEAD Voicebot",
  },
  twitter: {
    card: "summary",
    title: "INSEAD Voicebot",
    description:
      "Talk to the bot. It walks you through the business case for tier-one customer-service AI.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

const themeBoot = `try{var t=localStorage.getItem('insead-voicebot-theme')||'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${zillaSlab.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
