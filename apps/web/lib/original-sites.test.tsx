import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import source from "./original-sites.json";
import { originalAsset } from "./original-assets";
import { OriginalAwardsPage, OriginalSummitPage } from "../components/original-event-page";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;");

describe("source-faithful, year-separated event pages", () => {
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
  it("never turns last year's hosts, sponsors or award categories into 2026 confirmations", () => {
    const summit = renderToStaticMarkup(<OriginalSummitPage year={2026} />);
    const awards = renderToStaticMarkup(<OriginalAwardsPage year={2026} />);
    for (const html of [summit, awards]) {
      expect(html).not.toContain("Villa Bibbiani");
      expect(html).not.toContain("Dr. George Rapier III");
      expect(html).not.toContain("Loni Love");
      expect(html).not.toContain("Bold Stand to Reduce Stigma");
    }
    expect(awards).toContain("after final approval");
    expect(awards).not.toContain("iHeartRadio");
  });
  it("renders staff-published 2026 awards copy without exposing an archive RSVP", () => {
    const html = renderToStaticMarkup(<OriginalAwardsPage year={2026} program={{ id: "program", slug: "awards-2026-program", title: "Approved program", body: "Reviewed copy", published: true, revision: 1 }} />);
    expect(html).toContain("Reviewed copy");
    expect(renderToStaticMarkup(<OriginalAwardsPage year={2025} />)).toContain("Registration for this past event is closed");
    expect(html).not.toContain("awards-rsvp");
  });
});
