import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageForm } from "../../../components/message-form";
import { findPerson, people2025, people2026 } from "../../../lib/people";

export function generateStaticParams() { return [...people2026, ...people2025].map(({ slug }) => ({ slug })); }

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = findPerson(slug);
  if (!person) notFound();
  return <main className="profilePage"><Link href={person.year === 2026 ? "/#directory" : "/2025"} className="backLink">← Back to {person.year} directory</Link><section className="profileHero"><div className="profilePortrait">{person.image ? <img src={person.image} alt={`${person.name} profile`} /> : <span>{person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>}</div><div><p className="eyebrow">{person.categories.join(" · ")} · {person.year}</p><h1>{person.name}</h1><p className="profileRole">{person.role}</p><p className="profileBio">{person.bio}</p></div></section>{person.messageable ? <section className="connectPanel"><div><p className="eyebrow">Connect at the summit</p><h2>Send {person.name.split(" ")[0]} a request.</h2><p>If they use the app, the request can appear there and in email. If they do not, it will be delivered by email once production messaging is connected.</p></div><MessageForm recipient={person.name} /></section> : <section className="archiveNotice"><h2>2025 archive profile</h2><p>Messaging is available only for the current 2026 summit community.</p></section>}</main>;
}
