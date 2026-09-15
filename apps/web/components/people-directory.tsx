import type { DirectoryGroup } from "../lib/content";

export function PeopleDirectory({ groups, tone = "light" }: { groups: DirectoryGroup[]; tone?: "light" | "dark" }) {
  return (
    <div className={`archive-directory archive-directory-${tone}`}>
      {groups.map((group) => (
        <section className="directory-group" key={group.title}>
          <header>
            {group.people.length > 0 ? <span aria-label={`${group.people.length} people`}>{String(group.people.length).padStart(2, "0")}</span> : null}
            <h2>{group.title}</h2>
          </header>
          {group.people.length > 0 ? (
            <div className="directory-grid">
              {group.people.map((person, index) => (
                <article key={`${group.title}-${person.name}-${index}`}>
                  <h3>{person.name}</h3>
                  <p>{person.role}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
