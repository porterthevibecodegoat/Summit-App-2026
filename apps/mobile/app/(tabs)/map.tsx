import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout } from "../../components/responsive-layout";

const wynnLogo = require("../../assets/wynn-logo.webp");
const summitArt = require("../../assets/summit-art-v2.png");

export default function MapScreen() {
  const { snapshot } = useSummit();
  const layout = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={layout.contentStyle}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.introImage} style={[styles.intro, layout.marginStyle]}>
          <View style={[styles.introScrim, layout.cardPaddingStyle]}>
            <Text style={styles.kicker}>Venue guide</Text>
            <Text style={styles.title}>{snapshot.event.venueName}</Text>
            <Text style={styles.introBody}>{snapshot.event.city} · {snapshot.locations.length} published rooms</Text>
          </View>
        </ImageBackground>

        <View style={[styles.venueCard, layout.marginStyle, layout.cardPaddingStyle]}>
          <Image source={wynnLogo} resizeMode="contain" style={styles.venueLogo} />
          <Text style={styles.venueTitle}>Find your room</Text>
          <Text style={styles.venueBody}>Match the room name on each schedule card with the directory below. Registration is the primary stop for credential help and in-person directions.</Text>
        </View>

        {snapshot.locations.length > 0 ? (
          <View accessibilityLabel="Published venue directory" style={[styles.locationList, layout.marginStyle]}>
            {snapshot.locations.map((location, index) => {
              const sessionCount = snapshot.scheduleItems.filter((item) => item.published && item.locationId === location.id).length;
              return (
                <View key={location.id} style={[styles.locationRow, layout.cardPaddingStyle]}>
                  <View style={styles.locationIndex}>
                    <MapPin color={index === 0 ? colors.gold : colors.surfaceMuted} size={17} strokeWidth={2.2} />
                  </View>
                  <View style={styles.locationBody}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationDescription}>{location.description}</Text>
                    <Text style={styles.locationMeta}>{sessionCount} {sessionCount === 1 ? "scheduled item" : "scheduled items"}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyPanel, layout.marginStyle, layout.cardPaddingStyle]}>
            <Text style={styles.emptyTitle}>No rooms published yet</Text>
            <Text style={styles.emptyBody}>
              The attendee map will stay clear until room locations and wayfinding details are approved.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    lineHeight: 40,
    marginTop: spacing.xs
  },
  introBody: {
    color: colors.surfaceMuted,
    fontFamily: typography.semibold,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginTop: spacing.sm
  },
  venueCard: {
    backgroundColor: "rgba(13, 21, 48, 0.78)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  venueLogo: {
    height: 38,
    width: 124
  },
  venueTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 27,
    marginTop: spacing.lg
  },
  venueBody: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  locationList: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  locationRow: {
    backgroundColor: "rgba(13, 21, 48, 0.78)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  locationIndex: {
    alignItems: "center",
    backgroundColor: "rgba(230, 192, 111, 0.14)",
    borderColor: "rgba(230, 192, 111, 0.42)",
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  locationBody: {
    flex: 1
  },
  locationName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    fontWeight: "700"
  },
  locationDescription: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs
  },
  locationMeta: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 11,
    fontWeight: "600",
    marginTop: spacing.sm
  },
  emptyPanel: {
    backgroundColor: "rgba(13, 21, 48, 0.78)",
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
    fontSize: 18,
    fontWeight: "700"
  },
  emptyBody: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  }
});
