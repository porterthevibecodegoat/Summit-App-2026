import type { EventSnapshot } from "@not-alone/validation";

export type SnapshotSelection = {
  snapshot: EventSnapshot;
  advanced: boolean;
  rejectedStaleRevision?: number;
};

export function selectPublishedSnapshot(
  current: EventSnapshot | null,
  incoming: EventSnapshot
): SnapshotSelection {
  if (current && incoming.revision < current.revision) {
    return {
      snapshot: current,
      advanced: false,
      rejectedStaleRevision: incoming.revision
    };
  }

  return {
    snapshot: incoming,
    advanced: Boolean(current && incoming.revision > current.revision)
  };
}
