import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AskAiBubble } from "../components/ask-ai-bubble";
import { SiteHeader } from "../components/site-header";
import "./styles.css";
import "./enhancements.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://notalonesummit.org"),
  applicationName: "notalonesummit.org",
  title: { default: "notalonesummit.org", template: "%s | notalonesummit.org" },
  description: "The Not Alone Summit attendee website and connection directory.",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/icf-mark-transparent.png", sizes: "1254x1254", type: "image/png" }], apple: "/icf-mark-transparent.png" },
  appleWebApp: { capable: true, title: "notalonesummit.org", statusBarStyle: "black-translucent" }
};
export const viewport: Viewport = { themeColor: "#8177c9" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><SiteHeader />{children}<footer><div className="footerBrand"><img src="/icf-logo.png" alt="Inspiring Children Foundation" /><div><strong>Powered by ICF</strong><p>Inspiring Children Foundation</p></div></div><p>Not Alone Summit · November 2–4, 2026 · Wynn Las Vegas</p><div><a href="https://www.inspiringchildren.org" target="_blank">Inspiring Children Foundation</a><a href="/contact">Contact</a><a href="/donate">Donate</a></div><small>This site is not for emergency or crisis help. Call 988 or 911 for immediate assistance.</small></footer><AskAiBubble /></body></html>;
}
