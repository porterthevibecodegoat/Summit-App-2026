import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "Not Alone", template: "%s | Not Alone" },
  description: "The Not Alone Summit and Awards, produced by Inspiring Children Foundation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
