import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { getUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import SwRegister from "@/components/SwRegister";
import IdleTimer from "@/components/IdleTimer";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "University MIS",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} dark`}>
      <body className="min-h-screen bg-[#0b0f17] text-slate-100 antialiased">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col md:flex-row">
          {user && <Nav role={user.role} name={user.name} />}
          <main id="main" className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>
        {user && <IdleTimer />}
        <SwRegister />
      </body>
    </html>
  );
}
