import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "BLW Analytics",
  description: "Internal analytics for Funraisin event performance."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${display.className} ${sans.variable} ${sans.className}`}
    >
      <body className="min-h-screen">
        <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
          <Sidebar />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 px-6 py-8">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
