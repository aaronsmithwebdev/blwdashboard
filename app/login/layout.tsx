import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import "../globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Sign in | BLW Analytics",
  description: "Access to BLW Analytics dashboard."
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${display.className} ${sans.variable} ${sans.className}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
