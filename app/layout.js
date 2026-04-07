import { JetBrains_Mono } from "next/font/google";
import GifAsciiPlayer from "../components/GifAsciiPlayer";
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
        <RouteMode />
        <div className="crosshair" aria-hidden="true">
          <div className="crosshair__line crosshair__line--v" />
          <div className="crosshair__line crosshair__line--h" />
        </div>
        <SiteNav />
        {children}
        <GifAsciiPlayer />
      </body>
    </html>
  );
}
