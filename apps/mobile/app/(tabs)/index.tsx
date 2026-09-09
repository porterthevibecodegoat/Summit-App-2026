import { Link } from "expo-router";
import { useState } from "react";
import { Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { getNowAndUpcoming, toEventTimeRange } from "@not-alone/domain";
import type { ScheduleItem } from "@not-alone/validation";
import { DemoModeControl, demoSpeaker, useSummitDemo } from "../../components/demo-mode";

const summitArt = require("../../assets/summit-art-v2.png");

const homePrompts = ["What should I do now?", "Where is the next session?"];

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    demoAvailable,
    demoEnabled,
    snapshot,
    nowUtc,
    setDemoEnabled,
    lastSuccessfulSyncAt,
    lastRevisionUpdateAt,
    syncing,
    syncError,
    refreshPublishedSnapshot
  } = useSummitDemo();
  const { current, upcoming } = getNowAndUpcoming({
    audienceGroups: ["public"],
    nowUtc,
    snapshot
  });
  const currentItem = current[0];
  const nextItem = upcoming[0];

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshPublishedSnapshot();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.gold}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{snapshot.event.organizationName}</Text>
          <Text style={styles.headerTitle}>Home</Text>
          <Text style={styles.headerMeta}>{snapshot.event.dateLabel} · {snapshot.event.venueName}</Text>
        </View>

        <View style={styles.syncStrip}>
          <View style={[styles.syncDot, syncError ? styles.syncDotWarn : styles.syncDotReady]} />
          <Text style={styles.syncText}>
            {demoEnabled
              ? "Previewing an event-day timeline."
              : syncing
                ? "Checking for the latest schedule."
              : syncError
                ? "Using saved schedule while reconnecting."
                : lastRevisionUpdateAt
                  ? `New schedule received ${formatSyncTime(lastRevisionUpdateAt)}`
                : lastSuccessfulSyncAt
                  ? `Schedule updated ${formatSyncTime(lastSuccessfulSyncAt)}`
                  : "Your event guide is ready."}
          </Text>
        </View>

        {currentItem ? (
          <LiveSessionCard demoEnabled={demoEnabled} item={currentItem} />
        ) : (
          <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.liveImage} style={styles.liveShell}>
            <View style={styles.liveScrim}>
              <Text style={styles.liveKicker}>Welcome to the summit</Text>
              <Text style={styles.waitingTitle}>You are not alone.</Text>
              <Text style={styles.waitingBody}>
                {snapshot.scheduleItems.length > 0
                  ? "Your schedule, venue guide, and event information are together in one place."
                  : "Programming will appear here as soon as the event team publishes it."}
              </Text>
              {demoAvailable ? (
                <Pressable onPress={() => setDemoEnabled(true)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonText}>Preview Live Demo</Text>
                </Pressable>
              ) : null}
            </View>
          </ImageBackground>
        )}

        <View style={styles.quickPanel}>
          <Text style={styles.panelLabel}>Your summit day</Text>
          <MiniStatus
            title="Up next"
            value={nextItem ? nextItem.title : demoEnabled ? "No additional demo session queued" : "Schedule coming soon"}
            meta={nextItem ? toEventTimeRange(nextItem, snapshot.event.timeZone) : "Temporary details pending"}
            href={nextItem ? { pathname: "/session/[id]", params: { id: nextItem.id } } : "/schedule"}
          />
          <View style={styles.divider} />
          <View style={styles.aiBlock}>
            <View style={styles.aiHeader}>
              <View>
                <Text style={styles.panelLabel}>Ask AI concierge</Text>
                <Text style={styles.aiTitle}>Fast answers, grounded in the agenda.</Text>
              </View>
              <Link href="/help" asChild>
                <Pressable style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
                  <Text style={styles.smallButtonText}>Ask</Text>
                </Pressable>
              </Link>
            </View>
            <View style={styles.promptRow}>
              {homePrompts.map((prompt) => (
                <Link key={prompt} href="/help" asChild>
                  <Pressable style={({ pressed }) => [styles.promptChip, pressed && styles.pressed]}>
                    <Text style={styles.promptText}>{prompt}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.toolsPanel}>
          <ToolPill href="/schedule" label="Schedule" value={`${snapshot.scheduleItems.length} sessions`} />
          <ToolPill href="/map" label="Map" value={snapshot.event.venueName} />
          <ToolPill href="/help" label="Help" value="Concierge" />
        </View>

        <DemoModeControl />
      </ScrollView>
    </SafeAreaView>
  );
}

function LiveSessionCard({ demoEnabled, item }: { demoEnabled: boolean; item: ScheduleItem }) {
  return (
    <Link href={{ pathname: "/session/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.liveShell, pressed && styles.pressed]}>
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.liveImage} style={styles.liveBackground}>
          <View style={styles.liveScrim}>
            <View style={styles.liveTop}>
              <View style={styles.liveTopText}>
                <Text style={styles.liveKicker}>Live now</Text>
                <Text style={styles.liveTime}>{toEventTimeRange(item, item.eventTimeZone)}</Text>
              </View>
              {demoEnabled ? (
                <View style={styles.portraitFrame}>
                  <Image source={demoSpeaker.image} resizeMode="cover" style={styles.portrait} />
                </View>
              ) : null}
            </View>
            <Text style={styles.sessionTitle}>{item.title}</Text>
            {demoEnabled ? <Text style={styles.speakerLine}>With {demoSpeaker.name} · {demoSpeaker.role}</Text> : null}
            <Text style={styles.sessionSummary} numberOfLines={2}>{item.summary}</Text>
            <View style={styles.liveFooter}>
              <Text style={styles.locationText}>{item.locationName}</Text>
              <Text style={styles.accessText}>{item.visibilityScope.label}</Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Link>
  );
}

function MiniStatus({
  title,
  value,
  meta,
  href
}: {
  title: string;
  value: string;
  meta: string;
  href: "/schedule" | { pathname: "/session/[id]"; params: { id: string } };
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.miniStatus, pressed && styles.pressed]}>
        <View style={styles.statusRail}>
          <Text style={styles.statusRailText}>Next</Text>
        </View>
        <View style={styles.statusText}>
          <Text style={styles.panelLabel}>{title}</Text>
          <Text style={styles.statusTitle} numberOfLines={2}>{value}</Text>
          <Text style={styles.statusMeta}>{meta}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

function ToolPill({ href, label, value }: { href: "/schedule" | "/map" | "/help"; label: string; value: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.toolPill, pressed && styles.pressed]}>
        <Text style={styles.toolLabel}>{label}</Text>
        <Text style={styles.toolValue} numberOfLines={1}>{value}</Text>
      </Pressable>
    </Link>
  );
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1
  },
  screen: {
    backgroundColor: colors.canvas
  },
  content: {
    paddingBottom: 112
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 30,
    marginTop: 2
  },
  headerMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 2
  },
  syncStrip: {
    alignItems: "center",
    backgroundColor: "rgba(13, 21, 48, 0.74)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  syncDot: {
    borderRadius: 8,
    height: 8,
    width: 8
  },
  syncDotReady: {
    backgroundColor: colors.gold
  },
  syncDotWarn: {
    backgroundColor: colors.warning
  },
  syncText: {
    color: colors.body,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 12,
    fontWeight: "500"
  },
  revisionText: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  liveShell: {
    backgroundColor: colors.surface,
    borderColor: "rgba(230, 192, 111, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    overflow: "hidden"
  },
  liveBackground: {
    minHeight: 0
  },
  liveImage: {
    opacity: 0.58
  },
  liveScrim: {
    backgroundColor: "rgba(5, 10, 30, 0.72)",
    padding: spacing.lg
  },
  liveTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 124
  },
  liveTopText: {
    flex: 1,
    paddingRight: spacing.md
  },
  liveKicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  liveTime: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: spacing.sm
  },
  portraitFrame: {
    backgroundColor: "#080E25",
    borderColor: "rgba(230, 192, 111, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    height: 124,
    overflow: "hidden",
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: 96
  },
  portrait: {
    height: "100%",
    width: "100%"
  },
  speakerLine: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    marginTop: spacing.xs,
    lineHeight: 19
  },
  sessionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 29,
    marginTop: spacing.sm
  },
  sessionSummary: {
    color: colors.body,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  liveFooter: {
    alignItems: "center",
    borderTopColor: "rgba(220, 229, 245, 0.14)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md
  },
  locationText: {
    color: colors.surfaceMuted,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "600",
    paddingRight: spacing.sm
  },
  accessText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  waitingTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 37,
    marginTop: spacing.xl,
    maxWidth: 260
  },
  waitingBody: {
    color: colors.body,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  quickPanel: {
    backgroundColor: "rgba(13, 21, 48, 0.9)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  miniStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  statusRail: {
    alignItems: "center",
    backgroundColor: colors.goldSoft,
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 58
  },
  statusRailText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statusText: {
    flex: 1
  },
  panelLabel: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  statusTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 3
  },
  statusMeta: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.lg
  },
  aiBlock: {
    gap: spacing.md
  },
  aiHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  aiTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
    marginTop: 3,
    maxWidth: 230
  },
  smallButton: {
    alignItems: "center",
    borderColor: "rgba(230, 192, 111, 0.46)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 58
  },
  smallButtonText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  promptChip: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(220, 229, 245, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  promptText: {
    color: colors.surfaceMuted,
    fontFamily: typography.medium,
    fontSize: 12,
    fontWeight: "500"
  },
  toolsPanel: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  toolPill: {
    backgroundColor: "rgba(13, 21, 48, 0.82)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: spacing.md
  },
  toolLabel: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  toolValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  pressed: {
    opacity: 0.84
  }
});
