import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

import { AmbientAudio } from "@/components/immersive/AmbientAudio";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { Toaster } from "@/components/ui/Toast";
import { img } from "@/data/images";
import { SITE } from "@/lib/constants";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Placeholder until a real domain exists; makes OG image URLs absolute.
  metadataBase: new URL("https://neyheritage.example.com"),
  title: {
    default: "Ney Heritage — Digitizing the Sacred Heritage of Sikkim",
    template: "%s · Ney Heritage",
  },
  description: SITE.description,
  openGraph: {
    siteName: SITE.name,
    title: "Ney Heritage — Digitizing the Sacred Heritage of Sikkim",
    description: SITE.description,
    type: "website",
    images: [
      {
        url: img("hero/buddha-park"),
        width: 1920,
        height: 2888,
        alt: "The Buddha of Buddha Park, Ravangla, against the Sikkim hills",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#221c15",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${plexMono.variable}`}
    >
      <body>
        <Navbar />
        {children}
        {/* Global, muted-by-default ambience toggle. */}
        <AmbientAudio />
        <CommandPalette />
        <Toaster />
      </body>
    </html>
  );
}
