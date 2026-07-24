import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import { AppChrome } from "@/src/components/layout/AppChrome";
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
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: appConfig.theme.colour,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeStyle = {
    "--theme-colour": appConfig.theme.colour,
  } as CSSProperties;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} style={themeStyle}>
      <body className="flex min-h-screen flex-col overflow-x-hidden pb-24 sm:pb-0">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
