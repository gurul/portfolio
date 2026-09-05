import { JetBrains_Mono } from "next/font/google";
import CrosshairHelix from "../components/CrosshairHelix";
import CrosshairSun from "../components/CrosshairSun";
import DecodeIntro from "../components/DecodeIntro";
import StarfieldBackground from "../components/StarfieldBackground";
import GifAsciiPlayer from "../components/GifAsciiPlayer";
import IntroGate from "../components/IntroGate";
import RouteMode from "../components/RouteMode";
import SiteNav from "../components/SiteNav";
import { getMetadataBase, SITE_DESCRIPTION, SITE_NAME } from "../lib/site";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: getMetadataBase(),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1024,
        height: 576,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={jetBrainsMono.className}>
        <noscript>
          <style>{`.site-nav, .page-shell { opacity: 1 !important; }`}</style>
        </noscript>
        <RouteMode />
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
