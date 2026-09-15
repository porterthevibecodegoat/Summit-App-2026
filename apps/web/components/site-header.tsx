import Image from "next/image";
import Link from "next/link";

const links = [
  ["Summit", "/summit"],
  ["Awards", "/awards"],
  ["Live companion", "/summit/live"],
  ["Schedule", "/summit/schedule"]
] as const;

export function SiteHeader({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <header className={`site-header site-header-${tone}`}>
      <Link className="brand-lockup" href="/" aria-label="Not Alone home">
        <Image src="/images/icf-logo.webp" alt="" width={42} height={42} priority />
        <span>
          <strong>Not Alone</strong>
          <small>by Inspiring Children Foundation</small>
        </span>
      </Link>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        <a className="nav-action" href="https://www.inspiringchildren.org/donate" rel="noreferrer">Donate</a>
      </nav>

      <details className="mobile-nav">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <a href="https://www.inspiringchildren.org/donate" rel="noreferrer">Donate</a>
        </nav>
      </details>
    </header>
  );
}
