import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { awards2025Highlights } from "../lib/content";
import { AwardsHighlights } from "./awards-highlights";

describe("Awards archival highlights", () => {
  it("shows the real local poster and an accessible play action before requesting YouTube", () => {
    const html = renderToStaticMarkup(<AwardsHighlights {...awards2025Highlights} />);
    expect(html).toContain('src="/images/awards-2025-highlights.jpg"');
    expect(html).toContain('aria-label="Play 2025 Not Alone Awards highlights"');
    expect(html).toContain("1:38");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("autoplay=1");
  });
  it("always provides the verified external watch link, including before hydration", () => {
    const html = renderToStaticMarkup(<AwardsHighlights {...awards2025Highlights} />);
    expect(html).toContain(`href="${awards2025Highlights.watchUrl}"`);
    expect(html).toContain('target="_blank" rel="noreferrer"');
    expect(html).toContain("Watch on YouTube");
  });
});
