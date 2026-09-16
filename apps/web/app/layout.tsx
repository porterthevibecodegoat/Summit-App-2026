import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import "./styles.css";
import "./enhancements.css";
import "./restored-shell.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://not-alone-summit-web-rose.vercel.app"),
  applicationName: "Not Alone Summit",
  title: { default: "Not Alone Summit", template: "%s | Not Alone Summit" },
  description: "The Not Alone Summit and Awards, produced by Inspiring Children Foundation.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/challenge-logo.png", sizes: "2424x2699", type: "image/png" }], apple: "/challenge-logo.png" },
  appleWebApp: { capable: true, title: "Not Alone Summit", statusBarStyle: "black-translucent" }
};
export const viewport: Viewport = { themeColor: "#8177c9" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><SiteHeader />{children}<SiteFooter /></body></html>;
}
