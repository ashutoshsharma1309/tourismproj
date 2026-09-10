import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

import { SITE, SITE_URL } from "@/lib/constants";

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
  /* SITE_URL is already parsed and validated — see resolveSiteUrl in
     constants.ts. It cannot be blank, so this cannot throw. */
  metadataBase: new URL(SITE_URL),
  title: {
    /* Two products share this document while v1 is being replaced. The root
       template names neither, so a Darshan page is not titled "· TerraStory"
       and a v1 page is not titled "· Darshan". Each surface sets its own. */
    default: "Darshan — India's tourism operating system",
    template: "%s",
  },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE.name,
    title: `${SITE.archive.name} — ${SITE.archive.tagline}`,
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
    /*
     * No default image. This was a photograph of Rumtek Monastery with alt
     * text naming Sikkim, inherited by every page that set no card of its
     * own — the product sharing as one destination. The (v1) group derives
     * a non-Sikkim card for its pages; a page with no card of its own now
     * shares with its title rather than with someone else's monastery.
     */
  },
};

export const viewport: Viewport = {
  themeColor: "#221c15",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${plexMono.variable}`}
    >
      <body>
        {/* The root owns the document. Each surface owns its own chrome:
            (v1) the archive, (explore) Darshan, (partner) the vendor SaaS,
            (console) the tourism department. */}
        {children}
      </body>
    </html>
  );
}
