import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

/*
  ROOT LAYOUT: wraps every page of the app.
  Anything placed here (fonts, header, footer) appears on every screen automatically.
*/

// next/font downloads the fonts at build time and serves them from our own site:
// faster loading, no layout jump, and no request to Google from the visitor's browser.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Credify: SME credit decisioning",
    template: "%s | Credify",
  },
  description:
    "A demonstration SME credit decisioning platform: loan applications, credit ratios and a transparent, illustrative scorecard for bank analysts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexCondensed.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
