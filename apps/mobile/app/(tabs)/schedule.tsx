import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { groupScheduleByEventDay } from "@not-alone/domain";
import type { ScheduleItem } from "@not-alone/validation";
import { useSummitDemo } from "../../components/demo-mode";

export default function ScheduleScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    demoAvailable,
    demoEnabled,
    snapshot,
    setDemoEnabled,
    isSessionSaved,
    savedSessionIds,
    refreshPublishedSnapshot
  } = useSummitDemo();
  const [scheduleMode, setScheduleMode] = useState<"all" | "saved">("all");
  const visibleItems = useMemo(
    () => scheduleMode === "saved"
      ? snapshot.scheduleItems.filter((item) => savedSessionIds.includes(item.id))
      : snapshot.scheduleItems,
    [savedSessionIds, scheduleMode, snapshot.scheduleItems]
  );
  const groups = useMemo(() => groupScheduleByEventDay(visibleItems), [visibleItems]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const selectedGroup = groups[Math.min(selectedDayIndex, Math.max(groups.length - 1, 0))];

  useEffect(() => {
    if (selectedDayIndex >= groups.length) {
      setSelectedDayIndex(0);
    }
  }, [groups.length, selectedDayIndex]);

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
          <View style={styles.headerTopline}>
            <Text style={styles.kicker}>{demoEnabled ? "Live demo" : "Summit agenda"}</Text>
            <View style={styles.headerCount}>
              <Text style={styles.headerCountText}>{snapshot.scheduleItems.length} sessions</Text>
            </View>
          </View>
          <Text style={styles.title}>Plan your time</Text>
          <Text style={styles.headerBody}>
            {demoEnabled
              ? "A live-day preview of sessions, locations, and timing."
              : `${snapshot.event.dateLabel} at ${snapshot.event.venueName}`}
          </Text>
        </View>

        <View accessibilityRole="tablist" style={styles.modeControl}>
          <ModeButton
            active={scheduleMode === "all"}
            label="Full schedule"
            onPress={() => {
              setScheduleMode("all");
              setSelectedDayIndex(0);
            }}
          />
          <ModeButton
            active={scheduleMode === "saved"}
            label={`My schedule  ${savedSessionIds.length}`}
            onPress={() => {
              setScheduleMode("saved");
              setSelectedDayIndex(0);
            }}
          />
        </View>

        {groups.length === 0 ? (
          scheduleMode === "saved" ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>Build your personal agenda</Text>
              <Text style={styles.emptyBody}>Open any session and save it here for a focused view of your summit.</Text>
              <Pressable onPress={() => setScheduleMode("all")} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
                <Text style={styles.previewButtonText}>Browse all sessions</Text>
              </Pressable>
            </View>
          ) : (
            <EmptySchedule demoAvailable={demoAvailable} onPreview={() => setDemoEnabled(true)} timeZone={snapshot.event.timeZone} tracks={snapshot.event.tracks} />
          )
        ) : (
          <>
            <View accessibilityRole="tablist" style={styles.dayRail}>
              {groups.map((group, index) => {
                const day = parseDay(group.items[0]);
                const selected = selectedDayIndex === index;

                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={group.dayLabel}
                    onPress={() => setSelectedDayIndex(index)}
                    style={({ pressed }) => [
                      styles.dayTab,
                      selected && styles.dayTabActive,
                      pressed && styles.pressed
                    ]}
                  >
                    <Text style={[styles.dayName, selected && styles.dayNameActive]}>
                      {demoEnabled && index === 0 ? "Today" : day.weekday}
                    </Text>
                    <Text style={[styles.dayDate, selected && styles.dayDateActive]}>{day.date}</Text>
                    <Text style={[styles.dayCount, selected && styles.dayCountActive]}>
                      {group.items.length} {group.items.length === 1 ? "event" : "events"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedGroup ? (
              <View key={selectedGroup.dayLabel} style={styles.day}>
                <View style={styles.dayHeading}>
                  <View>
                    <Text style={styles.dayEyebrow}>Selected day</Text>
                    <Text style={styles.dayTitle}>{selectedGroup.dayLabel}</Text>
                  </View>
                  <Text style={styles.dayTotal}>{selectedGroup.items.length}</Text>
                </View>
                <View style={styles.timeline}>
                  {selectedGroup.items.map((item, index) => (
                    <ScheduleRow
                      key={`${item.id}-${item.startUtc}-${index}`}
                      item={item}
                      last={index === selectedGroup.items.length - 1}
                      saved={isSessionSaved(item.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptySchedule({
  demoAvailable,
  onPreview,
  timeZone,
  tracks
}: {
  demoAvailable: boolean;
  onPreview: () => void;
  timeZone: string;
  tracks: string[];
}) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>No sessions published yet</Text>
      <Text style={styles.emptyBody}>
        The schedule is ready for approved session data. Times will display in {timeZone} once records are published.
      </Text>
      {demoAvailable ? (
        <Pressable onPress={onPreview} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
          <Text style={styles.previewButtonText}>Preview demo schedule</Text>
        </Pressable>
      ) : null}
      <View style={styles.trackGrid}>
        {tracks.map((track) => (
          <View key={track} style={styles.trackPill}>
            <Text style={styles.trackText}>{track}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ScheduleRow({ item, last, saved }: { item: ScheduleItem; last: boolean; saved: boolean }) {
  const start = formatTime(item.startUtc, item.eventTimeZone);
  const end = formatTime(item.endUtc, item.eventTimeZone);
  const canceled = item.status === "canceled";

  return (
    <Link href={{ pathname: "/session/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.item, last && styles.itemLast, pressed && styles.pressed]}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeStart}>{start.time}</Text>
          <Text style={styles.timePeriod}>{start.period}</Text>
          <Text style={styles.timeEnd}>to {end.time}</Text>
          <View style={[styles.timelineDot, item.featured && styles.timelineDotFeatured]} />
          {!last ? <View style={styles.timelineLine} /> : null}
        </View>

        <View style={[styles.itemMain, item.featured && styles.itemMainFeatured, canceled && styles.itemMainCanceled]}>
          <View style={styles.badgeRow}>
            {item.featured ? <Text style={styles.featuredText}>Featured</Text> : null}
            {saved ? (
              <View style={styles.savedLabel}>
                <SymbolView name="bookmark.fill" size={11} tintColor={colors.gold} />
                <Text style={styles.savedText}>Saved</Text>
              </View>
            ) : null}
            {canceled ? <Text style={styles.canceledText}>Canceled</Text> : null}
          </View>

          <View style={styles.titleRow}>
            <Text numberOfLines={3} style={[styles.itemTitle, canceled && styles.itemTitleCanceled]}>{item.title}</Text>
            <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
          </View>

          <View style={styles.metaRow}>
            <SymbolView name="location.fill" size={12} tintColor={colors.gold} />
            <Text numberOfLines={1} style={styles.meta}>{item.locationName}</Text>
          </View>
          <Text numberOfLines={1} style={styles.access}>{item.visibilityScope.label}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

function parseDay(item: ScheduleItem | undefined) {
  if (!item) {
    return { weekday: "Day", date: "--" };
  }

  const date = new Date(item.startUtc);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: item.eventTimeZone }).format(date),
    date: new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: item.eventTimeZone }).format(date)
  };
}

function formatTime(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone
  }).formatToParts(new Date(iso));

  return {
    time: `${parts.find((part) => part.type === "hour")?.value ?? ""}:${parts.find((part) => part.type === "minute")?.value ?? ""}`,
    period: parts.find((part) => part.type === "dayPeriod")?.value ?? ""
  };
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  screen: { backgroundColor: colors.canvas },
  content: { paddingBottom: 116 },
  header: {
    borderBottomColor: "rgba(230, 192, 111, 0.2)",
    borderBottomWidth: 1,
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg
  },
  headerTopline: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  headerCount: {
    borderColor: "rgba(230, 192, 111, 0.28)",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  headerCountText: { color: colors.surfaceMuted, fontFamily: typography.semibold, fontSize: 11, fontWeight: "600" },
  title: {
    color: colors.ink,
    fontFamily: typography.displayRegular,
    fontSize: 34,
    fontWeight: "400",
    lineHeight: 40,
    marginTop: spacing.md
  },
  headerBody: {
    color: colors.body,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  modeControl: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: 4
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm
  },
  modeButtonActive: { backgroundColor: colors.gold },
  modeText: { color: colors.body, fontFamily: typography.semibold, fontSize: 12, fontWeight: "600" },
  modeTextActive: { color: colors.midnight, fontFamily: typography.bold, fontWeight: "700" },
  dayRail: { flexDirection: "row", gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  dayTab: {
    backgroundColor: "rgba(13, 21, 48, 0.7)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    padding: spacing.md
  },
  dayTabActive: { backgroundColor: "#F2D28B", borderColor: "#F2D28B" },
  dayName: { color: colors.body, fontFamily: typography.bold, fontSize: 12, fontWeight: "700" },
  dayNameActive: { color: colors.midnight },
  dayDate: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14, fontWeight: "600", marginTop: 3 },
  dayDateActive: { color: colors.midnight },
  dayCount: { color: colors.muted, fontSize: 10, marginTop: 6 },
  dayCountActive: { color: "rgba(5, 10, 30, 0.65)" },
  day: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  dayHeading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  dayEyebrow: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  dayTitle: { color: colors.ink, fontFamily: typography.displayRegular, fontSize: 23, fontWeight: "400", marginTop: spacing.xs },
  dayTotal: { color: colors.gold, fontFamily: typography.displayRegular, fontSize: 28, lineHeight: 31 },
  timeline: { gap: 0 },
  item: { flexDirection: "row", gap: spacing.md, minHeight: 132 },
  itemLast: { minHeight: 112 },
  timeColumn: { alignItems: "flex-start", paddingTop: spacing.md, position: "relative", width: 62 },
  timeStart: { color: colors.ink, fontFamily: typography.bold, fontSize: 14, fontWeight: "700" },
  timePeriod: { color: colors.gold, fontFamily: typography.bold, fontSize: 10, fontWeight: "700", marginTop: 1 },
  timeEnd: { color: colors.muted, fontSize: 10, marginTop: spacing.xs },
  timelineDot: {
    backgroundColor: colors.canvas,
    borderColor: colors.muted,
    borderRadius: 8,
    borderWidth: 2,
    height: 9,
    left: 53,
    position: "absolute",
    top: 17,
    width: 9,
    zIndex: 2
  },
  timelineDotFeatured: { backgroundColor: colors.gold, borderColor: colors.gold },
  timelineLine: { backgroundColor: colors.border, bottom: -18, left: 57, position: "absolute", top: 25, width: 1 },
  itemMain: {
    backgroundColor: "rgba(13, 21, 48, 0.78)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  itemMainFeatured: { backgroundColor: "rgba(26, 35, 66, 0.96)", borderColor: "rgba(230, 192, 111, 0.48)" },
  itemMainCanceled: { opacity: 0.62 },
  badgeRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 14 },
  featuredText: { color: colors.gold, fontFamily: typography.bold, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  savedLabel: { alignItems: "center", flexDirection: "row", gap: 4 },
  savedText: { color: colors.gold, fontFamily: typography.bold, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  canceledText: { color: colors.warning, fontFamily: typography.bold, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  titleRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  itemTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 21
  },
  itemTitleCanceled: { textDecorationLine: "line-through" },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: spacing.sm },
  meta: { color: colors.surfaceMuted, flex: 1, fontFamily: typography.medium, fontSize: 11, lineHeight: 16 },
  access: { color: colors.muted, fontSize: 10, marginTop: 5 },
  emptyPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  emptyTitle: { color: colors.ink, fontFamily: typography.displayRegular, fontSize: 24, fontWeight: "400" },
  emptyBody: { color: colors.body, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  previewButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  previewButtonText: { color: colors.midnight, fontFamily: typography.bold, fontSize: 12, fontWeight: "800" },
  trackGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  trackPill: { backgroundColor: colors.goldSoft, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  trackText: { color: colors.body, fontFamily: typography.semibold, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.8 }
});
