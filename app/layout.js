import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Gurucharan Lingamallu",
  description: "Personal website for Gurucharan Lingamallu.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={jetBrainsMono.className}>
        <div className="crosshair" aria-hidden="true">
          <div className="crosshair__line crosshair__line--v" />
          <div className="crosshair__line crosshair__line--h" />
        </div>
        {children}
      </body>
    </html>
  );
}
