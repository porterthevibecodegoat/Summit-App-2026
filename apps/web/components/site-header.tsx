"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <><a className="challengeBar" href="https://www.inspiringchildren.org/notalone" target="_blank">Join the #NotAloneChallenge!</a><header className="siteHeader">
      <Link href="/" className="wordmark"><img src="https://static1.squarespace.com/static/628691b65c3a24383d0eac0a/t/6837c3d311d156080f9dcca9/1748485075411/Summit+heart+hands+wht+gradient+text.png" alt="Not Alone Summit" /></Link>
      <button className="menuButton" onClick={() => setOpen(!open)} aria-expanded={open}>Menu</button>
      <nav className={open ? "mainNav open" : "mainNav"} aria-label="Main navigation">
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
