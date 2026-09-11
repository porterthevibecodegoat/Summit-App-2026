import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout } from "../../components/responsive-layout";

const wynnLogo = require("../../assets/wynn-logo.webp");
const summitArt = require("../../assets/summit-art-v2.png");

export default function MapScreen() {
  const { snapshot } = useSummit();
  const layout = useResponsiveLayout();
  const mapHeight = Math.min(Math.max((Math.min(layout.width, 840) - layout.gutter * 2) * 0.78, 280), 420);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={layout.contentStyle}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.introImage} style={[styles.intro, layout.marginStyle]}>
          <View style={[styles.introScrim, layout.cardPaddingStyle]}>
            <Text style={styles.kicker}>Venue Map</Text>
            <Text style={styles.title}>{snapshot.event.venueName}</Text>
            <Text style={styles.introBody}>{snapshot.event.city}</Text>
          </View>
        </ImageBackground>

        <View style={[styles.venueCard, layout.marginStyle, layout.cardPaddingStyle]}>
          <Image source={wynnLogo} resizeMode="contain" style={styles.venueLogo} />
          <Text style={styles.venueTitle}>Room-level map coming soon</Text>
          <Text style={styles.venueBody}>Approved rooms, entrances, and wayfinding details will appear here when the event layout is ready.</Text>
        </View>

        {snapshot.locations.length > 0 ? (
          <>
            <View style={[styles.mapPanel, layout.marginStyle, { height: mapHeight }]}>
              <View style={styles.mapGridLineA} />
              <View style={styles.mapGridLineB} />
              {snapshot.locations.map((location, index) => (
                <View
                  accessibilityLabel={`${index + 1}. ${location.name}`}
                  accessible
                  key={location.id}
                  style={[
                    styles.mapMarker,
                    {
                      left: `${Math.round(location.mapX * 100)}%`,
                      top: `${Math.round(location.mapY * 100)}%`
                    }
                  ]}
                >
                  <Text style={[styles.markerNumber, index === 0 && styles.markerNumberPrimary]}>{index + 1}</Text>
                </View>
              ))}
              <View style={styles.mapLegend}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Room index</Text>
              </View>
            </View>

            <View style={[styles.locationList, layout.marginStyle]}>
              {snapshot.locations.map((location, index) => (
                  <View key={location.id} style={[styles.locationRow, layout.cardPaddingStyle]}>
                  <View style={styles.locationIndex}>
                    <Text style={styles.locationIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.locationBody}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationDescription}>{location.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
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
  mapPanel: {
    backgroundColor: "#0A102A",
    borderColor: "rgba(230, 192, 111, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    overflow: "hidden"
  },
  mapGridLineA: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    height: 1,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    top: 104
  },
  mapGridLineB: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: spacing.lg,
    position: "absolute",
    top: spacing.lg,
    width: 1,
    left: "52%"
  },
  mapMarker: {
    alignItems: "center",
    backgroundColor: "rgba(18, 29, 68, 0.96)",
    borderColor: "rgba(230, 192, 111, 0.52)",
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30
  },
  markerNumber: {
    color: colors.surfaceMuted,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800"
  },
  markerNumberPrimary: {
    color: colors.gold
  },
  mapLegend: {
    alignItems: "center",
    bottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
    position: "absolute",
    right: spacing.lg
  },
  legendDot: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 12,
    width: 12
  },
  legendText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
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
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  locationIndexText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800"
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
