import { JetBrains_Mono } from "next/font/google";
import GifAsciiPlayer from "../components/GifAsciiPlayer";
import RouteMode from "../components/RouteMode";
import SiteNav from "../components/SiteNav";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://portfolio-guruls-projects.vercel.app"),
  title: "Gurucharan Lingamallu",
  description: "Personal website for Gurucharan Lingamallu.",
  openGraph: {
    title: "Gurucharan Lingamallu",
    description: "Personal website for Gurucharan Lingamallu.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gurucharan Lingamallu",
    description: "Personal website for Gurucharan Lingamallu.",
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
