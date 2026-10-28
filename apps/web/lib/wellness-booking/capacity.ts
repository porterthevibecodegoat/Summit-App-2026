import { z } from "zod";
import { readFileSync } from "node:fs";
import draft from "../../config/wellness-capacity-2026.draft.json";
import { wellnessSessions } from "../wellness-signups-2026";

const ruleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("unset"), maxPlaces: z.null() }).strict(),
  z.object({ mode: z.literal("limited"), maxPlaces: z.number().int().min(1).max(10_000) }).strict(),
  z.object({ mode: z.literal("unlimited"), maxPlaces: z.null() }).strict(),
]);
export type CapacityRule = z.infer<typeof ruleSchema>;
export type CapacityRules = ReadonlyMap<string, CapacityRule>;
const knownIds = new Set(wellnessSessions.map(session => session.id));

export function capacityRules(input: unknown): CapacityRules {
  const values = z.record(z.string(), ruleSchema).parse(input);
  if (Object.keys(values).some(id => !knownIds.has(id))) throw new Error("Unknown wellness session in capacity settings.");
  return new Map(wellnessSessions.map(session => [session.id, values[session.id] ?? { mode: "unset" as const, maxPlaces: null }]));
}

export const draftCapacityRules = capacityRules(draft.sessions);

export function testCapacityRules(env: Partial<NodeJS.ProcessEnv>): CapacityRules {
  if (!/^nas-reminders-test-[a-z0-9-]+$/.test(env.INTEGRATION_TEST_STORE_PREFIX ?? "")) throw new Error("An isolated booking test prefix is required.");
  const raw = env.WELLNESS_BOOKING_TEST_CAPACITY_JSON ?? (env.WELLNESS_BOOKING_TEST_CAPACITY_FILE ? readFileSync(env.WELLNESS_BOOKING_TEST_CAPACITY_FILE, "utf8") : null);
  if (!raw || raw.length > 30_000) throw new Error("An explicit synthetic capacity configuration is required.");
  const fixture = JSON.parse(raw);
  if (fixture.status !== "test-only") throw new Error("Only labelled synthetic policies may be used in test mode.");
  return capacityRules(fixture.sessions);
}

// Owner settings remain a disabled draft until canonical source reconciliation
// and the remaining rollout review are complete. Test fixtures stay separate.
export function approvedCapacityRules(input: unknown = draft): CapacityRules {
  const config = z.object({ schemaVersion: z.literal(1), status: z.literal("approved"), enabled: z.literal(true), sessions: z.unknown(), activationHolds: z.array(z.string()).default([]) }).parse(input);
  if (config.activationHolds.length) throw new Error("Unresolved owner policy or source reconciliation prevents capacity activation.");
  const rules = capacityRules(config.sessions);
  if ([...rules.values()].some(rule => rule.mode === "unset")) throw new Error("Every session needs a confirmed capacity policy before activation.");
  return rules;
}
