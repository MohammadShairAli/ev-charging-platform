import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import { Footer } from "@/src/components/layout/Footer";
import { Navbar } from "@/src/components/layout/Navbar";
import { appConfig } from "@/src/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appConfig.name,
  description: "Find EV charging stations across Pakistan and navigate with Google Maps.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeStyle = {
    "--primary": appConfig.theme.primary,
    "--secondary": appConfig.theme.secondary,
  } as CSSProperties;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} style={themeStyle}>
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
