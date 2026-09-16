import Link from "next/link";
import source from "../lib/original-sites.json";
import styles from "./site-shell.module.css";

export function SiteFooter() {
  return <footer className={styles.footer}>
    <img src="/images/icf-logo.webp" alt="Inspiring Children Foundation" width={100} height={100} />
    <h2><a href="https://www.inspiringchildren.org/partner-with-us">Partner with us.</a></h2>
    <p>{source.summit.footer[1]}</p><p>{source.summit.footer[2]} <a href="https://www.inspiringchildren.org/home">About ICF</a></p>
    <nav aria-label="Footer navigation"><Link href="/">Summit 2026</Link><Link href="/2025">Summit 2025</Link><Link href="/awards/2026">Awards 2026</Link><Link href="/awards/2025">Awards 2025</Link><Link href="/schedule">Event schedule</Link><Link href="/contact">Contact Inspiring Children Foundation</Link></nav>
    <p>{source.summit.footer[4]} <a href="tel:988">Call 988</a> · <a href="https://www.inspiringchildren.org/disclaimer">Full disclaimer</a></p><p>{source.summit.footer[5]}</p>
    <nav aria-label="Social media"><a href="https://www.facebook.com/InspiringChildrenFoundation">Facebook</a><a href="https://www.instagram.com/notalonechallenge">Instagram</a><a href="https://twitter.com/inspiringchldrn">Twitter</a><a href="https://www.youtube.com/@InspiringChildrenFoundation">YouTube</a><a href="https://www.linkedin.com/company/notalonechallenge/">LinkedIn</a></nav>
  </footer>;
}
