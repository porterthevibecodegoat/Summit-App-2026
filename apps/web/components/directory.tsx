"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, type SummitPerson } from "../lib/people";
import { personInitials } from "../lib/person-portraits";

export function Directory({ people2026, available = true, context = "summit" }: { people2026: SummitPerson[]; available?: boolean; context?: "summit" | "awards" }) {
  const [query, setQuery] = useState("");
  const awards = context === "awards";
  const matchingPeople = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return people2026.filter(person => terms.every(term => `${person.name} ${person.role} ${person.categories.join(" ")}`.toLocaleLowerCase().includes(term)));
  }, [query, people2026]);
  const groups = useMemo(() => awards
    ? matchingPeople.length ? [{ category: "All confirmed guests", people: [...matchingPeople].sort((a, b) => a.name.localeCompare(b.name)) }] : []
    : categories.map((category) => ({ category, people: matchingPeople.filter((person) => person.categories.includes(category)).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)) })).filter((group) => group.people.length), [matchingPeople, awards]);
  const jumpTo = (category: string) => document.getElementById(`directory-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <section className="directorySection" id="directory">
      <div className="sectionHeading"><p className="eyebrow">{awards ? "The 2026 gathering" : "2026 Summit"}</p><h2>{awards ? "Confirmed Talent & Guests" : "Meet Our Guests"}</h2><p>{awards ? "Everyone currently confirmed for the 2026 Not Alone gathering. Awards appearances, performances, and honorees will be announced separately." : "An exclusive convening of the nation’s top mental health advocates, including experts, celebrities, athletes, business leaders, #NotAlone supporters, and philanthropists."}</p></div>
      <div className="directoryTools">
        {awards ? <p className="directoryLabel">2026 confirmed attendance</p> : <div className="categoryTabs" aria-label="Jump to directory section">{groups.map(({ category }) => <button key={category} onClick={() => jumpTo(category)}>{category}</button>)}</div>}
        <label className="searchBox"><span className="srOnly">Search people</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" aria-controls="directory-results" /></label>
      </div>
      {available && <p className="directoryCount" role="status" aria-live="polite">{matchingPeople.length} {matchingPeople.length === 1 ? "guest" : "guests"}{query.trim() ? " found" : ""}</p>}
      <div className="directoryGroups" id="directory-results">{groups.map(({ category, people }) => <section className="directoryGroup" id={`directory-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={category}><div className={awards ? "srOnly" : "groupHeading"}><p className="eyebrow">2026 Directory</p><h3>{category}</h3></div><div className="peopleGrid">{people.map((person) => <Link className="personCard" href={`/directory/${person.slug}${awards ? "?from=awards" : ""}`} key={`${category}-${person.slug}`}><div className="portrait">{person.image ? <img src={person.image} alt="" loading="lazy" decoding="async" width={500} height={500} /> : <span>{personInitials(person.name)}</span>}</div><div><h3>{person.name}</h3><p>{person.role}</p></div><span className="cardArrow">↗</span></Link>)}</div></section>)}</div>
      {!groups.length && <p className="emptyState">{!available ? "The guest directory is temporarily unavailable. Please try again shortly." : query ? "No people match that search." : "Confirmed guest details will appear after event-team approval."}</p>}
    </section>
  );
}
