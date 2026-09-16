import Link from "next/link";
import type { EventSnapshot } from "@not-alone/validation";
import source from "../lib/original-sites.json";
import { summit2025Leadership, summit2025Directory, summit2025Highlights } from "../lib/content";
import { directoryPeople } from "../lib/people";
import { originalAsset } from "../lib/original-assets";
import { Directory } from "./directory";
import styles from "./original-event-page.module.css";

type SourceSection = (typeof source.summit.sections)[number];
function localSections(sections: SourceSection[]): SourceSection[] {
  return sections.map(section => ({ ...section,
    images: section.images.map(image => ({ ...image, src: originalAsset(image.src) })),
    people: section.people.map(person => ({ ...person, image: originalAsset(person.image) }))
  }));
}
const summit = localSections(source.summit.sections);
const awards = localSections(source.awards.sections);

export function YearNavigation({ year, kind }: { year: 2025 | 2026; kind: "summit" | "awards" }) {
  return <nav className={styles.years} aria-label={`${kind === "summit" ? "Summit" : "Awards"} year`}>
    {([2025, 2026] as const).map(value => <Link key={value} aria-current={year === value ? "page" : undefined} href={kind === "awards" ? `/awards/${value}` : value === 2025 ? "/2025" : "/"}>{value}</Link>)}
    <Link href={kind === "summit" ? `/awards/${year}` : year === 2025 ? "/2025" : "/"}>{kind === "summit" ? "Awards" : "Summit"}</Link>
    {year === 2026 && <Link href="/schedule">Event schedule</Link>}
  </nav>;
}

function Copy({ section }: { section: SourceSection }) {
  return <>{section.blocks.map((block, index) => block.tag.startsWith("h")
    ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>)}</>;
}

function Portraits({ section }: { section: SourceSection }) {
  return <section className={styles.band}><h2>{section.title}</h2>
    <div className={styles.portraits}>{section.people.map(person => {
      const card = <><img src={person.image} alt={person.name} loading="lazy" width={500} height={500} /><div><h3>{person.name}</h3><p>{person.role}</p></div></>;
      const hasProfile = ![source.summit.source, source.awards.source].includes(person.href.split("#")[0]!);
      return hasProfile ? <a href={person.href} key={person.name} aria-label={`${person.name}, ${person.role}`}>{card}</a> : <article key={person.name}>{card}</article>;
    })}</div>
  </section>;
}

function Leadership({ producers = false }: { producers?: boolean }) {
  const groups = producers ? summit2025Directory.filter(group => /Producers/.test(group.title)) : summit2025Leadership;
  const images = summit[producers ? 13 : 4]!.images;
  let position = 0;
  return <section className={`${styles.band} ${styles.leadership}`} id={producers ? "producers" : "leadership"}>
    {groups.map(group => <div key={group.title}><h2>{group.title}</h2><div className={styles.leaders}>
      {group.people.map(person => <article key={person.name}><img src={images[position++]!.src} alt={person.name} loading="lazy" width={500} height={500} /><h3>{person.name}</h3><p>{person.role}</p></article>)}
    </div></div>)}
  </section>;
}

export function OriginalSummitPage({ year, snapshot = null }: { year: 2025 | 2026; snapshot?: EventSnapshot | null }) {
  const archive = year === 2025;
  return <main className={styles.page}>
    <YearNavigation kind="summit" year={year} />
    <section className={styles.summitHero}><img src={summit[0]!.images[0]!.src} alt="Not Alone Summit. The World's Premier Mental Health Summit." fetchPriority="high" /><h1 className={styles.hidden}>Not Alone Summit {year}</h1></section>
    <div className={styles.yearNotice}>{archive ? "2025 archive · Historical participants and partners" : "November 2–4, 2026 · Wynn Las Vegas"}</div>
    <section className={`${styles.band} ${styles.intro}`} id="about">
      {archive ? <Copy section={summit[1]!} /> : <><h2>“The Davos of Human Development” - Jewel</h2><p>The Not Alone Summit, powered by the Steven &amp; Alexandra Cohen Foundation and hosted at Wynn Las Vegas, brings together leading CEOs, artists, athletes, philanthropists, clinicians, researchers, and youth ambassadors to advance emotional and mental health.</p><p>{summit[1]!.blocks[2]!.text}</p></>}
      <img className={styles.partnerLogo} src={summit[1]!.images[0]!.src} alt="Steven & Alexandra Cohen Foundation" loading="lazy" />
    </section>
    <section className={`${styles.band} ${styles.foundation}`} id="foundation"><img src={summit[2]!.images[0]!.src} alt="Inspiring Children Foundation" loading="lazy" /><div><Copy section={summit[2]!} /></div></section>
    <section className={`${styles.band} ${styles.partner}`} id="partners"><h2>{archive ? "Sponsored By" : "At Wynn Las Vegas"}</h2><img src={summit[3]!.images[0]!.src} alt="Wynn Resorts" loading="lazy" />{archive && <p>Presented by Villa Bibbiani · Powered by the Steven &amp; Alexandra Cohen Foundation</p>}</section>
    {archive && <Leadership />}
    {archive && <section className={`${styles.band} ${styles.features}`}><img src={summit[5]!.images[0]!.src} alt="Jewel speaking at the summit" loading="lazy" /><div><h2>Featuring</h2><ul>{summit2025Highlights.map(item => <li key={item}>{item}</li>)}</ul></div></section>}
    <section className={`${styles.band} ${styles.venue}`} id="venue"><img src={summit[6]!.images[0]!.src} alt="Wynn Las Vegas" loading="lazy" /><h2>Located at Wynn Las Vegas</h2>{!archive && <p>November 2–4, 2026</p>}<p>Exclusive convening of the nation’s top mental health advocates, including:</p><ul>{["Experts", "Celebrities", "Athletes", "Business Leaders", "#NotAlone Supporters", "Philanthropists"].map(label => <li key={label}>{label}</li>)}</ul></section>
    <div id={archive ? "directory" : undefined}>{archive ? summit.slice(7, 13).map(section => <Portraits key={section.id} section={section} />) : <Directory people2026={directoryPeople(snapshot)} available={snapshot !== null} />}</div>
    {archive && <Leadership producers />}
    <section className={`${styles.band} ${styles.closing}`} id="rsvp"><img src={summit[14]!.images[1]!.src} alt="" loading="lazy" /><h2>Thank you for your interest!</h2><p>{archive ? "Explore the 2025 Not Alone Awards and the people behind the gathering." : "Please contact us to inquire about attendance."}</p><Link href={archive ? "/awards/2025" : "/contact"} className={styles.action}>{archive ? "2025 Not Alone Awards" : "Contact Us"}</Link></section>
  </main>;
}

export function OriginalAwardsPage({ year, program }: { year: 2025 | 2026; program?: EventSnapshot["contentPages"][number] | null }) {
  const archive = year === 2025;
  const categories = awards[11]!.blocks.slice(1);
  return <main className={`${styles.page} ${styles.awards}`}>
    <YearNavigation kind="awards" year={year} />
    <section className={styles.awardsHero}><img src={awards[0]!.images[0]!.src} alt="Not Alone Awards. Powered by the Steven & Alexandra Cohen Foundation." fetchPriority="high" /><h1 className={styles.hidden}>Not Alone Awards {year}</h1><p>{archive ? "2025 ARCHIVE" : "2026 NOT ALONE AWARDS"}</p><p>WYNN LAS VEGAS</p></section>
    <section className={`${styles.band} ${styles.intro}`}>{archive ? <Copy section={awards[1]!} /> : <><h2>Celebrating pioneers in human development and mental health</h2><p>Honoring those advancing emotional, social, and mental well-being through research, clinical innovation, technology, advocacy, philanthropy, and art.</p></>}</section>
    {archive ? <>
      <section className={`${styles.band} ${styles.policy}`}><Copy section={awards[2]!} /></section>
      <Portraits section={awards[3]!} />
      <section className={`${styles.band} ${styles.archiveRsvp}`}><h2>2025 Awards at Wynn Las Vegas</h2><p>Registration for this past event is closed.</p><Link className={styles.action} href="/awards/2026">View 2026 Awards</Link></section>
      {awards.slice(5, 10).map(section => <Portraits key={section.id} section={section} />)}
      <section className={`${styles.band} ${styles.why}`}><Copy section={awards[10]!} /></section>
      <section className={styles.band}><h2>2025 Awards</h2><div className={styles.categories}>{categories.filter((_, index) => index % 2 === 0).map((block, index) => <article key={block.text}><h3>{block.text}</h3><p>{categories[index * 2 + 1]?.text}</p></article>)}</div></section>
    </> : <section className={styles.band}><h2>{program?.title ?? "2026 program"}</h2>{program ? <p className={styles.program}>{program.body}</p> : <><p>Honorees and show roles will be announced after final approval.</p><p>Awards-specific appearances and categories remain withheld until the event team approves them.</p></>}<Link className={styles.action} href="/#directory">View confirmed Summit guests</Link></section>}
    <section className={`${styles.band} ${styles.awardsClosing}`}><h2>Celebrating Pioneers in Human Development &amp; Mental Health</h2><Link href={archive ? "/2025" : "/"} className={styles.action}>Explore the {year} Summit</Link></section>
  </main>;
}
