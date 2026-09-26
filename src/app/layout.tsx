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
    // data-scroll-behavior="smooth" tells the Next.js router that the smooth scrolling set
    // in globals.css is deliberate, so it stops warning that its own scroll restoration may
    // be affected by it. It is the attribute Next.js asks for, not a workaround.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${plexSans.variable} ${plexCondensed.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        {/*
          Skip link: visually hidden until focused, so a keyboard user can jump past the
          header instead of tabbing through the navigation on every page.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
