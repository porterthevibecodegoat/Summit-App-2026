import Image from "next/image";
import Link from "next/link";
import { PeopleDirectory } from "../../../components/people-directory";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { YearTabs } from "../../../components/year-tabs";
import { awards, awards2025Directory } from "../../../lib/content";

export const metadata = { title: "2025 Awards Archive" };

export default function Awards2025Page() {
  return (
    <main className="awards-theme archive-theme">
      <section className="awards-hero image-hero">
        <SiteHeader tone="dark" />
        <div className="hero-shade awards-shade" />
        <div className="awards-hero-content">
          <Image className="awards-logo" src="/images/awards-logo.webp" alt="Not Alone Awards" width={560} height={500} priority />
          <h1>Not Alone Awards 2025</h1>
          <p>2025 archive | Wynn Las Vegas</p>
          <Link className="button button-gold" href="/awards">See the 2026 Awards</Link>
        </div>
      </section>

      <div className="year-tabs-shell section-shell"><YearTabs section="awards" activeYear={2025} dark /></div>

      <section className="awards-intro section-shell">
        <p className="eyebrow gold">Celebrating pioneers</p>
        <div className="manifesto-grid">
          <h2>For those who invest in humanity.</h2>
          <div>
            <p>The Awards were created to celebrate pioneers of human development and mental health: visionaries, healers, and innovators who broke barriers, challenged stigma, and illuminated a path toward connection.</p>
            <p>The show was powered by the Steven &amp; Alexandra Cohen Foundation, broadcast live on iHeartRadio, and hosted by Wynn Resorts.</p>
            <p>The gathering centered authenticity and meaningful human connection through a strict no-pitch and no-solicitation policy.</p>
          </div>
        </div>
      </section>

      <section className="ceremony-band">
        <div className="ceremony-inner section-shell">
          <div className="ceremony-image"><Image src="/images/loni-love.webp" alt="Loni Love, Not Alone Awards host" fill sizes="(max-width: 800px) 100vw, 42vw" /></div>
          <div className="ceremony-copy">
            <p className="eyebrow gold">Host</p>
            <h2>Loni Love</h2>
            <p>Comedian &amp; TV Host</p>
            <dl>
              <div><dt>Where</dt><dd>Wynn Las Vegas</dd></div>
              <div><dt>Access</dt><dd>Invitation only</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="why-band section-shell">
        <div className="section-heading"><p className="eyebrow gold">Why it matters</p><h2>Built for cultural reach and credible impact.</h2></div>
        <div className="why-grid">
          <article><h3>Cultural Relevance</h3><p>From artists and athletes to CEOs and community heroes.</p></article>
          <article><h3>Streaming Scale</h3><p>Designed for broadcast, red carpet, and viral impact.</p></article>
          <article><h3>Credibility</h3><p>Backed by Inspiring Children Foundation&apos;s 25+ years of experience.</p></article>
        </div>
      </section>

      <section className="award-categories section-shell">
        <div className="section-heading"><p className="eyebrow gold">2025 honors</p><h2>The complete award program.</h2></div>
        <div className="award-list">{awards.map(([name, description], index) => <article key={name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{name}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="archive-people section-shell">
        <div className="section-heading"><p className="eyebrow gold">2025 archive</p><h2>People of the Awards.</h2><p className="archive-note">Every founder, musician, entertainer, athlete, and expert listed on the original site is retained here.</p></div>
        <PeopleDirectory groups={awards2025Directory} tone="dark" />
      </section>
      <SiteFooter />
    </main>
  );
}
