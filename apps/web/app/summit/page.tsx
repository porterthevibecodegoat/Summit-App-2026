import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { YearTabs } from "../../components/year-tabs";
import { confirmed2026People, summitHighlights, summitPartners } from "../../lib/content";
import { PeopleDirectory } from "../../components/people-directory";
import { ProgramIndex } from "../../components/program-index";

export const metadata = {
  title: "Not Alone Summit",
  description: "A national convening advancing emotional and mental health, November 2-4, 2026 at Wynn Las Vegas."
};

export default function SummitPage() {
  return (
    <main className="summit-theme">
      <section className="summit-hero image-hero">
        <SiteHeader tone="dark" />
        <div className="hero-shade purple-shade" />
        <div className="hero-content summit-hero-content">
          <p className="eyebrow">November 2-4, 2026 | Wynn Las Vegas</p>
          <h1>Not Alone Summit</h1>
          <p className="hero-copy">The premier national convening for people moving emotional and mental health forward.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/summit/live">Open event companion</Link>
            <Link className="button button-ghost" href="/summit/schedule">View schedule</Link>
          </div>
        </div>
        <div className="hero-event-line">
          <span>Powered by {summitPartners[2026].poweredBy.join(" and ")}</span>
          <span>2026 participants shown only when confirmed</span>
        </div>
      </section>

      <div className="year-tabs-shell section-shell"><YearTabs section="summit" activeYear={2026} /></div>

      <section className="manifesto section-shell">
        <p className="eyebrow purple">The Davos of Human Development</p>
        <div className="manifesto-grid">
          <h2>Science meets soul. Conversation becomes action.</h2>
          <div>
            <p>The Summit brings together leading CEOs, artists, athletes, philanthropists, clinicians, researchers, and youth ambassadors to advance emotional and mental health.</p>
            <p>Through dialogue, collaboration, storytelling, music, and shared practice, we are building a more compassionate and connected system of care.</p>
          </div>
        </div>
      </section>

      <section className="program-band">
        <div className="section-shell">
          <div className="section-heading horizontal-heading">
            <div>
              <p className="eyebrow soft">Inside the Summit</p>
              <h2>Designed for the whole human.</h2>
            </div>
            <p>Three days of programming that make room for evidence, lived experience, restoration, creativity, and meaningful connection.</p>
          </div>
          <ProgramIndex items={summitHighlights} />
        </div>
      </section>

      <section className="people-band people-band-pending section-shell" id="people">
        <div className="section-heading horizontal-heading">
          <div>
            <p className="eyebrow purple">2026 participants</p>
            <h2>Announcements are coming.</h2>
          </div>
          <p>Names are published only after the Summit team confirms participation for this edition.</p>
        </div>
        {confirmed2026People.length > 0 ? <PeopleDirectory groups={confirmed2026People} /> : (
          <div className="confirmation-state">
            <strong>The 2026 roster is in progress.</strong>
            <p>Explore the 2025 archive in the meantime. Previous participation is never presented as a current confirmation.</p>
          </div>
        )}
      </section>

      <section className="venue-band">
        <div className="venue-image">
          <Image src="/images/wynn-las-vegas.webp" alt="Wynn Las Vegas" fill sizes="100vw" />
        </div>
        <div className="venue-copy">
          <p className="eyebrow">The destination</p>
          <h2>Wynn Las Vegas</h2>
          <p>November 2-4, 2026<br />Las Vegas, Nevada</p>
          <Link href="/summit/live">Enter the event companion</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
