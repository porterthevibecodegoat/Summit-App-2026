import { ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { publicAppConfig } from "@not-alone/config";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { useSummitDemo } from "../../components/demo-mode";

const summitArt = require("../../assets/summit-art-v2.png");

export default function InfoScreen() {
  const { demoEnabled, snapshot } = useSummitDemo();
  const officialContent = snapshot.contentPages.find((page) => page.slug === "inspiring-children-foundation");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{snapshot.event.organizationName}</Text>
          <Text style={styles.headerTitle}>Summit Info</Text>
        </View>

        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.heroImage} style={styles.heroCard}>
          <View style={styles.heroScrim}>
            <View style={styles.heroTop}>
              <View style={styles.artMark} />
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{snapshot.event.dateLabel}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.heroTitle}>{snapshot.event.name}</Text>
              <Text style={styles.heroCopy}>{snapshot.event.positioning}</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.detailGrid}>
          <InfoTile label="Venue" value={snapshot.event.venueName} tone="green" />
          <InfoTile label="City" value={snapshot.event.city} tone="blue" />
          <InfoTile label="Presented by" value={snapshot.event.presentedBy} tone="gold" />
          <InfoTile label="Powered by" value={snapshot.event.poweredBy} tone="plum" />
        </View>

        {demoEnabled ? (
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeLabel}>Temporary demo mode</Text>
            <Text style={styles.demoNoticeBody}>
              Sample sessions and wayfinding are active for preview only. Final agenda content remains controlled by
              the shared published event data.
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <View style={styles.trackGrid}>
            {snapshot.event.tracks.map((track) => (
              <View key={track} style={styles.trackPill}>
                <Text style={styles.trackText}>{track}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Leadership</Text>
          <View style={styles.peoplePanel}>
            {snapshot.event.featuredPeople.map((person) => (
              <View key={`${person.group}-${person.name}`} style={styles.personRow}>
                <View style={styles.personText}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personRole}>{person.role}</Text>
                </View>
                <View style={styles.personBadge}>
                  <Text style={styles.personGroup}>{person.group}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.aboutPanel}>
          <Text style={styles.aboutKicker}>About</Text>
          <Text style={styles.aboutTitle}>{officialContent?.title ?? publicAppConfig.organizationName}</Text>
          <Text style={styles.aboutCopy}>{officialContent?.body}</Text>
        </View>

        <View style={styles.supportPanel}>
          <Pressable onPress={() => void Linking.openURL("https://www.inspiringchildren.org/summit")} style={styles.supportLink}>
            <Text style={styles.supportLinkText}>Official Summit Website</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL("https://www.inspiringchildren.org/contact")} style={styles.supportLink}>
            <Text style={styles.supportLinkText}>Contact Event Support</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(`${publicAppConfig.apiBaseUrl}/privacy`)} style={styles.supportLink}>
            <Text style={styles.supportLinkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "gold" | "green" | "plum" | "blue";
}) {
  const toneStyle = {
    gold: styles.goldTile,
    green: styles.greenTile,
    plum: styles.plumTile,
    blue: styles.blueTile
  }[tone];

  return (
    <View style={[styles.infoTile, toneStyle]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm
  },
  eyebrow: {
    color: colors.muted,
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
    marginTop: 2
  },
  heroCard: {
    backgroundColor: colors.midnight,
    borderRadius: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 264,
    overflow: "hidden"
  },
  heroImage: {
    borderRadius: 8
  },
  heroScrim: {
    backgroundColor: "rgba(13, 19, 31, 0.24)",
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  artMark: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 4,
    width: 54
  },
  dateBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 168,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dateText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right"
  },
  heroTitle: {
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 38
  },
  heroCopy: {
    color: colors.surfaceMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  demoNotice: {
    backgroundColor: "rgba(230, 192, 111, 0.12)",
    borderColor: "rgba(230, 192, 111, 0.24)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  demoNoticeLabel: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  demoNoticeBody: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs
  },
  infoTile: {
    borderRadius: 8,
    minHeight: 104,
    padding: spacing.md,
    width: "47.8%"
  },
  greenTile: {
    backgroundColor: colors.accentSoft
  },
  blueTile: {
    backgroundColor: "#0B2342"
  },
  goldTile: {
    backgroundColor: colors.goldSoft
  },
  plumTile: {
    backgroundColor: colors.plumSoft
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  infoValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 0
  },
  trackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  trackPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  trackText: {
    color: colors.body,
    fontSize: 13,
    fontWeight: "700"
  },
  peoplePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.md
  },
  personRow: {
    alignItems: "flex-start",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  personText: {
    flex: 1
  },
  personName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    fontWeight: "800"
  },
  personRole: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  personBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    maxWidth: 102,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  personGroup: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase"
  },
  aboutPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  aboutKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  aboutTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 27,
    marginTop: spacing.xs
  },
  aboutCopy: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm
  },
  supportPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.md
  },
  supportLink: {
    minHeight: 44,
    justifyContent: "center"
  },
  supportLinkText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 14,
    fontWeight: "700"
  }
});
