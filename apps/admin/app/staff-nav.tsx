import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";

type StaffNavProps = {
  active: "overview" | "schedule" | "content" | "ask-ai" | "changes" | "import" | "notifications" | "emergency" | "history" | "settings";
};

const groups = [
  {
    label: "Event operations",
    items: [
      { id: "overview", label: "Overview", href: "/" },
      { id: "schedule", label: "Schedule Editor", href: "/schedule" },
      { id: "content", label: "Content Studio", href: "/content" },
      { id: "changes", label: "Review & Publish", href: "/changes" },
      { id: "notifications", label: "Notifications", href: "/notifications" },
      { id: "emergency", label: "Emergency", href: "/emergency" }
    ]
  },
  {
    label: "Assist & prepare",
    items: [
      { id: "ask-ai", label: "State AI", href: "/ask-ai" },
      { id: "import", label: "Schedule Import", href: "/import" }
    ]
  },
  {
    label: "Administration",
    items: [
      { id: "history", label: "History", href: "/history" },
      { id: "settings", label: "Settings", href: "/settings" }
    ]
  }
] as const;

export function StaffNav({ active }: StaffNavProps) {
  return (
    <nav className="nav" aria-label="Staff portal">
      <div className="brand">{publicAppConfig.appName}</div>
      {groups.map((group) => (
        <div className="navGroup" key={group.label}>
          <div className="navGroupLabel">{group.label}</div>
          {group.items.map((item) => (
            <Link className={item.id === active ? "active" : undefined} href={item.href} key={item.id}>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
