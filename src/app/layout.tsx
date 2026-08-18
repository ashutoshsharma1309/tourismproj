import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

import { AmbientAudio } from "@/components/immersive/AmbientAudio";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { Toaster } from "@/components/ui/Toast";
import { img } from "@/data/images";
import { SITE, SITE_URL } from "@/lib/constants";
import { buildSearchIndex } from "@/lib/search-index";

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
  /* Set NEXT_PUBLIC_SITE_URL in the deployment environment. See SITE_URL. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ney Heritage — Digitizing the Sacred Heritage of Sikkim",
    template: "%s · Ney Heritage",
  },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE.name,
    title: "Ney Heritage — Digitizing the Sacred Heritage of Sikkim",
    description: SITE.description,
    type: "website",
    /*
     * The card previously used hero/buddha-park and declared it 1920×2888. The
     * file is 1362×2048 — so the declared size was wrong, and the image is
     * portrait, which every platform crops to a landscape band across the
     * statue's midriff.
     *
     * mon/rumtek is 1920×1280: landscape, close to the 1.91:1 platforms crop
     * to, and it shows the subject the archive is actually about. Its credit
     * (Bernard Gagnon, CC BY-SA 4.0) is rendered wherever the photograph
     * appears on the site itself.
     */
    images: [
      {
        url: img("mon/rumtek"),
        width: 1920,
        height: 1280,
        alt: "The main temple at Rumtek Monastery, Gangtok district, Sikkim",
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
        {/*
          Every page puts eight navigation links, a search button and a role
          switcher in front of its content. Without a skip link a keyboard or
          screen-reader visitor tabs through all of it on every single page.
          The header is `fixed`, so the target also needs scroll-margin — that
          is set on [id="main"] in globals.css.
        */}
        <a
          href="#main"
          className="sr-only rounded-lg bg-surface px-4 py-2 text-small font-medium text-foreground shadow-overlay focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-200"
        >
          Skip to content
        </a>
        <Navbar />
        {children}
        {/* Global, muted-by-default ambience toggle. */}
        <AmbientAudio />
        <CommandPalette items={buildSearchIndex()} />
        <Toaster />
      </body>
    </html>
  );
}
