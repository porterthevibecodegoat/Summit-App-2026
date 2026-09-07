import { Link, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { toEventTimeRange } from "@not-alone/domain";
import { demoSpeaker, useSummitDemo } from "../../components/demo-mode";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { demoEnabled, snapshot, isSessionSaved, toggleSavedSession } = useSummitDemo();
  const item = snapshot.scheduleItems.find((scheduleItem) => scheduleItem.id === id);

  if (!item) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Session unavailable</Text>
        <Text style={styles.notFoundBody}>Reload the published event data and try again.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.hero}>
        <Text style={styles.time}>{toEventTimeRange(item, snapshot.event.timeZone)}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>
        <Pressable
          onPress={() => toggleSavedSession(item.id)}
          style={({ pressed }) => [styles.saveButton, isSessionSaved(item.id) && styles.saveButtonActive, pressed && styles.pressed]}
        >
          <Text style={[styles.saveButtonText, isSessionSaved(item.id) && styles.saveButtonTextActive]}>
            {isSessionSaved(item.id) ? "Saved to My Schedule" : "Save to My Schedule"}
          </Text>
        </Pressable>
      </View>

      {demoEnabled && item.featured ? (
        <View style={styles.speakerPanel}>
          <Image source={demoSpeaker.image} resizeMode="cover" style={styles.speakerImage} />
          <View style={styles.speakerText}>
            <Text style={styles.speakerKicker}>Featured speaker</Text>
            <Text style={styles.speakerName}>{demoSpeaker.name}</Text>
            <Text style={styles.speakerRole}>{demoSpeaker.role}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.panel}>
        <DetailRow label="Location" value={item.locationName} />
        <DetailRow label="Access" value={item.eligibilityScope.label} />
        <DetailRow label="Visibility" value={item.visibilityScope.label} />
        <DetailRow label="Reminder" value={`${item.notificationOffsetsMinutes.join(", ")} minutes before`} />
        <DetailRow label="Status" value={item.status} />
      </View>

      <View style={styles.actionGrid}>
        <Link href="/map" asChild>
          <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionLabel}>Map</Text>
            <Text style={styles.actionText}>Find the room</Text>
          </Pressable>
        </Link>
        <Link href="/help" asChild>
          <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionLabel}>Concierge</Text>
            <Text style={styles.actionText}>Ask what to do next</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>About this session</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Event Context</Text>
        <Text style={styles.description}>
          {snapshot.event.name} brings together mental health advocates, artists, athletes, philanthropists,
          clinicians, researchers, youth ambassadors, and business leaders at {snapshot.event.venueName}.
        </Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas
  },
  content: {
    paddingBottom: 116
  },
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.md
  },
  time: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800"
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 37,
    marginTop: spacing.sm
  },
  summary: {
    color: colors.body,
    fontSize: 17,
    lineHeight: 24,
    marginTop: spacing.md
  },
  saveButton: {
    alignSelf: "flex-start",
    borderColor: "rgba(230, 192, 111, 0.48)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  saveButtonActive: {
    backgroundColor: colors.gold
  },
  saveButtonText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: "800"
  },
  saveButtonTextActive: {
    color: colors.midnight
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  actionGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  actionButton: {
    backgroundColor: "rgba(13, 21, 48, 0.8)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: spacing.md
  },
  actionLabel: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  actionText: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  speakerPanel: {
    backgroundColor: colors.surface,
    borderColor: "rgba(230, 192, 111, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    overflow: "hidden",
    padding: spacing.md
  },
  speakerImage: {
    borderRadius: 8,
    height: 112,
    width: 92
  },
  speakerText: {
    flex: 1,
    justifyContent: "center"
  },
  speakerKicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  speakerName: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
    fontWeight: "700",
    lineHeight: 30,
    marginTop: spacing.xs
  },
  speakerRole: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  detailRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  detailValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: spacing.md,
    textAlign: "right",
    textTransform: "capitalize"
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  description: {
    color: colors.body,
    fontSize: 16,
    lineHeight: 24
  },
  notFound: {
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  notFoundTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    fontWeight: "800"
  },
  notFoundBody: {
    color: colors.body,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm
  },
  pressed: {
    opacity: 0.84
  }
});
