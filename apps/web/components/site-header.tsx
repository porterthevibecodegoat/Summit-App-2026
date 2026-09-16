"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <><a className="challengeBar" href="https://www.inspiringchildren.org/notalone" target="_blank">Join the #NotAloneChallenge!</a><header className="siteHeader">
      <Link href="/" className="wordmark"><img src="/images/summit-logo.png" alt="Not Alone Summit" /></Link>
      <button className="menuButton" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-navigation">Menu</button>
      <nav id="main-navigation" className={open ? "mainNav open" : "mainNav"} aria-label="Main navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <Link href="/#directory">Directory</Link>
        <Link href="/schedule">Schedule</Link>
        <Link href="/map">Map</Link>
        <Link href="/ask-ai">Ask AI</Link>
        <Link href="/awards">Awards</Link>
        <div className="archiveMenu">
          <Link href="/2025">2025</Link>
          <div className="archiveDropdown"><Link href="/2025#speakers">Speakers</Link><Link href="/2025#awards">Awards</Link><Link href="/2025#partners">Partners</Link></div>
        </div>
        <Link href="/contact">Contact</Link>
        <Link href="/donate" className="navCta">Donate</Link>
      </nav>
    </header></>
  );
}
