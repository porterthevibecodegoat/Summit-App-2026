import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  icons: { icon: [{ url: "/not-alone-awards-logo.png", sizes: "736x634", type: "image/png" }], apple: "/not-alone-awards-logo.png" }
};

export default function AwardsLayout({ children }: { children: ReactNode }) {
  return children;
}
