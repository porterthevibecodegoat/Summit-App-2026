import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { groupScheduleByEventDay, toEventTimeRange } from "@not-alone/domain";
import type { ScheduleItem } from "@not-alone/validation";
import { useSummitDemo } from "../../components/demo-mode";

const summitArt = require("../../assets/summit-art-v2.png");

export default function ScheduleScreen() {
  const { demoEnabled, snapshot, setDemoEnabled, isSessionSaved, savedSessionIds } = useSummitDemo();
  const groups = useMemo(() => groupScheduleByEventDay(snapshot.scheduleItems), [snapshot.scheduleItems]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const selectedGroup = groups[Math.min(selectedDayIndex, Math.max(groups.length - 1, 0))];

  useEffect(() => {
    if (selectedDayIndex >= groups.length) {
      setSelectedDayIndex(0);
    }
  }, [groups.length, selectedDayIndex]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.introImage} style={styles.intro}>
          <View style={styles.introScrim}>
            <Text style={styles.kicker}>Schedule</Text>
            <Text style={styles.title}>{demoEnabled ? "Live agenda preview" : snapshot.event.dateLabel}</Text>
            <Text style={styles.introBody}>
              {demoEnabled
                ? `A temporary sample agenda with ${savedSessionIds.length} saved session(s) in My Schedule.`
                : snapshot.scheduleItems.length > 0
                  ? `${savedSessionIds.length} saved session(s). Updates come from the staff-published schedule.`
                  : "Sessions will appear here after the staff team publishes the approved agenda."}
            </Text>
          </View>
        </ImageBackground>

        {groups.length === 0 ? (
          <EmptySchedule onPreview={() => setDemoEnabled(true)} timeZone={snapshot.event.timeZone} tracks={snapshot.event.tracks} />
        ) : (
          <>
            <View style={styles.dayRail}>
              {groups.map((group, index) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selectedDayIndex === index }}
                  key={group.dayLabel}
                  onPress={() => setSelectedDayIndex(index)}
                  style={({ pressed }) => [
                    styles.dayPill,
                    selectedDayIndex === index && styles.dayPillActive,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.dayPillText, selectedDayIndex === index && styles.dayPillTextActive]}>
                    {demoEnabled && index === 0 ? "Today" : group.dayLabel.split(",")[0]}
                  </Text>
                </Pressable>
              ))}
            </View>
            {selectedGroup ? (
              <View key={selectedGroup.dayLabel} style={styles.day}>
                <Text style={styles.dayTitle}>{selectedGroup.dayLabel}</Text>
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

function EmptySchedule({
  onPreview,
  timeZone,
  tracks
}: {
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
      <Pressable onPress={onPreview} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
        <Text style={styles.previewButtonText}>Preview Demo Schedule</Text>
      </Pressable>
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
  return (
    <Link href={{ pathname: "/session/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.item, last && styles.itemLast, pressed && styles.pressed]}>
        <View style={styles.timeColumn}>
          <Text style={styles.time}>{toEventTimeRange(item, item.eventTimeZone)}</Text>
          <View style={styles.timelineDot} />
        </View>
        <View style={styles.itemMain}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.featured ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            ) : null}
            {saved ? (
              <View style={styles.savedBadge}>
                <Text style={styles.savedText}>Saved</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.summary}>{item.summary}</Text>
          <Text style={styles.meta}>{item.locationName} · {item.visibilityScope.label}</Text>
        </View>
      </Pressable>
    </Link>
  );
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
    paddingBottom: 116
  },
  intro: {
    backgroundColor: colors.midnight,
    borderColor: "rgba(230, 192, 111, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 208,
    overflow: "hidden"
  },
  introImage: {
    borderRadius: 8
  },
  introScrim: {
    backgroundColor: "rgba(5, 10, 30, 0.62)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  kicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 35,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 40,
    marginTop: spacing.xs
  },
  introBody: {
    color: colors.surfaceMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md
  },
  dayRail: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  dayPill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dayPillActive: {
    backgroundColor: colors.gold
  },
  dayPillText: {
    color: colors.body,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "700"
  },
  dayPillTextActive: {
    color: colors.midnight
  },
  day: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  dayTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.md
  },
  timeline: {
    backgroundColor: "rgba(13, 21, 48, 0.72)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  item: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  itemLast: {
    borderBottomWidth: 0
  },
  timeColumn: {
    width: 76
  },
  time: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  timelineDot: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 8,
    marginTop: spacing.md,
    width: 8
  },
  itemMain: {
    flex: 1
  },
  itemHeader: {
    gap: spacing.sm
  },
  itemTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  savedBadge: {
    alignSelf: "flex-start",
    borderColor: "rgba(230, 192, 111, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  savedText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  featuredText: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  summary: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm
  },
  emptyPanel: {
    backgroundColor: "rgba(13, 21, 48, 0.8)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0
  },
  emptyBody: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  previewButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  previewButtonText: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: "800"
  },
  trackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  trackPill: {
    backgroundColor: colors.goldSoft,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  trackText: {
    color: colors.body,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.84
  }
});
