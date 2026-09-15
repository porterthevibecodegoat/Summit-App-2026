import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export default function HomePage() {
  return (
    <main>
      <section className="home-hero image-hero">
        <SiteHeader tone="dark" />
        <div className="hero-shade" />
        <div className="hero-content home-hero-content">
          <p className="eyebrow">Inspiring Children Foundation presents</p>
          <h1>Not Alone</h1>
          <p className="hero-copy">A living platform for human connection, emotional wellbeing, and the people moving mental health forward.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/summit">Enter the Summit</Link>
            <Link className="button button-ghost" href="/awards">Explore the Awards</Link>
          </div>
        </div>
        <div className="hero-event-line">
          <span>November 2-4, 2026</span>
          <span>Wynn Las Vegas</span>
        </div>
      </section>

      <section className="choice-band section-shell">
        <div className="section-heading">
          <p className="eyebrow purple">One mission, two experiences</p>
          <h2>Gather. Honor. Move forward.</h2>
        </div>
        <div className="experience-grid">
          <Link className="experience-panel summit-panel" href="/summit">
            <span>01</span>
            <div>
              <p>November 2-4</p>
              <h3>Not Alone Summit</h3>
              <p>Ideas, practice, music, science, and honest connection.</p>
            </div>
          </Link>
          <Link className="experience-panel awards-panel" href="/awards">
            <span>02</span>
            <div>
              <p>November 2</p>
              <h3>Not Alone Awards</h3>
              <p>Honoring the pioneers who invest in humanity.</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mission-band">
        <div className="mission-image">
          <Image src="/images/wynn-las-vegas.webp" alt="Wynn Las Vegas, host venue for the Not Alone Summit" fill sizes="(max-width: 800px) 100vw, 50vw" />
        </div>
        <div className="mission-copy">
          <p className="eyebrow purple">Built from lived experience</p>
          <h2>Human development belongs at the center.</h2>
          <p>The Not Alone Program brings together the Challenge, Summit, and Awards to turn compassionate conversation into practical tools and collective action.</p>
          <a href="https://www.inspiringchildren.org/home" rel="noreferrer">Meet Inspiring Children Foundation</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
