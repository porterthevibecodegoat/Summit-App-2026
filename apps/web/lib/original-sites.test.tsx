import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import source from "./original-sites.json";
import { originalAsset } from "./original-assets";
import { OriginalAwardsPage, OriginalSummitPage } from "../components/original-event-page";
import { event2026Snapshot } from "@not-alone/test-fixtures/event-2026";
import { summit2025Leadership, summit2025Directory, awards2025Highlights } from "./content";
import { publishedAwardsProgram } from "@not-alone/domain";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;");

describe("source-faithful, year-separated event pages", () => {
  it("uses distinct venue and highlights photography without changing the 2025 archive", () => {
    const current = renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={event2026Snapshot} />);
    const hero = current.match(/<section[^>]*aria-labelledby="awards-title"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    expect(current).toContain('aria-labelledby="awards-title"');
    expect(hero).toContain('src="/images/wynn-las-vegas.webp"');
    expect(hero).toContain('alt="Wynn Las Vegas overlooking its gardens and waterfall"');
    expect(hero).not.toContain("/images/awards-2025-highlights.jpg");
    expect(current).toContain('src="/images/awards-2025-highlights.jpg"');
    expect(current).not.toContain("Jewel at the 2025 Awards");
    expect(current).toContain('href="#awards-program"');
    expect(current).toContain('href="#highlights"');
    expect(current).toContain("Steven &amp; Alexandra Cohen Foundation");
    const archive = renderToStaticMarkup(<OriginalAwardsPage year={2025} />);
    expect(archive).not.toContain("/images/awards-2025-highlights.jpg");
  });
  it("preserves every original Summit and Awards portrait, name and affiliation", () => {
    for (const [kind, html] of [["summit", renderToStaticMarkup(<OriginalSummitPage year={2025} />)], ["awards", renderToStaticMarkup(<OriginalAwardsPage year={2025} />)]] as const) {
      const people = source[kind].sections.flatMap(section => section.people);
      expect(people.length).toBe(kind === "summit" ? 66 : 75);
      for (const person of people) {
        expect(html).toContain(escape(person.name));
        expect(html).toContain(escape(person.role));
        expect(html).toContain(escape(originalAsset(person.image)));
      }
    }
  });
  it("preserves full mission copy, all 18 award descriptions, and original credits", () => {
    const summit = renderToStaticMarkup(<OriginalSummitPage year={2025} />);
    const awards = renderToStaticMarkup(<OriginalAwardsPage year={2025} />);
    for (const section of source.summit.sections.slice(1, 3)) {
      for (const block of section.blocks) expect(summit).toContain(escape(block.text));
    }
    for (const index of [1, 2, 10, 11]) {
      for (const block of source.awards.sections[index]!.blocks) expect(awards).toContain(escape(block.text));
    }
    expect(source.awards.sections[11]!.blocks).toHaveLength(37);
    for (const name of ["Jewel", "Ryan Wolfington", "Trevor Short", "Dr. George Rapier III", "Trent Alenik", "Aphrah Brokaw"]) expect(summit).toContain(name);
  });
  it("keeps the 2026 pages source-faithful without restoring unconfirmed sponsors or people", () => {
    const summit = renderToStaticMarkup(<OriginalSummitPage year={2026} snapshot={event2026Snapshot} />);
    const awards = renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={event2026Snapshot} />);
    for (const html of [summit, awards]) {
      expect(html).not.toContain("Villa Bibbiani");
      expect(html).not.toContain("Rachel Platten");
      expect(html).not.toContain("Geoff Ralston");
    }
    expect(summit).toContain("Loni Love");
    expect(summit).toContain("Dr. George Rapier III");
    expect(awards).toContain("Dr. George Rapier III");
    expect(awards).toContain("Loni Love");
    expect(awards).toContain("Bold Stand to Reduce Stigma");
    expect(awards).toMatch(/invitation[- ]only/i);
  });
  it("removes withdrawn guests from both featured sections and directory while preserving fixed credits", () => {
    const snapshot = { ...event2026Snapshot, speakers: event2026Snapshot.speakers.filter(person => person.name !== "Mike Tyson") };
    for (const html of [renderToStaticMarkup(<OriginalSummitPage year={2026} snapshot={snapshot} />), renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={snapshot} />)]) {
      expect(html).not.toContain("Mike Tyson");
      expect(html).toContain("Kevin Hines");
    }
    for (const offline of [renderToStaticMarkup(<OriginalSummitPage year={2026} />), renderToStaticMarkup(<OriginalAwardsPage year={2026} />)]) {
      expect(offline).not.toContain("Mike Tyson");
      expect(offline).toContain("temporarily unavailable");
      expect(offline).toContain("Dr. George Rapier III");
    }
  });
  it("preserves production credits and the correct portrait for every credited person", () => {
    const section = source.summit.sections[13]!;
    for (const html of [renderToStaticMarkup(<OriginalSummitPage year={2026} />), renderToStaticMarkup(<OriginalAwardsPage year={2026} />)]) {
      section.blocks.filter(block => block.tag === "h4").forEach((block, index) => {
        expect(html).toContain(`<img src="${escape(originalAsset(section.images[index]!.src))}" alt="${escape(block.text)}"`);
      });
      for (const group of [...summit2025Leadership.filter(group => group.title === "Co-Chairs"), ...summit2025Directory.filter(group => /Producers/.test(group.title))]) {
        for (const person of group.people) {
          expect(html).toContain(`<h3>${escape(person.name)}</h3><p>${escape(person.role)}</p>`);
        }
      }
      expect(html.match(/id="directory"/g)).toHaveLength(1);
    }
  });
  it("renders staff-published 2026 awards copy without exposing an archive RSVP", () => {
    const html = renderToStaticMarkup(<OriginalAwardsPage year={2026} program={{ id: "program", slug: "awards-2026-program", title: "Approved program", body: "Reviewed copy", published: true, revision: 1 }} />);
    expect(html).toContain("Reviewed copy");
    expect(renderToStaticMarkup(<OriginalAwardsPage year={2025} />)).toContain("Registration for this past event is closed");
    expect(html).not.toContain("awards-rsvp");
  });
  it("includes every confirmed 2026 name once in the Awards roster, without treating fixed credits as attendance", () => {
    const html = renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={event2026Snapshot} />);
    const roster = html.slice(html.indexOf('id="directory"'), html.indexOf('id="leadership"'));
    expect(roster.match(/class="personCard"/g)).toHaveLength(53);
    expect(roster.match(/\?from=awards/g)).toHaveLength(53);
    expect(renderToStaticMarkup(<OriginalSummitPage year={2026} snapshot={event2026Snapshot} />)).not.toContain("?from=awards");
    for (const person of event2026Snapshot.speakers) expect(roster).toContain(`<h3>${escape(person.name)}</h3>`);
    expect(roster).not.toContain("Dr. George Rapier III");
    expect(roster).not.toContain("Cherrial Odell");
    expect(roster).not.toContain("TBC");
    expect(roster).toContain("Awards appearances, performances, and honorees will be announced separately.");
    const hidden = renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={{ ...event2026Snapshot, event: { ...event2026Snapshot.event, directoryEnabled: false } }} />);
    expect(hidden).not.toContain("Anthony Ramos");
    expect(hidden).toContain("temporarily unavailable");
  });
  it("includes the verified 2025 highlights and separates archival categories from the current program", () => {
    const html = renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={event2026Snapshot} program={publishedAwardsProgram(event2026Snapshot)} />);
    expect(html).toContain(`href="${escape(awards2025Highlights.watchUrl)}"`);
    expect(html).not.toContain("autoplay=1");
    expect(html).toContain("Monday, November 2, 2026");
    expect(html).toContain("Red Carpet: 6:15-7:30 PM");
    expect(html).toContain("Doors Open: 6:30 PM");
    expect(html).toContain("Pre-Show: 7:30 PM");
    expect(html).toContain("Awards Show: 8:00-10:00 PM");
    expect(html).toContain("<summary>Explore the 2025 award categories</summary>");
    expect(html).not.toContain("broadcast live on iHeartRadio");
    expect(html).not.toContain("2025 ARCHIVE");
  });
  it("does not display an unpublished show program or a canceled show date", () => {
    const snapshot = { ...event2026Snapshot, scheduleItems: event2026Snapshot.scheduleItems.map(item => item.title === "Awards Show" ? { ...item, status: "canceled" as const } : item) };
    const program = { ...publishedAwardsProgram(event2026Snapshot)!, published: false, body: "Unapproved award announcement" };
    const html = renderToStaticMarkup(<OriginalAwardsPage year={2026} snapshot={snapshot} program={program} />);
    expect(html).not.toContain("Unapproved award announcement");
    expect(html).not.toContain("Monday, November 2, 2026");
    expect(html).toContain("Date to be confirmed");
  });
});
