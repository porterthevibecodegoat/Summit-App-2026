import Link from "next/link";
import { notFound } from "next/navigation";
import { directoryPeople, people2025 } from "../../../lib/people";
import { getReviewedContentSnapshot } from "../../../lib/snapshot";
import { personInitials } from "../../../lib/person-portraits";
import styles from "./profile.module.css";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string | string[] }> }) {
  const { slug } = await params;
  const fromAwards = (await searchParams).from === "awards";
  const currentDirectory = fromAwards ? "/awards/2026#directory" : "/#directory";
  const snapshot = await getReviewedContentSnapshot();
  const archivedPerson = people2025.find(person => person.slug === slug);
  if (!snapshot && !archivedPerson) {
    return <main className="contentPage"><h1>Guest details temporarily unavailable</h1><p>Please try again shortly. No unpublished information is displayed.</p><a href={`/directory/${encodeURIComponent(slug)}${fromAwards ? "?from=awards" : ""}`} className="primaryButton">Try again</a><Link href={currentDirectory} className="backLink">Back to directory</Link></main>;
  }
  const person = directoryPeople(snapshot).find(person => person.slug === slug) ?? archivedPerson;
  if (!person) notFound();
  return <main className={`profilePage ${styles.page}`}>
    <Link href={person.year === 2026 ? currentDirectory : "/2025"} className="backLink">← Back to {person.year}{fromAwards && person.year === 2026 ? " Awards" : ""} directory</Link>
    <section className="profileHero">
      <div className="profilePortrait">{person.image
        ? <img src={person.image} alt={`${person.name} profile`} width={500} height={500} />
        : <span>{personInitials(person.name)}</span>}</div>
      <div><p className="eyebrow">{person.categories.join(" · ")} · {person.year}</p>
        <h1>{person.name}</h1><p className="profileRole">{person.role}</p>
        {person.bio && <p className="profileBio">{person.bio}</p>}
      </div>
    </section>
  </main>;
}
