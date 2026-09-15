import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { YearTabs } from "../../components/year-tabs";
import { awards, confirmed2026People } from "../../lib/content";
import { PeopleDirectory } from "../../components/people-directory";

export const metadata = {
  title: "Not Alone Awards",
  description: "Celebrating pioneers in human development and mental health, November 2, 2026 at Wynn Las Vegas."
};

export default function AwardsPage() {
  return (
    <main className="awards-theme">
      <section className="awards-hero awards-hero-current image-hero">
        <SiteHeader tone="dark" />
        <div className="hero-shade awards-shade" />
        <div className="awards-hero-content">
          <Image className="awards-logo" src="/images/awards-logo.webp" alt="Not Alone Awards" width={560} height={500} priority />
          <h1>Not Alone Awards</h1>
          <p>Invitation only | November 2, 2026 | Wynn Las Vegas</p>
          <a className="button button-gold" href="https://www.inspiringchildren.org/awards" rel="noreferrer">Request attendance</a>
        </div>
      </section>

      <div className="year-tabs-shell section-shell"><YearTabs section="awards" activeYear={2026} dark /></div>

      <section className="awards-intro section-shell">
        <p className="eyebrow gold">Celebrating pioneers</p>
        <div className="manifesto-grid">
          <h2>For those who invest in humanity.</h2>
          <div>
            <p>The Not Alone Awards celebrate visionaries, healers, and innovators who have broken barriers, challenged stigma, and illuminated a path toward healing, growth, and connection.</p>
            <p>Across research, clinical innovation, technology, advocacy, philanthropy, and art, these honorees remind us that pain can become purpose and isolation can become connection.</p>
          </div>
        </div>
      </section>

      <section className="ceremony-band">
        <div className="ceremony-inner section-shell">
          <div className="ceremony-image ceremony-venue">
            <Image src="/images/wynn-las-vegas.webp" alt="Wynn Las Vegas, host venue for the Not Alone Awards" fill sizes="(max-width: 800px) 100vw, 42vw" />
          </div>
          <div className="ceremony-copy">
            <p className="eyebrow gold">2026 ceremony</p>
            <h2>A night grounded in recognition, not transaction.</h2>
            <p>The ceremony is built around authenticity, presence, and meaningful human connection, with a strict no-pitch and no-solicitation policy.</p>
            <dl>
              <div><dt>When</dt><dd>Monday, November 2</dd></div>
              <div><dt>Where</dt><dd>Wynn Las Vegas</dd></div>
              <div><dt>Access</dt><dd>Invitation only</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="confirmed-band section-shell">
        <div className="section-heading horizontal-heading">
          <div><p className="eyebrow gold">2026 participants</p><h2>Announcements are coming.</h2></div>
          <p>Names are published only after the Awards team confirms participation for this edition.</p>
        </div>
        {confirmed2026People.length > 0 ? <PeopleDirectory groups={confirmed2026People} tone="dark" /> : (
          <div className="confirmation-state confirmation-state-dark">
            <strong>The 2026 roster is in progress.</strong>
            <p>Explore the 2025 archive in the meantime. Previous participation is never presented as a current confirmation.</p>
          </div>
        )}
      </section>

      <section className="award-categories section-shell">
        <div className="section-heading horizontal-heading">
          <div>
            <p className="eyebrow gold">The honors</p>
            <h2>Impact in every form.</h2>
          </div>
          <p>Recognition across culture, science, care, innovation, advocacy, and lived experience.</p>
        </div>
        <div className="award-list">
          {awards.map(([name, description], index) => (
            <article key={name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="awards-close">
        <div>
          <p className="eyebrow gold">Part of something larger</p>
          <h2>The Awards begin the Summit.</h2>
          <p>Continue into three days of conversation, practice, and collaboration at the Not Alone Summit.</p>
          <Link className="button button-gold" href="/summit">Explore the Summit</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
