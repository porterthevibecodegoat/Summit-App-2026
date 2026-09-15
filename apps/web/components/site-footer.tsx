import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Image src="/images/icf-logo.webp" alt="Inspiring Children Foundation" width={80} height={80} />
          <p>Healing, growth, and human connection through the Not Alone Program.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/summit">Summit</Link>
          <Link href="/awards">Awards</Link>
          <Link href="/summit/live">Event companion</Link>
          <a href="https://www.inspiringchildren.org/contact" rel="noreferrer">Contact</a>
        </nav>
        <div className="footer-action">
          <p>November 2-4, 2026</p>
          <strong>Wynn Las Vegas</strong>
          <a href="https://www.inspiringchildren.org/donate" rel="noreferrer">Support the mission</a>
        </div>
      </div>
      <div className="crisis-note">
        This website is not for emergency or crisis care. If you or someone you know is in crisis, call or text <a href="tel:988">988</a>. For an emergency, call 911.
      </div>
    </footer>
  );
}
