import Link from "next/link";

export function YearTabs({ section, activeYear, dark = false }: { section: "summit" | "awards"; activeYear: 2025 | 2026; dark?: boolean }) {
  return (
    <nav className={`year-tabs${dark ? " year-tabs-dark" : ""}`} aria-label={`${section} year`}>
      <div className="year-tabs-label">
        <span>{section}</span>
        <strong>Choose an edition</strong>
      </div>
      <div className="year-tab-list">
        <Link className={activeYear === 2025 ? "active" : ""} href={`/${section}/2025`} aria-current={activeYear === 2025 ? "page" : undefined}>
          <strong>2025</strong><span>Archive</span>
        </Link>
        <Link className={activeYear === 2026 ? "active" : ""} href={`/${section}`} aria-current={activeYear === 2026 ? "page" : undefined}>
          <strong>2026</strong><span>Current</span>
        </Link>
      </div>
    </nav>
  );
}
