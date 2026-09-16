import Link from "next/link";
import type { EventSnapshot } from "@not-alone/validation";
import source from "../lib/original-sites.json";
import { summit2025Leadership, summit2025Directory, summit2025Highlights, awards2025Highlights } from "../lib/content";
import { directoryPeople } from "../lib/people";
import { originalAsset } from "../lib/original-assets";
import { personNameKey as normalizePersonName } from "../lib/person-portraits";
import { Directory } from "./directory";
import { AwardsHighlights } from "./awards-highlights";
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
const confirmedOriginalAliases = new Map<string, string[]>([
  ["alex cohen", ["alexandra cohen"]],
  ["steven and alexandra cohen", ["steven cohen", "alexandra cohen"]],
  ["bob and mike bryan", ["bob bryan", "mike bryan"]],
  ["melinda and noah springer", ["melinda springer", "noah springer"]],
  ["sean and ana wolfington", ["sean wolfington", "ana wolfington"]],
  ["janet and steve wozniak", ["janet wozniak", "steve wozniak"]],
  ["jen smorgon", ["jennifer smorgon"]],
  ["jennifer smorgon", ["jen smorgen"]],
  ["darryl mcdaniels", ["darryl mcdaniels dmc"]],
  ["daniel h gillison", ["daniel gillison"]],
  ["daniel h gillison jr", ["daniel gillison"]],
  ["wendy oliver pyatt", ["wendy oliver-pyatt"]],
  ["marc brackett", ["marc brackett"]],
  ["blaise aguirre", ["blaise aguirre"]],
  ["david eagleman", ["david eagleman"]],
  ["jon hershfield", ["jon hershfield"]],
  ["kevin hines", ["kevin hines"]],
  ["mike majlak", ["mike majlak"]]
]);

function isConfirmed2026OriginalPerson(name: string, confirmedNames: Set<string>) {
  const normalized = normalizePersonName(name);
  if (confirmedNames.has(normalized)) return true;
  return confirmedOriginalAliases.get(normalized)?.every(alias => confirmedNames.has(normalizePersonName(alias))) ?? false;
}

function confirmedSection(section: SourceSection, confirmedNames: Set<string>): SourceSection {
  return { ...section, people: section.people.filter(person => isConfirmed2026OriginalPerson(person.name, confirmedNames)) };
}

function uniquePeople(people: ReturnType<typeof directoryPeople>) {
  const seen = new Set<string>();
  return people.filter(person => {
    const key = normalizePersonName(person.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  if (!section.people.length) return null;
  return <section className={`${styles.band} ${styles.portraitSection}`}><h2>{section.title}</h2>
    <div className={styles.portraits}>{section.people.map(person => {
      const card = <><img src={person.image} alt={person.name} loading="lazy" width={500} height={500} /><div><h3>{person.name}</h3><p>{person.role}</p></div></>;
      const hasProfile = ![source.summit.source, source.awards.source].includes(person.href.split("#")[0]!);
      return hasProfile ? <a href={person.href} key={person.name} aria-label={`${person.name}, ${person.role}`}>{card}</a> : <article key={person.name}>{card}</article>;
    })}</div>
  </section>;
}

function Leadership({ producers = false, chairsOnly = false }: { producers?: boolean; chairsOnly?: boolean }) {
  const groups = producers ? summit2025Directory.filter(group => /Producers/.test(group.title)) : chairsOnly ? summit2025Leadership.filter(group => group.title === "Co-Chairs") : summit2025Leadership;
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
  const reviewedPeople = uniquePeople(directoryPeople(snapshot));
  const confirmedNames = new Set(reviewedPeople.map(person => normalizePersonName(person.name)));
  return <main className={`${styles.page} ${archive ? "" : styles.refined}`}>
    <YearNavigation kind="summit" year={year} />
    <section className={styles.summitHero}><img src={summit[0]!.images[0]!.src} alt="Not Alone Summit. The World's Premier Mental Health Summit." fetchPriority="high" /><h1 className={archive ? styles.hidden : styles.heroTitle}>Not Alone Summit {year}</h1></section>
    <div className={styles.yearNotice}>{archive ? "2025 archive · Historical participants and partners" : "November 2–4, 2026 · Wynn Las Vegas"}</div>
    {!archive && <nav className={styles.sectionNav} aria-label="Explore the Summit"><a href="#leadership">Co-Chairs &amp; Hosts</a><a href="#directory">Our Guests</a><a href="#producers">Production</a><Link href="/awards/2026">The Awards</Link></nav>}
    <section className={`${styles.band} ${styles.intro}`} id="about">
      {archive ? <Copy section={summit[1]!} /> : <><h2>“The Davos of Human Development” - Jewel</h2><p>The Not Alone Summit, powered by the Steven &amp; Alexandra Cohen Foundation and hosted at Wynn Las Vegas, brings together leading CEOs, artists, athletes, philanthropists, clinicians, researchers, and youth ambassadors to advance emotional and mental health.</p><p>{summit[1]!.blocks[2]!.text}</p></>}
      <img className={styles.partnerLogo} src={summit[1]!.images[0]!.src} alt="Steven & Alexandra Cohen Foundation" loading="lazy" />
    </section>
    <section className={`${styles.band} ${styles.foundation}`} id="foundation"><img src={summit[2]!.images[0]!.src} alt="Inspiring Children Foundation" loading="lazy" /><div><Copy section={summit[2]!} /></div></section>
    <section className={`${styles.band} ${styles.partner}`} id="partners"><h2>{archive ? "Sponsored By" : "At Wynn Las Vegas"}</h2><img src={summit[3]!.images[0]!.src} alt="Wynn Resorts" loading="lazy" />{archive && <p>Presented by Villa Bibbiani · Powered by the Steven &amp; Alexandra Cohen Foundation</p>}</section>
    <Leadership />
    <section className={`${styles.band} ${styles.features}`}><img src={summit[5]!.images[0]!.src} alt="Jewel speaking at the summit" loading="lazy" /><div><h2>Featuring</h2><ul>{summit2025Highlights.map(item => <li key={item}>{item}</li>)}</ul></div></section>
    <section className={`${styles.band} ${styles.venue}`} id="venue"><img src={summit[6]!.images[0]!.src} alt="Wynn Las Vegas" loading="lazy" /><h2>Located at Wynn Las Vegas</h2>{!archive && <p>November 2–4, 2026</p>}<p>Exclusive convening of the nation’s top mental health advocates, including:</p><ul>{["Experts", "Celebrities", "Athletes", "Business Leaders", "#NotAlone Supporters", "Philanthropists"].map(label => <li key={label}>{label}</li>)}</ul></section>
    <div id={archive ? "directory" : undefined}>{archive ? summit.slice(7, 13).map(section => <Portraits key={section.id} section={section} />) : <>
      {summit.slice(7, 13).map(section => <Portraits key={section.id} section={confirmedSection(section, confirmedNames)} />)}
      <Directory people2026={reviewedPeople} available={snapshot?.event.directoryEnabled ?? false} />
    </>}</div>
    <Leadership producers />
    <section className={`${styles.band} ${styles.closing}`} id="rsvp"><img src={summit[14]!.images[1]!.src} alt="" loading="lazy" /><h2>Thank you for your interest!</h2><p>{archive ? "Explore the 2025 Not Alone Awards and the people behind the gathering." : "Please contact us to inquire about attendance."}</p><Link href={archive ? "/awards/2025" : "/contact"} className={styles.action}>{archive ? "2025 Not Alone Awards" : "Contact Us"}</Link></section>
  </main>;
}

type AwardsPageProps = { year: 2025 | 2026; program?: EventSnapshot["contentPages"][number] | null; snapshot?: EventSnapshot | null };

function CurrentAwardsPage({ program, snapshot = null }: Omit<AwardsPageProps, "year">) {
  const reviewedPeople = uniquePeople(directoryPeople(snapshot));
  const available = snapshot?.event.directoryEnabled ?? false;
  const show = snapshot?.scheduleItems.find(item => item.title === "Awards Show" && item.published && item.visibilityScope.id === "public" && item.status !== "canceled");
  const date = show ? new Intl.DateTimeFormat("en-US", { timeZone: show.eventTimeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(show.startUtc)) : "2026 · Date to be confirmed";
  const venue = snapshot?.event.venueName ?? "Venue details to be confirmed";
  const approvedProgram = program?.published ? program : null;
  const categories = awards[11]!.blocks.slice(1);
  return <main className={`${styles.page} ${styles.awards} ${styles.refined}`}>
    <YearNavigation kind="awards" year={2026} />
    <section className={styles.awardsHero} aria-labelledby="awards-title">
      <img className={styles.heroScene} src="/images/wynn-las-vegas.webp" alt="Wynn Las Vegas overlooking its gardens and waterfall" fetchPriority="high" width={1500} height={1125} />
      <div className={styles.heroContent}>
        <p className={styles.heroVenue}>{venue}</p>
        <h1 id="awards-title" className={styles.awardsEdition}>Not Alone<br />Awards <span>2026</span></h1>
        <p className={styles.heroDate}>{show ? <time dateTime={show.startUtc}>{date}</time> : date}</p>
        <p className={styles.heroInvitation}>Invitation only</p>
        <div className={styles.awardsActions}><a className={styles.action} href="#awards-program">Explore the evening</a><a className={styles.textAction} href="#highlights">Watch 2025 highlights</a></div>
      </div>
      <div className={styles.heroFootnote}><p>Powered by<br /><strong>Steven &amp; Alexandra Cohen Foundation</strong></p><p>Wynn Las Vegas</p></div>
    </section>
    <nav className={styles.sectionNav} aria-label="Explore the Awards"><a href="#awards-program">The Evening</a><a href="#highlights">2025 Highlights</a><a href="#directory">2026 Talent &amp; Guests</a><a href="#leadership">Co-Chairs</a><a href="#producers">Production</a></nav>
    <section className={`${styles.band} ${styles.awardsIntroduction}`}>
      <p className={styles.kicker}>Human development. Mental health. Human connection.</p>
      <h2>Celebrating the people who move humanity forward.</h2>
      <p>{awards[1]!.blocks[1]!.text}</p>
    </section>
    <section className={`${styles.band} ${styles.highlights}`} id="highlights" aria-labelledby="highlights-title">
      <div className={styles.sectionTitle}><div><p className={styles.kicker}>From the inaugural celebration</p><h2 id="highlights-title">The 2025 Highlights</h2></div><span>{awards2025Highlights.duration}</span></div>
      <AwardsHighlights {...awards2025Highlights} />
    </section>
    <section className={`${styles.band} ${styles.eveningProgram}`} id="awards-program" aria-labelledby="program-title">
      <div><p className={styles.kicker}>The 2026 evening</p><h2 id="program-title">{approvedProgram?.title ?? "Not Alone Awards 2026"}</h2><p>{venue}</p><div className={styles.hostCredit}><img src={awards[3]!.people[0]!.image} alt="Loni Love" loading="lazy" width={100} height={100} /><div><p className={styles.kicker}>Host</p><h3>{awards[3]!.people[0]!.name}</h3><p>{awards[3]!.people[0]!.role}</p></div></div><Link className={styles.action} href="/contact">Attendance inquiries</Link><Link className={styles.scheduleLink} href="/schedule">Full 2026 event schedule</Link></div>
      <div className={styles.programCopy}>{approvedProgram ? approvedProgram.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>The 2026 show program is temporarily unavailable. Please check back for confirmed times and event details.</p>}</div>
    </section>
    <Directory context="awards" people2026={reviewedPeople} available={available} />
    <Leadership chairsOnly />
    <Leadership producers />
    <section className={`${styles.band} ${styles.awardsTradition}`} id="award-categories"><p className={styles.kicker}>A tradition of recognition</p><h2>The Awards</h2><p>{awards[1]!.blocks[2]!.text}</p><p>2026 award categories and honorees will be announced when confirmed.</p><details><summary>Explore the 2025 award categories</summary><div className={styles.categories}>{categories.filter((_, index) => index % 2 === 0).map((block, index) => <article key={block.text}><span className={styles.categoryNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{block.text}</h3><p>{categories[index * 2 + 1]?.text}</p></article>)}</div></details></section>
    <section className={`${styles.band} ${styles.policy}`}><Copy section={awards[2]!} /></section>
    <section className={`${styles.band} ${styles.awardsClosing}`}><p className={styles.kicker}>Part of the Not Alone Summit</p><h2>Celebrating Pioneers in Human Development &amp; Mental Health</h2><p>{snapshot?.event.dateLabel}</p><Link href="/" className={styles.action}>Explore the 2026 Summit</Link></section>
  </main>;
}

export function OriginalAwardsPage({ year, program = null, snapshot = null }: AwardsPageProps) {
  if (year === 2026) return <CurrentAwardsPage program={program} snapshot={snapshot} />;
  const categories = awards[11]!.blocks.slice(1);
  return <main className={`${styles.page} ${styles.awards}`}>
    <YearNavigation kind="awards" year={year} />
    <section className={styles.awardsHero}><img src={awards[0]!.images[0]!.src} alt="Not Alone Awards. Powered by the Steven & Alexandra Cohen Foundation." fetchPriority="high" /><h1 className={styles.hidden}>Not Alone Awards {year}</h1><p>2025 ARCHIVE</p><p>WYNN LAS VEGAS</p></section>
    <section className={`${styles.band} ${styles.intro}`}><Copy section={awards[1]!} /></section>
      <section className={`${styles.band} ${styles.policy}`}><Copy section={awards[2]!} /></section>
      <Portraits section={awards[3]!} />
      <section className={`${styles.band} ${styles.archiveRsvp}`}><h2>2025 Awards at Wynn Las Vegas</h2><p>Registration for this past event is closed.</p><Link className={styles.action} href="/awards/2026">View 2026 Awards</Link></section>
      {awards.slice(5, 10).map(section => <Portraits key={section.id} section={section} />)}
      <section className={`${styles.band} ${styles.why}`}><Copy section={awards[10]!} /></section>
      <section className={styles.band}><h2>2025 Awards</h2><div className={styles.categories}>{categories.filter((_, index) => index % 2 === 0).map((block, index) => <article key={block.text}><h3>{block.text}</h3><p>{categories[index * 2 + 1]?.text}</p></article>)}</div></section>
    <section className={`${styles.band} ${styles.awardsClosing}`}><h2>Celebrating Pioneers in Human Development &amp; Mental Health</h2><Link href="/2025" className={styles.action}>Explore the {year} Summit</Link></section>
  </main>;
}
