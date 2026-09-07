import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { fetchPublishedSnapshot } from "@not-alone/api-client";
import { publicAppConfig } from "@not-alone/config";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { demoSnapshot as canonicalSnapshot } from "@not-alone/test-fixtures";
import { eventSnapshotSchema, type EventSnapshot, type ScheduleItem } from "@not-alone/validation";

const LOCATION_IDS = {
  theater: "827d53e5-a0c6-4fdd-9dd7-bf72f04e8651",
  gallery: "4e141f78-c654-4f67-98ab-f8c9d8c92117",
  lounge: "f52f745d-ceb5-4396-9d93-5bb613c970d6",
  terrace: "3b8c9e58-8d73-4f93-b7cc-536b742b0d8f"
} as const;

const SPEAKER_IDS = {
  steveWozniak: "31d9f1e0-a24d-4db6-9793-8d0f01896256",
  panel: "a8a9b8fd-7c7b-4113-8a3d-8b8a7aa9f1f2"
} as const;

const SAVED_SESSION_IDS_KEY = "not-alone.saved-session-ids.v1";
const PUBLISHED_SNAPSHOT_CACHE_KEY = "not-alone.published-snapshot-cache.v1";
const SNAPSHOT_REFRESH_MS = 60000;

export const demoSpeaker = {
  name: "Steve Wozniak",
  role: "Apple Co-Founder",
  session: "Innovation, Humanity, and Not Being Alone",
  image: require("../assets/steve-wozniak-headshot.jpg"),
  credit: "Demo image: Steve Wozniak by Gage Skidmore, Wikimedia Commons"
} as const;

type DemoModeContextValue = {
  demoEnabled: boolean;
  snapshot: EventSnapshot;
  nowUtc: string;
  lastSuccessfulSyncAt: string | undefined;
  syncError: string | undefined;
  savedSessionIds: string[];
  refreshDemoTimeline: () => void;
  isSessionSaved: (sessionId: string) => boolean;
  toggleSavedSession: (sessionId: string) => void;
  setDemoEnabled: (enabled: boolean) => void;
  toggleDemoMode: () => void;
};

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

export function SummitDemoProvider({ children }: PropsWithChildren) {
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoCreatedAt, setDemoCreatedAt] = useState(() => new Date());
  const [publishedSnapshot, setPublishedSnapshot] = useState<EventSnapshot | null>(null);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | undefined>();
  const [syncError, setSyncError] = useState<string | undefined>();
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);
  const [savedSessionIdsLoaded, setSavedSessionIdsLoaded] = useState(false);
  const demoState = useMemo(() => createLiveDemoSnapshot(demoCreatedAt), [demoCreatedAt]);
  const snapshot = demoEnabled ? demoState.snapshot : publishedSnapshot ?? canonicalSnapshot;
  const nowUtc = demoEnabled ? demoState.nowUtc : canonicalSnapshot.serverTimeUtc;

  useEffect(() => {
    let active = true;

    async function loadCachedSnapshot() {
      try {
        const cached = await SecureStore.getItemAsync(PUBLISHED_SNAPSHOT_CACHE_KEY);
        if (!active || !cached) {
          return;
        }

        const parsed = eventSnapshotSchema.parse(JSON.parse(cached));
        setPublishedSnapshot(parsed);
        setLastSuccessfulSyncAt(parsed.serverTimeUtc);
      } catch {
        // Invalid local cache should not block the bundled fallback or a fresh API sync.
      }
    }

    async function syncPublishedSnapshot() {
      if (demoEnabled) {
        return;
      }

      try {
        const remoteSnapshot = await fetchPublishedSnapshot(publicAppConfig.apiBaseUrl, { timeoutMs: 6000 });
        if (!active) {
          return;
        }

        setPublishedSnapshot(remoteSnapshot);
        setLastSuccessfulSyncAt(new Date().toISOString());
        setSyncError(undefined);
        void SecureStore.setItemAsync(PUBLISHED_SNAPSHOT_CACHE_KEY, JSON.stringify(remoteSnapshot)).catch(() => undefined);
      } catch (error) {
        if (!active) {
          return;
        }

        setSyncError(error instanceof Error ? error.message : "Unable to synchronize the published event snapshot.");
      }
    }

    void loadCachedSnapshot();
    void syncPublishedSnapshot();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncPublishedSnapshot();
      }
    });
    const interval = setInterval(() => {
      void syncPublishedSnapshot();
    }, SNAPSHOT_REFRESH_MS);

    return () => {
      active = false;
      subscription.remove();
      clearInterval(interval);
    };
  }, [demoEnabled]);

  useEffect(() => {
    let active = true;

    async function loadSavedSessionIds() {
      try {
        const rawValue = await SecureStore.getItemAsync(SAVED_SESSION_IDS_KEY);
        if (!active) {
          return;
        }

        const parsed = rawValue ? JSON.parse(rawValue) : [];
        setSavedSessionIds(Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : []);
      } catch {
        if (active) {
          setSavedSessionIds([]);
        }
      } finally {
        if (active) {
          setSavedSessionIdsLoaded(true);
        }
      }
    }

    void loadSavedSessionIds();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!savedSessionIdsLoaded) {
      return;
    }

    void SecureStore.setItemAsync(SAVED_SESSION_IDS_KEY, JSON.stringify(savedSessionIds)).catch(() => undefined);
  }, [savedSessionIds, savedSessionIdsLoaded]);

  useEffect(() => {
    if (!publicAppConfig.featureFlags.pushDelivery || Platform.OS !== "ios") {
      return;
    }

    let active = true;

    async function registerForPushDelivery() {
      try {
        const existingPermissions = await Notifications.getPermissionsAsync();
        const finalPermissions =
          existingPermissions.status === "granted" ? existingPermissions : await Notifications.requestPermissionsAsync();

        if (finalPermissions.status !== "granted") {
          return;
        }

        const projectId = getExpoProjectId();
        if (!projectId || projectId.includes("replace-with")) {
          setSyncError("Push registration is enabled, but the EAS projectId is still a placeholder.");
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!active) {
          return;
        }

        await fetch(`${publicAppConfig.apiBaseUrl}/api/devices/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: createClientUuid(token.data),
            eventId: publicAppConfig.eventId,
            expoPushToken: token.data,
            audienceGroups: ["public"],
            platform: "ios",
            appVersion: "0.1.0",
            lastSeenAt: new Date().toISOString()
          })
        });
      } catch (error) {
        if (active) {
          setSyncError(error instanceof Error ? error.message : "Unable to register this device for push delivery.");
        }
      }
    }

    void registerForPushDelivery();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      demoEnabled,
      snapshot,
      nowUtc,
      lastSuccessfulSyncAt,
      syncError,
      savedSessionIds,
      refreshDemoTimeline: () => setDemoCreatedAt(new Date()),
      isSessionSaved: (sessionId: string) => savedSessionIds.includes(sessionId),
      toggleSavedSession: (sessionId: string) =>
        setSavedSessionIds((current) =>
          current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]
        ),
      setDemoEnabled,
      toggleDemoMode: () => setDemoEnabled((current) => !current)
    }),
    [demoEnabled, snapshot, nowUtc, lastSuccessfulSyncAt, syncError, savedSessionIds]
  );

  return (
    <DemoModeContext.Provider value={value}>
      <View style={styles.host}>{children}</View>
    </DemoModeContext.Provider>
  );
}

export function useSummitDemo() {
  const context = useContext(DemoModeContext);

  if (!context) {
    throw new Error("useSummitDemo must be used inside SummitDemoProvider");
  }

  return context;
}

export function DemoModeControl() {
  const [editorOpen, setEditorOpen] = useState(false);
  const { demoEnabled, setDemoEnabled } = useSummitDemo();

  return (
    <View style={styles.dockWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => (demoEnabled ? setEditorOpen(true) : setDemoEnabled(true))}
        style={({ pressed }) => [styles.dockButton, pressed && styles.pressed]}
      >
        <View style={[styles.dockGradient, demoEnabled ? styles.dockGradientOn : styles.dockGradientOff]}>
          <Text style={[styles.dockLabel, demoEnabled && styles.dockLabelOn]}>
            {demoEnabled ? "Edit Demo Mode" : "Demo Mode"}
          </Text>
          <Text style={[styles.dockMeta, demoEnabled && styles.dockMetaOn]}>
            {demoEnabled ? "Live preview is on" : "Temporary preview"}
          </Text>
        </View>
      </Pressable>
      <DemoModeEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </View>
  );
}

function DemoModeEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refreshDemoTimeline, setDemoEnabled } = useSummitDemo();

  return (
    <Modal animationType="fade" transparent visible={open} onRequestClose={onClose}>
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable style={styles.editorSheet}>
          <Text style={styles.editorKicker}>Temporary demo controls</Text>
          <Text style={styles.editorTitle}>Edit Demo Mode</Text>
          <Text style={styles.editorBody}>
            These controls only affect the temporary local preview. They do not write to the published event data or
            staff portal.
          </Text>
          <Pressable
            onPress={() => {
              refreshDemoTimeline();
              onClose();
            }}
            style={({ pressed }) => [styles.editorPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.editorPrimaryText}>Refresh Live Timeline</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setDemoEnabled(false);
              onClose();
            }}
            style={({ pressed }) => [styles.editorSecondary, pressed && styles.pressed]}
          >
            <Text style={styles.editorSecondaryText}>Exit Demo Mode</Text>
          </Pressable>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.editorClose, pressed && styles.pressed]}>
            <Text style={styles.editorCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createLiveDemoSnapshot(now: Date) {
  const currentStart = shiftMinutes(now, -24);
  const currentEnd = shiftMinutes(now, 42);
  const nextStart = shiftMinutes(currentEnd, 15);
  const thirdStart = shiftMinutes(nextStart, 105);
  const eveningStart = shiftMinutes(nextStart, 285);

  const locations = [
    {
      id: LOCATION_IDS.theater,
      eventId: canonicalSnapshot.event.id,
      name: "Encore Theater",
      description: "Main-stage programming, keynote conversations, music, and award moments.",
      mapX: 0.48,
      mapY: 0.24
    },
    {
      id: LOCATION_IDS.gallery,
      eventId: canonicalSnapshot.event.id,
      name: "Summit Gallery",
      description: "Connection lounge, partner exhibits, hydration, and attendee support.",
      mapX: 0.68,
      mapY: 0.52
    },
    {
      id: LOCATION_IDS.lounge,
      eventId: canonicalSnapshot.event.id,
      name: "Reflection Lounge",
      description: "Quiet decompression space for meditation, journaling, and reset breaks.",
      mapX: 0.26,
      mapY: 0.58
    },
    {
      id: LOCATION_IDS.terrace,
      eventId: canonicalSnapshot.event.id,
      name: "Terrace Salon",
      description: "Smaller-group workshops, private dinners, and hosted conversations.",
      mapX: 0.54,
      mapY: 0.78
    }
  ];

  const scheduleItems: ScheduleItem[] = [
    createScheduleItem({
      id: "13455f3a-c1ce-40fa-bce8-601ee2f98e72",
      title: demoSpeaker.session,
      shortTitle: "Wozniak Live",
      summary: "A live demo keynote on technology, humanity, resilience, and building tools that help people feel less alone.",
      description:
        "Temporary demo session. This is sample content designed to show how the live attendee app will guide guests during an active summit moment.",
      start: currentStart,
      end: currentEnd,
      locationId: LOCATION_IDS.theater,
      locationName: "Encore Theater",
      speakerIds: [SPEAKER_IDS.steveWozniak],
      featured: true,
      offsets: [10, 30]
    }),
    createScheduleItem({
      id: "4126e6b4-d451-4d6a-98da-659c6b4a6bda",
      title: "Designing Calm in a Noisy World",
      shortTitle: "Designing Calm",
      summary: "A panel on practical mental health tools, youth leadership, and daily rituals that scale.",
      description:
        "Temporary demo session. Panel content, speaker names, and timing will be replaced with approved event details.",
      start: nextStart,
      end: shiftMinutes(nextStart, 60),
      locationId: LOCATION_IDS.theater,
      locationName: "Encore Theater",
      speakerIds: [SPEAKER_IDS.panel],
      featured: true,
      offsets: [10]
    }),
    createScheduleItem({
      id: "279ceca1-c875-4130-b430-940b91324f0e",
      title: "Guided Reset and Breathwork",
      shortTitle: "Guided Reset",
      summary: "A quiet reset between major sessions with breathwork, reflection, and optional journaling.",
      description:
        "Temporary demo session. This illustrates how wellness breaks and quiet spaces can appear in the live event guide.",
      start: thirdStart,
      end: shiftMinutes(thirdStart, 35),
      locationId: LOCATION_IDS.lounge,
      locationName: "Reflection Lounge",
      speakerIds: [],
      featured: false,
      offsets: [5]
    }),
    createScheduleItem({
      id: "fb3f3898-e9d5-499b-ad7c-5750148976cb",
      title: "Founder Circle Reception",
      shortTitle: "Founder Reception",
      summary: "An evening reception for invited guests, hosts, and partners.",
      description:
        "Temporary demo session. Access rules demonstrate how restricted events can appear without exposing private details broadly.",
      start: eveningStart,
      end: shiftMinutes(eveningStart, 95),
      locationId: LOCATION_IDS.terrace,
      locationName: "Terrace Salon",
      speakerIds: [],
      featured: false,
      offsets: [30],
      visibilityId: "founders",
      visibilityLabel: "Founders only"
    })
  ];

  return {
    nowUtc: now.toISOString(),
    snapshot: eventSnapshotSchema.parse({
      ...canonicalSnapshot,
      revision: canonicalSnapshot.revision + 1,
      serverTimeUtc: now.toISOString(),
      locations,
      scheduleItems
    })
  };
}

function createScheduleItem({
  id,
  title,
  shortTitle,
  summary,
  description,
  start,
  end,
  locationId,
  locationName,
  speakerIds,
  featured,
  offsets,
  visibilityId = "public",
  visibilityLabel = "All attendees"
}: {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  locationId: string;
  locationName: string;
  speakerIds: string[];
  featured: boolean;
  offsets: number[];
  visibilityId?: string;
  visibilityLabel?: string;
}): ScheduleItem {
  return {
    id,
    eventId: canonicalSnapshot.event.id,
    title,
    shortTitle,
    summary,
    description,
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    eventTimeZone: canonicalSnapshot.event.timeZone,
    dayOrder: 0,
    locationId,
    locationName,
    speakerIds,
    status: "scheduled",
    visibilityScope: { id: visibilityId, label: visibilityLabel },
    eligibilityScope: { id: visibilityId, label: visibilityLabel },
    notificationScope: { id: visibilityId, label: visibilityLabel },
    notificationOffsetsMinutes: offsets,
    featured,
    published: true,
    revision: 1,
    updatedAt: start.toISOString(),
    publishedAt: start.toISOString()
  };
}

function shiftMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function createClientUuid(input: string) {
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(2, 5)}-${hex}${hex.slice(0, 4)}`;
}

function getExpoProjectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

const styles = StyleSheet.create({
  host: {
    flex: 1
  },
  dockWrap: {
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  dockButton: {
    borderColor: "rgba(230, 192, 111, 0.28)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    width: 172
  },
  dockGradient: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dockGradientOff: {
    backgroundColor: "rgba(9, 15, 36, 0.94)"
  },
  dockGradientOn: {
    backgroundColor: colors.gold
  },
  dockLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800"
  },
  dockLabelOn: {
    color: colors.midnight
  },
  dockMeta: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase"
  },
  dockMetaOn: {
    color: "#332405"
  },
  pressed: {
    opacity: 0.84
  },
  modalScrim: {
    backgroundColor: "rgba(0, 0, 0, 0.54)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  editorSheet: {
    backgroundColor: colors.surface,
    borderColor: "rgba(230, 192, 111, 0.26)",
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.lg
  },
  editorKicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  editorTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 30,
    lineHeight: 35,
    marginTop: spacing.xs
  },
  editorBody: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  editorPrimary: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingVertical: spacing.md
  },
  editorPrimaryText: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  editorSecondary: {
    alignItems: "center",
    borderColor: colors.gold,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingVertical: spacing.md
  },
  editorSecondaryText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  editorClose: {
    alignItems: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.sm
  },
  editorCloseText: {
    color: colors.body,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "600"
  }
});
