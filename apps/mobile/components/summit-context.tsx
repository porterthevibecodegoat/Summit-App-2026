import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchPublishedSnapshot } from "@not-alone/api-client";
import { publicAppConfig } from "@not-alone/config";
import { demoSnapshot as canonicalSnapshot } from "@not-alone/test-fixtures";
import { eventSnapshotSchema, type EventSnapshot } from "@not-alone/validation";
import { mobileApiBaseUrl } from "../lib/mobile-api";
import { selectCachedSnapshot, selectPublishedSnapshot } from "../lib/snapshot-sync";

const PUBLISHED_SNAPSHOT_CACHE_KEY = "not-alone.published-snapshot-cache.v1";
const SNAPSHOT_REFRESH_MS = 60000;
const CLOCK_REFRESH_MS = 15000;
const pushDeliveryEnabled = Constants.expoConfig?.extra?.pushDeliveryEnabled === true ||
  publicAppConfig.featureFlags.pushDelivery;

type SummitContextValue = {
  snapshot: EventSnapshot;
  nowUtc: string;
  lastSuccessfulSyncAt: string | undefined;
  lastRevisionUpdateAt: string | undefined;
  syncing: boolean;
  syncError: string | undefined;
  refreshPublishedSnapshot: () => Promise<void>;
};

const SummitContext = createContext<SummitContextValue | undefined>(undefined);

export function SummitProvider({ children }: PropsWithChildren) {
  const [publishedSnapshot, setPublishedSnapshot] = useState<EventSnapshot | null>(null);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | undefined>();
  const [lastRevisionUpdateAt, setLastRevisionUpdateAt] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | undefined>();
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const mountedRef = useRef(true);
  const syncInFlightRef = useRef(false);
  const publishedSnapshotRef = useRef<EventSnapshot | null>(null);
  const snapshot = publishedSnapshot ?? canonicalSnapshot;
  const nowUtc = new Date(clockTick + serverClockOffsetMs).toISOString();

  const syncPublishedSnapshot = useCallback(async () => {
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    if (mountedRef.current) {
      setSyncing(true);
    }

    try {
      const remoteSnapshot = await fetchPublishedSnapshot(mobileApiBaseUrl, { timeoutMs: 6000 });
      const syncedAt = new Date().toISOString();
      if (!mountedRef.current) {
        return;
      }

      const currentSnapshot = publishedSnapshotRef.current;
      const selection = selectPublishedSnapshot(currentSnapshot, remoteSnapshot);
      if (selection.rejectedStaleRevision !== undefined) {
        setSyncError(
          `The server returned older revision ${selection.rejectedStaleRevision}; keeping revision ${selection.snapshot.revision}.`
        );
        return;
      }

      if (selection.advanced) {
        setLastRevisionUpdateAt(syncedAt);
      }
      setPublishedSnapshot(selection.snapshot);
      publishedSnapshotRef.current = selection.snapshot;
      setServerClockOffsetMs(new Date(remoteSnapshot.serverTimeUtc).getTime() - Date.now());
      setLastSuccessfulSyncAt(syncedAt);
      setSyncError(undefined);
      void AsyncStorage.setItem(
        PUBLISHED_SNAPSHOT_CACHE_KEY,
        JSON.stringify({ snapshot: remoteSnapshot, syncedAt })
      ).catch(() => undefined);
    } catch (error) {
      if (mountedRef.current) {
        setSyncError(error instanceof Error ? error.message : "Unable to synchronize the published event snapshot.");
      }
    } finally {
      syncInFlightRef.current = false;
      if (mountedRef.current) {
        setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function loadCachedSnapshot() {
      try {
        const cached = await AsyncStorage.getItem(PUBLISHED_SNAPSHOT_CACHE_KEY);
        if (!mountedRef.current || !cached) {
          return;
        }

        const cachedValue = JSON.parse(cached) as { snapshot?: unknown; syncedAt?: unknown };
        const parsed = eventSnapshotSchema.parse(cachedValue.snapshot ?? cachedValue);
        const selection = selectCachedSnapshot(publishedSnapshotRef.current, parsed);
        if (selection.snapshot !== parsed) {
          return;
        }
        setPublishedSnapshot(selection.snapshot);
        publishedSnapshotRef.current = selection.snapshot;
        setLastSuccessfulSyncAt(typeof cachedValue.syncedAt === "string" ? cachedValue.syncedAt : undefined);
        setServerClockOffsetMs(0);
      } catch {
        // Invalid local cache should not block the bundled fallback or a fresh API sync.
        void AsyncStorage.removeItem(PUBLISHED_SNAPSHOT_CACHE_KEY).catch(() => undefined);
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
      mountedRef.current = false;
      subscription.remove();
      clearInterval(interval);
    };
  }, [syncPublishedSnapshot]);

  useEffect(() => {
    const interval = setInterval(() => setClockTick(Date.now()), CLOCK_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let active = true;
    let removeListener: (() => void) | undefined;
    void import("expo-notifications").then((Notifications) => {
      if (!active) return;
      const subscription = Notifications.addNotificationResponseReceivedListener(() => {
        void syncPublishedSnapshot();
      });
      removeListener = () => subscription.remove();
    });

    return () => {
      active = false;
      removeListener?.();
    };
  }, [syncPublishedSnapshot]);

  useEffect(() => {
    void AsyncStorage.removeItem("not-alone.saved-session-ids.v1").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!pushDeliveryEnabled || Platform.OS !== "ios") {
      return;
    }

    let active = true;

    async function registerForPushDelivery() {
      try {
        const Notifications = await import("expo-notifications");
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

        const response = await fetch(`${mobileApiBaseUrl}/api/devices/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: createClientUuid(token.data),
            eventId: publicAppConfig.eventId,
            expoPushToken: token.data,
            audienceGroups: ["public"],
            platform: "ios",
            appVersion: Constants.nativeAppVersion ?? "1.0.0",
            lastSeenAt: new Date().toISOString()
          })
        });
        if (!response.ok) {
          throw new Error(`Device registration failed with status ${response.status}.`);
        }
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
      snapshot,
      nowUtc,
      lastSuccessfulSyncAt,
      lastRevisionUpdateAt,
      syncing,
      syncError,
      refreshPublishedSnapshot: syncPublishedSnapshot
    }),
    [
      snapshot,
      nowUtc,
      lastSuccessfulSyncAt,
      lastRevisionUpdateAt,
      syncing,
      syncError,
      syncPublishedSnapshot
    ]
  );

  return (
    <SummitContext.Provider value={value}>
      <View style={styles.host}>{children}</View>
    </SummitContext.Provider>
  );
}

export function useSummit() {
  const context = useContext(SummitContext);

  if (!context) {
    throw new Error("useSummit must be used inside SummitProvider");
  }

  return context;
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
  }
});
