"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const archive = pathname.includes("2025");
  const summit = archive ? "/2025" : "/";
  return (
    <><a className="challengeBar" href="https://www.inspiringchildren.org/notalone" target="_blank" rel="noreferrer">Join the #NotAloneChallenge!</a><header className={`siteHeader${pathname.startsWith("/awards") ? " awardsHeader" : ""}`}>
      <Link href="/" className="wordmark"><img src="/images/summit-logo.png" alt="Not Alone Summit" /></Link>
      <button className="menuButton" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-navigation">Menu</button>
      <nav id="main-navigation" className={open ? "mainNav open" : "mainNav"} aria-label="Main navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <Link href={`${summit}#about`}>About</Link>
        <Link href={`${summit}#directory`}>People</Link>
        <Link href="/schedule">Schedule</Link>
        <Link href="/map">Map</Link>
        <Link href="/ask-ai">Ask AI</Link>
        <Link href={`/awards/${archive ? 2025 : 2026}`}>Awards</Link>
        <Link href={`${summit}#partners`}>Partners</Link>
        <Link href={`${summit}#venue`}>Venue</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/donate" className="navCta">Donate</Link>
      </nav>
    </header></>
  );
}
