import Link from "next/link";
import { PeopleDirectory } from "../../../components/people-directory";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { YearTabs } from "../../../components/year-tabs";
import { ProgramIndex } from "../../../components/program-index";
import { summit2025Directory, summit2025Highlights, summit2025Leadership, summitPartners } from "../../../lib/content";

export const metadata = { title: "2025 Summit Archive" };

export default function Summit2025Page() {
  return (
    <main className="summit-theme archive-theme">
      <section className="summit-hero image-hero">
        <SiteHeader tone="dark" />
        <div className="hero-shade purple-shade" />
        <div className="hero-content summit-hero-content">
          <p className="eyebrow">2025 Archive | Wynn Las Vegas</p>
          <h1>Not Alone Summit</h1>
          <p className="hero-copy">The people and program presented on the original 2025 Summit website, preserved as an event archive.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/summit">See the 2026 Summit</Link></div>
        </div>
        <div className="hero-event-line"><span>Presented by {summitPartners[2025].presentedBy.join(" and ")}</span><span>Powered by {summitPartners[2025].poweredBy.join(" and ")}</span></div>
      </section>

      <div className="year-tabs-shell section-shell"><YearTabs section="summit" activeYear={2025} /></div>

      <section className="manifesto section-shell">
        <p className="eyebrow purple">The Davos of Human Development</p>
        <div className="manifesto-grid">
          <h2>A gathering for healing, growth, and collective action.</h2>
          <div>
            <p>The Not Alone Summit brought together CEOs, artists, athletes, philanthropists, clinicians, researchers, and youth ambassadors to advance emotional and mental health.</p>
            <p>Dialogue, collaboration, storytelling, music, and a first-of-its-kind awards show united science, lived experience, and innovation.</p>
            <p>The Not Alone Program includes the Challenge, Summit, and Awards Show and is produced by Inspiring Children Foundation, a 501(c)(3) nonprofit with more than 25 years of work supporting at-risk youth.</p>
            <p>Its ten pillars of healing, growth, and high-performance living help young people explore sports, academics, entrepreneurship, music, art, and project-based learning while strengthening physical, social, emotional, and mental health.</p>
          </div>
        </div>
      </section>

      <section className="archive-people section-shell archive-leadership">
        <div className="section-heading"><p className="eyebrow purple">Leadership and hosts</p><h2>The people who led the gathering.</h2></div>
        <PeopleDirectory groups={summit2025Leadership} />
      </section>

      <section className="program-band"><div className="section-shell">
        <div className="section-heading"><p className="eyebrow soft">Inside the 2025 Summit</p><h2>The complete program mix.</h2></div>
        <ProgramIndex items={summit2025Highlights} />
      </div></section>

      <section className="archive-people section-shell">
        <div className="section-heading"><p className="eyebrow purple">2025 archive</p><h2>People of the Summit.</h2><p className="archive-note">Every name and role listed on the original site is retained here.</p></div>
        <PeopleDirectory groups={summit2025Directory} />
      </section>
      <SiteFooter />
    </main>
  );
}
