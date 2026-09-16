import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useRootNavigationState, useRouter } from "expo-router";
import type { NotificationResponse } from "expo-notifications";
import { useSummit } from "./summit-context";
import { notificationTarget } from "../lib/notification-target";

export function NotificationNavigation() {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const { snapshot, refreshPublishedSnapshot } = useSummit();
  const seen = useRef<string | null>(null);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    let remove: (() => void) | undefined;
    void import("expo-notifications").then(async notifications => {
      const handle = async (response: NotificationResponse | null) => {
        if (!active || !response || response.actionIdentifier !== notifications.DEFAULT_ACTION_IDENTIFIER) return;
        const request = response.notification.request;
        if (seen.current === request.identifier) return;
        seen.current = request.identifier;
        await refreshPublishedSnapshot();
        if (active) setPending(request.content.data ?? {});
        await notifications.clearLastNotificationResponseAsync();
      };
      if (!active) return;
      const subscription = notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(() => undefined); });
      remove = () => subscription.remove();
      await handle(await notifications.getLastNotificationResponseAsync());
    }).catch(() => undefined);
    return () => { active = false; remove?.(); };
  }, [refreshPublishedSnapshot]);

  useEffect(() => {
    if (!pending || !navigation?.key) return;
    const target = notificationTarget(pending, snapshot);
    setPending(null);
    if (target) router.push(target);
  }, [navigation?.key, pending, router, snapshot]);
  return null;
}
