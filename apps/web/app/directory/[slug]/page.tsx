import Link from "next/link";
import { notFound } from "next/navigation";
import { directoryPeople, people2025 } from "../../../lib/people";
import { getReviewedContentSnapshot } from "../../../lib/snapshot";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = [...directoryPeople(await getReviewedContentSnapshot()), ...people2025].find(person => person.slug === slug);
  if (!person) notFound();
  return <main className="profilePage"><Link href={person.year === 2026 ? "/#directory" : "/2025"} className="backLink">← Back to {person.year} directory</Link><section className="profileHero"><div className="profilePortrait">{person.image ? <img src={person.image} alt={`${person.name} profile`} /> : <span>{person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>}</div><div><p className="eyebrow">{person.categories.join(" · ")} · {person.year}</p><h1>{person.name}</h1><p className="profileRole">{person.role}</p><p className="profileBio">{person.bio}</p></div></section></main>;
}
