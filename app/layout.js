import { JetBrains_Mono } from "next/font/google";
import CrosshairHelix from "../components/CrosshairHelix";
import CrosshairSun from "../components/CrosshairSun";
import DecodeIntro from "../components/DecodeIntro";
import FitViewport from "../components/FitViewport";
import StarfieldBackground from "../components/StarfieldBackground";
import GifAsciiPlayer from "../components/GifAsciiPlayer";
import IntroGate from "../components/IntroGate";
import RouteMode from "../components/RouteMode";
import SiteNav from "../components/SiteNav";
import { PERSON, PROFILES } from "../lib/content";
import { getMetadataBase, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "../lib/site";
import "./globals.css";

// Italic is used on first view (the swipe hint, the contribution count, the
// narratives line), so load the real face rather than a synthesized slant.
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata = {
  metadataBase: getMetadataBase(),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  authors: [{ name: PERSON.name, url: `${getSiteUrl()}/about` }],
  creator: PERSON.name,
  // Bing Webmaster Tools ownership check; set the token in Vercel's env.
  ...(process.env.BING_SITE_VERIFICATION
    ? { verification: { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } }
    : {}),
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1024,
        height: 576,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/twitter-image.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={jetBrainsMono.className}>
        {/* React hoists these into <head>: each profile is the same person. */}
        {PROFILES.map((profile) => (
          <link key={profile.key} rel="me" href={profile.href} />
        ))}
        <noscript>
          <style>{`.site-nav, .page-shell { opacity: 1 !important; }`}</style>
        </noscript>
        <RouteMode />
        <FitViewport />
        <IntroGate />
        <StarfieldBackground />
        <div className="crosshair" aria-hidden="true">
          {/* Both rails are DNA double helices drawn by the CSS meteors; the
              sun ignites as CSS, then hands over to the radiance-cascades
              field once it has compiled. */}
          <CrosshairHelix orientation="vertical" />
          <CrosshairHelix orientation="horizontal" />
          <CrosshairSun />
        </div>
        <SiteNav />
        {/* The nav persists across navigations, so it decodes once per load. */}
        <DecodeIntro selector=".site-nav" once="site-nav" />
        {children}
        <GifAsciiPlayer />
        <div className="rotate-gate">
          <p className="rotate-gate__message">
            <span className="rotate-gate__glyph" aria-hidden="true">
              ⟳
            </span>
            please flip your phone back to portrait — this site is built
            upright.
          </p>
        </div>
      </body>
    </html>
  );
}
