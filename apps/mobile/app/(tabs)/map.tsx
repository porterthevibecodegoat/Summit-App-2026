import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { useSummitDemo } from "../../components/demo-mode";

const wynnLogo = require("../../assets/wynn-logo.webp");
const summitArt = require("../../assets/summit-art-v2.png");

export default function MapScreen() {
  const { demoEnabled, snapshot } = useSummitDemo();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.introImage} style={styles.intro}>
          <View style={styles.introScrim}>
            <Text style={styles.kicker}>Venue Map</Text>
            <Text style={styles.title}>{snapshot.event.venueName}</Text>
            <Text style={styles.introBody}>{snapshot.event.city}</Text>
          </View>
        </ImageBackground>

        <View style={styles.venueCard}>
          <Image source={wynnLogo} resizeMode="contain" style={styles.venueLogo} />
          <Text style={styles.venueTitle}>{demoEnabled ? "Demo wayfinding preview" : "Room-level map coming soon"}</Text>
          <Text style={styles.venueBody}>
            {demoEnabled
              ? "Sample rooms show how attendees will move between main-stage programming, quiet spaces, lounges, and hosted experiences."
              : "Approved rooms, entrances, and wayfinding details will appear here when the event layout is ready."}
          </Text>
        </View>

        {snapshot.locations.length > 0 ? (
          <>
            <View style={styles.mapPanel}>
              <View style={styles.mapGridLineA} />
              <View style={styles.mapGridLineB} />
              {snapshot.locations.map((location, index) => (
                <View
                  key={location.id}
                  style={[
                    styles.mapMarker,
                    {
                      left: `${Math.round(location.mapX * 100)}%`,
                      top: `${Math.round(location.mapY * 100)}%`
                    }
                  ]}
                >
                  <View style={[styles.markerDot, index === 0 && styles.markerDotPrimary]} />
                  <Text style={styles.mapRoomText} numberOfLines={2}>{location.name}</Text>
                </View>
              ))}
              <View style={styles.youAreHere}>
                <View style={styles.youDot} />
                <Text style={styles.youText}>You are here</Text>
              </View>
            </View>

            <View style={styles.locationList}>
              {snapshot.locations.map((location) => (
                <View key={location.id} style={styles.locationRow}>
                  <View style={styles.locationIndex} />
                  <View style={styles.locationBody}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationDescription}>{location.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>No rooms published yet</Text>
            <Text style={styles.emptyBody}>
              The attendee map will stay clear until real venue details are approved. Demo Mode previews the intended
              interaction without making final venue claims.
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
    height: 318,
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
    backgroundColor: "rgba(18, 29, 68, 0.9)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 132,
    padding: spacing.md,
    position: "absolute",
    transform: [{ translateX: -28 }, { translateY: -18 }]
  },
  markerDot: {
    backgroundColor: colors.plum,
    borderRadius: 8,
    height: 8,
    width: 8
  },
  markerDotPrimary: {
    backgroundColor: colors.gold
  },
  mapRoomText: {
    color: colors.surfaceMuted,
    fontFamily: typography.semibold,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  youAreHere: {
    alignItems: "center",
    bottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
    position: "absolute",
    right: spacing.lg
  },
  youDot: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 12,
    width: 12
  },
  youText: {
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
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 10,
    marginTop: 5,
    width: 10
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
