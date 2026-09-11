import { Link, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { toEventTimeRange } from "@not-alone/domain";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout } from "../../components/responsive-layout";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useSummit();
  const layout = useResponsiveLayout();
  const item = snapshot.scheduleItems.find((scheduleItem) => scheduleItem.id === id);
  const speakers = snapshot.speakers.filter((speaker) => speaker.published && item?.speakerIds.includes(speaker.id));

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
      contentContainerStyle={layout.contentStyle}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={[styles.hero, layout.paddingStyle]}>
        <Text style={styles.time}>{toEventTimeRange(item, snapshot.event.timeZone)}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>
      </View>

      {speakers.length > 0 ? (
        <View style={[styles.speakerSection, layout.marginStyle]}>
          <Text style={styles.sectionLabel}>{speakers.length === 1 ? "Speaker" : "Speakers"}</Text>
          {speakers.map((speaker) => (
            <View key={speaker.id} style={[styles.speakerPanel, layout.cardPaddingStyle]}>
              {speaker.headshotUrl ? (
                <Image accessibilityLabel={`${speaker.name} headshot`} source={{ uri: speaker.headshotUrl }} style={styles.speakerImage} />
              ) : (
                <View accessibilityLabel={speaker.name} style={styles.speakerFallback}>
                  <Text style={styles.speakerInitials}>{initials(speaker.name)}</Text>
                </View>
              )}
              <View style={styles.speakerText}>
                <Text style={styles.speakerName}>{speaker.name}</Text>
                <Text style={styles.speakerRole}>{speaker.role}</Text>
                {speaker.bio ? <Text style={styles.speakerBio}>{speaker.bio}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.panel, layout.marginStyle, layout.cardPaddingStyle]}>
        <DetailRow label="Location" value={item.locationName} />
        <DetailRow label="Access" value={item.eligibilityScope.label} />
        <DetailRow label="Visibility" value={item.visibilityScope.label} />
        <DetailRow label="Status" value={item.status} />
      </View>

      <View style={[styles.actionGrid, layout.marginStyle]}>
        <Link href="/map" asChild>
          <Pressable accessibilityLabel="Open map and find this room" accessibilityRole="button" style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionLabel}>Map</Text>
            <Text style={styles.actionText}>Find the room</Text>
          </Pressable>
        </Link>
        <Link href="/help" asChild>
          <Pressable accessibilityLabel="Ask the summit concierge what to do next" accessibilityRole="button" style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionLabel}>Concierge</Text>
            <Text style={styles.actionText}>Ask what to do next</Text>
          </Pressable>
        </Link>
      </View>

      <View style={[styles.panel, layout.marginStyle, layout.cardPaddingStyle]}>
        <Text style={styles.panelTitle}>About this session</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <View style={[styles.panel, layout.marginStyle, layout.cardPaddingStyle]}>
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas
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
  speakerSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  sectionLabel: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: spacing.sm,
    textTransform: "uppercase"
  },
  speakerPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(230, 192, 111, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
    padding: spacing.md
  },
  speakerImage: {
    borderRadius: 8,
    height: 104,
    width: 84
  },
  speakerFallback: {
    alignItems: "center",
    backgroundColor: colors.midnight,
    borderColor: colors.gold,
    borderRadius: 8,
    borderWidth: 1,
    height: 104,
    justifyContent: "center",
    width: 84
  },
  speakerInitials: {
    color: colors.gold,
    fontFamily: typography.display,
    fontSize: 28,
    fontWeight: "700"
  },
  speakerText: {
    flex: 1
  },
  speakerName: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 28
  },
  speakerRole: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2
  },
  speakerBio: {
    color: colors.body,
    fontSize: 12,
    lineHeight: 18,
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
