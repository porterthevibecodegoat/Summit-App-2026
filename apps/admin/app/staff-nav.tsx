import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";

type StaffNavProps = {
  active: "overview" | "schedule" | "ask-ai" | "changes" | "import" | "notifications" | "emergency" | "history" | "settings";
};

const items = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "schedule", label: "Schedule", href: "/schedule" },
  { id: "ask-ai", label: "Ask AI", href: "/ask-ai" },
  { id: "changes", label: "Make Changes", href: "/changes" },
  { id: "import", label: "Import", href: "/import" },
  { id: "notifications", label: "Notifications", href: "/notifications" },
  { id: "emergency", label: "Emergency", href: "/emergency" },
  { id: "history", label: "History", href: "/history" },
  { id: "settings", label: "Settings", href: "/settings" }
] as const;

export function StaffNav({ active }: StaffNavProps) {
  return (
    <nav className="nav" aria-label="Staff portal">
      <div className="brand">{publicAppConfig.appName}</div>
      {items.map((item) => (
        <Link className={item.id === active ? "active" : undefined} href={item.href} key={item.id}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
