import { Link } from "expo-router";
import { ChevronRight, Clock3, MapPin } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { getEventPhase, getJumpToNowItem, getSessionTemporalState, groupScheduleByEventDay, type SessionTemporalState } from "@not-alone/domain";
import type { ScheduleItem } from "@not-alone/validation";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout, type ResponsiveLayout } from "../../components/responsive-layout";

export default function ScheduleScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const layout = useResponsiveLayout();
  const { snapshot, nowUtc, refreshPublishedSnapshot } = useSummit();
  const scrollRef = useRef<ScrollView>(null);
  const daySectionY = useRef(0);
  const timelineY = useRef(0);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const groups = useMemo(() => groupScheduleByEventDay(snapshot.scheduleItems), [snapshot.scheduleItems]);
  const eventPhase = getEventPhase(snapshot, nowUtc);
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

  function jumpToNow() {
    const target = getJumpToNowItem(snapshot.scheduleItems, nowUtc);
    if (!target) return;
    const targetIndex = groups.findIndex((group) => group.items.some((item) => item.id === target.id));
    setSelectedDayIndex(Math.max(targetIndex, 0));
    setJumpTargetId(target.id);
  }

  function handleJumpTargetLayout(groupY: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(daySectionY.current + timelineY.current + groupY - spacing.md, 0),
        animated: true
      });
      setJumpTargetId(null);
    }, 50);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={layout.contentStyle}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.gold}
          />
        }
      >
        <View style={[styles.header, layout.paddingStyle]}>
          <View style={styles.headerTopline}>
            <Text style={styles.kicker}>Summit agenda</Text>
            <View style={styles.headerCount}>
              <Text style={styles.headerCountText}>{snapshot.scheduleItems.length} sessions</Text>
            </View>
          </View>
          <Text style={styles.title}>Event schedule</Text>
          <Text style={styles.headerBody}>{snapshot.event.dateLabel} at {snapshot.event.venueName}</Text>
        </View>

        <Pressable
          accessibilityLabel="Jump to the session closest to the current time"
          accessibilityRole="button"
          disabled={snapshot.scheduleItems.length === 0}
          onPress={jumpToNow}
          style={({ pressed }) => [styles.jumpButton, layout.marginStyle, pressed && styles.pressed, snapshot.scheduleItems.length === 0 && styles.jumpButtonDisabled]}
        >
          <Clock3 color={colors.gold} size={15} strokeWidth={2.4} />
          <Text style={styles.jumpButtonText}>Jump to now</Text>
        </Pressable>

        {eventPhase === "after" ? (
          <View style={[styles.eventCompleteBanner, layout.marginStyle, layout.cardPaddingStyle]}>
            <Text style={styles.eventCompleteKicker}>Event complete</Text>
            <Text style={styles.eventCompleteTitle}>Thank you for being part of the summit.</Text>
            <Text style={styles.eventCompleteBody}>The full agenda remains available for reference.</Text>
          </View>
        ) : null}

        {groups.length === 0 ? (
          <EmptySchedule layout={layout} timeZone={snapshot.event.timeZone} tracks={snapshot.event.tracks} />
        ) : (
          <>
            <View accessibilityRole="tablist" style={[styles.dayRail, layout.marginStyle]}>
              {groups.map((group, index) => {
                const day = parseDay(group.items[0]);
                const selected = selectedDayIndex === index;

                return (
                  <Pressable
                    accessibilityLabel={`${day.weekday}, ${day.date}, ${group.items.length} events`}
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
                      {day.weekday}
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
              <View key={selectedGroup.dayLabel} onLayout={(event) => { daySectionY.current = event.nativeEvent.layout.y; }} style={[styles.day, layout.paddingStyle]}>
                <View style={styles.dayHeading}>
                  <View>
                    <Text style={styles.dayEyebrow}>Selected day</Text>
                    <Text style={styles.dayTitle}>{selectedGroup.dayLabel}</Text>
                  </View>
                  <Text style={styles.dayTotal}>{selectedGroup.items.length}</Text>
                </View>
                <View onLayout={(event) => { timelineY.current = event.nativeEvent.layout.y; }} style={styles.timeline}>
                  {groupItemsByStart(selectedGroup.items).map((items, index, timeGroups) => (
                    <ScheduleTimeGroup
                      key={items[0]?.startUtc}
                      items={items}
                      last={index === timeGroups.length - 1}
                      nowUtc={nowUtc}
                      onJumpTargetLayout={items.some((item) => item.id === jumpTargetId) ? handleJumpTargetLayout : undefined}
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

function EmptySchedule({ layout, timeZone, tracks }: { layout: ResponsiveLayout; timeZone: string; tracks: string[] }) {
  return (
    <View style={[styles.emptyPanel, layout.marginStyle, layout.cardPaddingStyle]}>
      <Text style={styles.emptyTitle}>No sessions published yet</Text>
      <Text style={styles.emptyBody}>
        The schedule is ready for approved session data. Times will display in {timeZone} once records are published.
      </Text>
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

function ScheduleTimeGroup({
  items,
  last,
  nowUtc,
  onJumpTargetLayout
}: {
  items: ScheduleItem[];
  last: boolean;
  nowUtc: string;
  onJumpTargetLayout?: ((y: number) => void) | undefined;
}) {
  const firstItem = items[0];
  const layout = useResponsiveLayout();

  if (!firstItem) {
    return null;
  }

  const start = formatTime(firstItem.startUtc, firstItem.eventTimeZone);
  const states = items.map((item) => getSessionTemporalState(item, nowUtc));
  const groupState: SessionTemporalState = states.includes("current")
    ? "current"
    : states.every((state) => state === "completed" || state === "canceled") ? "completed" : "upcoming";

  return (
    <View
      onLayout={onJumpTargetLayout ? (event) => onJumpTargetLayout(event.nativeEvent.layout.y) : undefined}
      style={[styles.timeGroup, layout.compact && styles.timeGroupCompact, last && styles.timeGroupLast]}
    >
      <View style={[styles.timeColumn, layout.compact && styles.timeColumnCompact]}>
        <Text style={styles.timeStart}>{start.time}</Text>
        <Text style={styles.timePeriod}>{start.period}</Text>
        <View style={[styles.timelineDot, layout.compact && styles.timelineDotCompact, groupState === "current" && styles.timelineDotCurrent, groupState === "completed" && styles.timelineDotCompleted, items.some((item) => item.featured) && groupState === "upcoming" && styles.timelineDotFeatured]} />
        {!last ? <View style={[styles.timelineLine, layout.compact && styles.timelineLineCompact, groupState === "completed" && styles.timelineLineCompleted]} /> : null}
      </View>

      <View style={styles.itemStack}>
        {items.map((item) => (
          <ScheduleCard compact={layout.compact} key={item.id} item={item} nowUtc={nowUtc} />
        ))}
      </View>
    </View>
  );
}

function ScheduleCard({ compact, item, nowUtc }: { compact: boolean; item: ScheduleItem; nowUtc: string }) {
  const start = formatTime(item.startUtc, item.eventTimeZone);
  const end = formatTime(item.endUtc, item.eventTimeZone);
  const canceled = item.status === "canceled";
  const temporalState = getSessionTemporalState(item, nowUtc);
  const completed = temporalState === "completed";
  const current = temporalState === "current";

  return (
    <Link href={{ pathname: "/session/[id]", params: { id: item.id } }} asChild>
      <Pressable
        accessibilityLabel={`${canceled ? "Canceled. " : current ? "Live now. " : completed ? "Completed. " : "Upcoming. "}${start.time} ${start.period} to ${end.time} ${end.period}. ${item.title}. ${item.locationName}. ${item.visibilityScope.label}`}
        accessibilityRole="button"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={[styles.itemMain, item.featured && !completed && styles.itemMainFeatured, current && styles.itemMainCurrent, completed && styles.itemMainCompleted, canceled && styles.itemMainCanceled]}>
          <View style={styles.badgeRow}>
            <View style={styles.statusRow}>
              {item.featured && !completed ? <Text style={styles.featuredText}>Featured</Text> : null}
              {current ? <Text style={styles.liveNowText}>Live now</Text> : null}
              {completed ? <Text style={styles.completedText}>Completed</Text> : null}
              {canceled ? <Text style={styles.canceledText}>Canceled</Text> : null}
            </View>
            <Text style={styles.endTime}>Until {end.time} {end.period}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text numberOfLines={compact ? 4 : 3} style={[styles.itemTitle, canceled && styles.itemTitleCanceled]}>{item.title}</Text>
            <ChevronRight color={colors.muted} size={14} strokeWidth={2.2} />
          </View>

          <View style={styles.metaRow}>
            <MapPin color={colors.gold} size={12} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.meta}>{item.locationName}</Text>
          </View>
          <Text numberOfLines={1} style={styles.access}>{item.visibilityScope.label}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

function groupItemsByStart(items: ScheduleItem[]) {
  return items.reduce<ScheduleItem[][]>((timeGroups, item) => {
    const currentGroup = timeGroups[timeGroups.length - 1];

    if (currentGroup?.[0]?.startUtc === item.startUtc) {
      currentGroup.push(item);
    } else {
      timeGroups.push([item]);
    }

    return timeGroups;
  }, []);
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
  jumpButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderColor: "rgba(230, 192, 111, 0.38)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  jumpButtonDisabled: { opacity: 0.4 },
  jumpButtonText: { color: colors.gold, fontFamily: typography.bold, fontSize: 12, fontWeight: "700" },
  eventCompleteBanner: {
    backgroundColor: "rgba(230, 192, 111, 0.08)",
    borderColor: "rgba(230, 192, 111, 0.3)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg
  },
  eventCompleteKicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  eventCompleteTitle: {
    color: colors.ink,
    fontFamily: typography.displayRegular,
    fontSize: 22,
    lineHeight: 28,
    marginTop: spacing.xs
  },
  eventCompleteBody: { color: colors.body, fontFamily: typography.body, fontSize: 13, lineHeight: 20, marginTop: spacing.xs },
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
  timeGroup: { alignItems: "stretch", flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  timeGroupCompact: { gap: spacing.sm },
  timeGroupLast: { marginBottom: 0 },
  timeColumn: { alignItems: "flex-start", paddingTop: spacing.md, position: "relative", width: 62 },
  timeColumnCompact: { width: 50 },
  timeStart: { color: colors.ink, fontFamily: typography.bold, fontSize: 14, fontWeight: "700" },
  timePeriod: { color: colors.gold, fontFamily: typography.bold, fontSize: 10, fontWeight: "700", marginTop: 1 },
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
  timelineDotCompact: { left: 41 },
  timelineDotCurrent: {
    backgroundColor: colors.gold,
    borderColor: "#FFF4D5",
    shadowColor: colors.gold,
    shadowOpacity: 0.65,
    shadowRadius: 5
  },
  timelineDotCompleted: { backgroundColor: colors.muted, borderColor: colors.muted },
  timelineLine: { backgroundColor: colors.border, bottom: -spacing.md, left: 57, position: "absolute", top: 25, width: 1 },
  timelineLineCompact: { left: 45 },
  timelineLineCompleted: { backgroundColor: "rgba(139, 151, 180, 0.32)" },
  itemStack: { flex: 1, gap: spacing.sm },
  itemMain: {
    backgroundColor: "rgba(13, 21, 48, 0.78)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  itemMainFeatured: { backgroundColor: "rgba(26, 35, 66, 0.96)", borderColor: "rgba(230, 192, 111, 0.48)" },
  itemMainCurrent: {
    backgroundColor: "rgba(29, 39, 73, 0.98)",
    borderColor: colors.gold,
    borderLeftWidth: 4
  },
  itemMainCompleted: { backgroundColor: "rgba(13, 21, 48, 0.46)", opacity: 0.58 },
  itemMainCanceled: { opacity: 0.62 },
  badgeRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 14 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  endTime: { color: colors.muted, fontFamily: typography.medium, fontSize: 9, textTransform: "uppercase" },
  featuredText: { color: colors.gold, fontFamily: typography.bold, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  liveNowText: { color: colors.gold, fontFamily: typography.bold, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  completedText: { color: colors.surfaceMuted, fontFamily: typography.bold, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
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
  trackGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  trackPill: { backgroundColor: colors.goldSoft, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  trackText: { color: colors.body, fontFamily: typography.semibold, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.8 }
});
