import Link from "next/link";
import { PeopleDirectory } from "../../components/people-directory";
import {
  summit2025Directory,
  summit2025Leadership,
  summitPartners
} from "../../lib/content";

export default function ArchivePage() {
  const partners = summitPartners[2025];

  return (
    <main className="archivePage">
      <header className="archiveHero">
        <p className="eyebrow">Past summit archive</p>
        <h1>Not Alone Summit 2025</h1>
        <p>
          The people, partners, and awards from the 2025 gathering are preserved here as
          historical information. Nothing in this archive implies participation in 2026.
        </p>
        <nav className="archiveLinks" aria-label="2025 archive sections">
          <a href="#leadership">Leadership</a>
          <a href="#directory">People</a>
          <a href="#partners">Partners</a>
          <Link href="/awards/2025">Awards</Link>
        </nav>
      </header>

      <section className="archiveSection" id="leadership">
        <div className="archiveSectionHeading">
          <p className="eyebrow">2025 gathering</p>
          <h2>Leadership and hosts</h2>
        </div>
        <PeopleDirectory groups={summit2025Leadership} />
      </section>

      <section className="archiveSection archiveSectionTint" id="directory">
        <div className="archiveSectionHeading">
          <p className="eyebrow">Historical directory</p>
          <h2>Summit community</h2>
          <p>Roles and affiliations are shown as they were recorded for the 2025 event.</p>
        </div>
        <PeopleDirectory groups={summit2025Directory} />
      </section>

      <section className="archiveSection archivePartners" id="partners">
        <div className="archiveSectionHeading">
          <p className="eyebrow">2025 partners</p>
          <h2>Organizations behind the gathering</h2>
        </div>
        <div className="archivePartnerGrid">
          <article>
            <span>Presented by</span>
            {partners.presentedBy.map((partner) => <h3 key={partner}>{partner}</h3>)}
          </article>
          <article>
            <span>Powered by</span>
            {partners.poweredBy.map((partner) => <h3 key={partner}>{partner}</h3>)}
          </article>
        </div>
        <Link className="primaryButton" href="/awards/2025">Explore the 2025 Awards</Link>
      </section>
    </main>
  );
}
