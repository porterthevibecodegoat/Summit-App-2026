import type { ReactNode } from "react";
import { StaffAuthBridge } from "./staff-auth-bridge";
import "./styles.css";

export const metadata = {
  title: "Not Alone Summit Staff Portal",
  description: "Staff Event Control Portal for Not Alone Summit"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StaffAuthBridge>{children}</StaffAuthBridge>
      </body>
    </html>
  );
}
