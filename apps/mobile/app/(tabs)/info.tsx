import { Image, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout } from "../../components/responsive-layout";
import { mobileApiBaseUrl } from "../../lib/mobile-api";

const summitArt = require("../../assets/summit-art-v2.png");

export default function InfoScreen() {
  const { snapshot } = useSummit();
  const layout = useResponsiveLayout();
  const tileStyle = layout.compact ? styles.gridItemFull : layout.wide ? styles.gridItemQuarter : styles.gridItemHalf;
  const mediaItemStyle = layout.compact ? styles.gridItemFull : layout.regular ? styles.gridItemThird : styles.gridItemHalf;
  const officialContent = snapshot.contentPages.find((page) => page.slug === "inspiring-children-foundation");
  const speakers = snapshot.speakers.filter((speaker) => speaker.published);
  const faqs = snapshot.faqs.filter((faq) => faq.published);
  const sponsors = snapshot.sponsors.filter((sponsor) => sponsor.published);
  const media = snapshot.media.filter((item) => item.published);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={layout.contentStyle}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.header, layout.paddingStyle]}>
          <Text style={styles.eyebrow}>{snapshot.event.organizationName}</Text>
          <Text style={styles.headerTitle}>Summit Info</Text>
        </View>

        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.heroImage} style={[styles.heroCard, layout.marginStyle]}>
          <View style={[styles.heroScrim, layout.cardPaddingStyle]}>
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

        <View style={[styles.detailGrid, layout.marginStyle]}>
          <InfoTile itemStyle={tileStyle} label="Venue" value={snapshot.event.venueName} tone="green" />
          <InfoTile itemStyle={tileStyle} label="City" value={snapshot.event.city} tone="blue" />
          <InfoTile itemStyle={tileStyle} label="Presented by" value={snapshot.event.presentedBy} tone="gold" />
          <InfoTile itemStyle={tileStyle} label="Powered by" value={snapshot.event.poweredBy} tone="plum" />
        </View>


        <View style={[styles.section, layout.paddingStyle]}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <View style={styles.trackGrid}>
            {snapshot.event.tracks.map((track) => (
              <View key={track} style={styles.trackPill}>
                <Text style={styles.trackText}>{track}</Text>
              </View>
            ))}
          </View>
        </View>

        {speakers.length > 0 ? <View style={[styles.section, layout.paddingStyle]}>
          <Text style={styles.sectionTitle}>Speakers & Guests</Text>
          <View style={styles.peoplePanel}>
            {speakers.map((person) => (
              <View key={person.id} style={styles.personRow}>
                {person.headshotUrl ? <Image accessibilityLabel={`${person.name} headshot`} source={{ uri: person.headshotUrl }} style={styles.personImage} /> : null}
                <View style={styles.personText}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personRole}>{person.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View> : null}

        {faqs.length > 0 ? <View style={[styles.section, layout.paddingStyle]}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.peoplePanel}>
            {faqs.map((faq) => <View key={faq.id} style={styles.faqRow}><Text style={styles.faqCategory}>{faq.category}</Text><Text style={styles.personName}>{faq.question}</Text><Text style={styles.personRole}>{faq.answer}</Text></View>)}
          </View>
        </View> : null}

        {sponsors.length > 0 ? <View style={[styles.section, layout.paddingStyle]}>
          <Text style={styles.sectionTitle}>Sponsors & Partners</Text>
          <View style={styles.peoplePanel}>
            {sponsors.map((sponsor) => <Pressable disabled={!sponsor.websiteUrl} key={sponsor.id} onPress={() => sponsor.websiteUrl ? void Linking.openURL(sponsor.websiteUrl) : undefined} style={styles.sponsorRow}>
              {sponsor.logoUrl ? <Image accessibilityLabel={`${sponsor.name} logo`} resizeMode="contain" source={{ uri: sponsor.logoUrl }} style={styles.sponsorLogo} /> : null}
              <View style={styles.personText}><Text style={styles.faqCategory}>{sponsor.tier}</Text><Text style={styles.personName}>{sponsor.name}</Text></View>
            </Pressable>)}
          </View>
        </View> : null}

        {media.length > 0 ? <View style={[styles.section, layout.paddingStyle]}>
          <Text style={styles.sectionTitle}>Media</Text>
          <View style={styles.mediaGrid}>{media.map((item) => <Pressable accessibilityRole="link" key={item.id} onPress={() => void Linking.openURL(item.url)} style={[styles.mediaItem, mediaItemStyle]}>
            {item.type === "image" ? <Image accessibilityLabel={item.altText || item.title} resizeMode="cover" source={{ uri: item.url }} style={styles.mediaImage} /> : null}
            <Text style={styles.mediaTitle}>{item.title}</Text>
          </Pressable>)}</View>
        </View> : null}

        <View style={[styles.aboutPanel, layout.marginStyle, layout.cardPaddingStyle]}>
          <Text style={styles.aboutKicker}>About</Text>
          <Text style={styles.aboutTitle}>{officialContent?.title ?? snapshot.event.organizationName}</Text>
          <Text style={styles.aboutCopy}>{officialContent?.body}</Text>
        </View>

        <View style={[styles.supportPanel, layout.marginStyle]}>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.inspiringchildren.org/summit")} style={styles.supportLink}>
            <Text style={styles.supportLinkText}>Official Summit Website</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.inspiringchildren.org/contact")} style={styles.supportLink}>
            <Text style={styles.supportLinkText}>Contact Event Support</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${mobileApiBaseUrl}/privacy`)} style={styles.supportLink}>
            <Text style={styles.supportLinkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({
  itemStyle,
  label,
  value,
  tone
}: {
  itemStyle: StyleProp<ViewStyle>;
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
    <View style={[styles.infoTile, toneStyle, itemStyle]}>
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
    backgroundColor: "rgba(5, 10, 30, 0.68)",
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
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right"
  },
  heroTitle: {
    color: colors.ink,
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
  infoTile: {
    borderRadius: 8,
    minHeight: 104,
    padding: spacing.md
  },
  gridItemFull: { width: "100%" },
  gridItemHalf: { width: "47.8%" },
  gridItemThird: { width: "31.2%" },
  gridItemQuarter: { width: "23.2%" },
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
  personImage: {
    borderRadius: 8,
    height: 64,
    width: 52
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
  faqRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md
  },
  faqCategory: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: spacing.xs,
    textTransform: "uppercase"
  },
  sponsorRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  sponsorLogo: {
    height: 50,
    width: 72
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  mediaItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  mediaImage: {
    aspectRatio: 1.4,
    width: "100%"
  },
  mediaTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "700",
    padding: spacing.sm
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
