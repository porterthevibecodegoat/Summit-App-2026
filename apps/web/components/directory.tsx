"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, people2026 } from "../lib/people";

export function Directory() {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => categories.map((category) => ({ category, people: people2026.filter((person) => person.categories.includes(category) && person.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)) })).filter((group) => group.people.length), [query]);
  const jumpTo = (category: string) => document.getElementById(`directory-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <section className="directorySection" id="directory">
      <div className="sectionHeading"><p className="eyebrow">2026 Summit</p><h2>Featuring</h2><p>An exclusive convening of the nation’s top mental health advocates, including experts, celebrities, athletes, business leaders, #NotAlone supporters, and philanthropists.</p></div>
      <div className="directoryTools">
        <div className="categoryTabs" aria-label="Jump to directory section">{categories.map((item) => <button key={item} onClick={() => jumpTo(item)}>{item}</button>)}</div>
        <label className="searchBox"><span className="srOnly">Search people</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" /></label>
      </div>
      <div className="directoryGroups">{groups.map(({ category, people }) => <section className="directoryGroup" id={`directory-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={category}><div className="groupHeading"><p className="eyebrow">2026 Directory</p><h3>{category}</h3></div><div className="peopleGrid">{people.map((person) => <Link className="personCard" href={`/directory/${person.slug}`} key={`${category}-${person.slug}`}><div className="portrait">{person.image ? <img src={person.image} alt="" /> : <span>{person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>}</div><div><h3>{person.name}</h3><p>{person.role}</p></div><span className="cardArrow">↗</span></Link>)}</div></section>)}</div>
      {!groups.length && <p className="emptyState">No people match that search.</p>}
    </section>
  );
}
