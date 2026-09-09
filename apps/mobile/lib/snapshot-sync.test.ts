import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { selectPublishedSnapshot } from "./snapshot-sync";

describe("mobile published snapshot selection", () => {
  it("accepts the first cloud snapshot", () => {
    const result = selectPublishedSnapshot(null, demoSnapshot);

    expect(result.snapshot.revision).toBe(demoSnapshot.revision);
    expect(result.advanced).toBe(false);
  });

  it("adopts the higher revision produced by a staff publication", () => {
    const next = { ...demoSnapshot, revision: demoSnapshot.revision + 1 };
    const result = selectPublishedSnapshot(demoSnapshot, next);

    expect(result.snapshot.revision).toBe(next.revision);
    expect(result.advanced).toBe(true);
  });

  it("keeps the current schedule when a stale response arrives", () => {
    const current = { ...demoSnapshot, revision: 4 };
    const stale = { ...demoSnapshot, revision: 3 };
    const result = selectPublishedSnapshot(current, stale);

    expect(result.snapshot.revision).toBe(4);
    expect(result.rejectedStaleRevision).toBe(3);
  });
});
