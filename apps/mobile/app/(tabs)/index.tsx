import { Link } from "expo-router";
import { useState } from "react";
import { Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { getActiveOperationalNotices, getCountdownLabel, getEventPhase, getNowAndUpcoming, toEventTimeRange, type OperationalNotice } from "@not-alone/domain";
import type { ScheduleItem, Speaker } from "@not-alone/validation";
import { useSummit } from "../../components/summit-context";
import { OpeningGreeting } from "../../components/opening-greeting";
import { useResponsiveLayout } from "../../components/responsive-layout";

const summitArt = require("../../assets/summit-art-v2.png");
const steveWozniakHeadshot = require("../../assets/steve-wozniak-headshot.jpg");

const homePrompts = ["What should I do now?", "Where is the next session?"];

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const layout = useResponsiveLayout();
  const {
    snapshot,
    nowUtc,
    lastSuccessfulSyncAt,
    lastRevisionUpdateAt,
    syncing,
    syncError,
    refreshPublishedSnapshot
  } = useSummit();
  const { current, upcoming } = getNowAndUpcoming({
    audienceGroups: ["public"],
    nowUtc,
    snapshot
  });
  const currentItem = current[0];
  const nextItem = upcoming[0];
  const eventPhase = getEventPhase(snapshot, nowUtc);
  const currentSpeaker = currentItem
    ? snapshot.speakers.find((speaker) => speaker.published && currentItem.speakerIds.includes(speaker.id))
    : undefined;
  const operationalNotices = getActiveOperationalNotices(snapshot, nowUtc);

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
      <OpeningGreeting />
      <ScrollView
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
          <Text style={styles.eyebrow}>{snapshot.event.organizationName}</Text>
          <Text style={styles.headerTitle}>Home</Text>
          <Text style={styles.headerMeta}>{snapshot.event.dateLabel} · {snapshot.event.venueName}</Text>
        </View>

        <View style={[styles.syncStrip, layout.marginStyle]}>
          <View style={[styles.syncDot, syncError ? styles.syncDotWarn : styles.syncDotReady]} />
          <Text style={styles.syncText}>
            {syncing
                ? "Checking for the latest schedule."
              : syncError
                ? "Using saved schedule while reconnecting."
                : lastRevisionUpdateAt
                  ? `New schedule received ${formatSyncTime(lastRevisionUpdateAt)}`
                : lastSuccessfulSyncAt
                  ? `Schedule updated ${formatSyncTime(lastSuccessfulSyncAt)}`
                  : "Your event guide is ready."}
          </Text>
        </View>

        {operationalNotices.length > 0 ? <NoticeStack insetStyle={layout.marginStyle} notices={operationalNotices} /> : null}

        {currentItem ? (
          <LiveSessionCard insetStyle={layout.marginStyle} item={currentItem} nowUtc={nowUtc} speaker={currentSpeaker} />
        ) : eventPhase === "after" ? (
          <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.liveImage} style={[styles.liveShell, layout.marginStyle]}>
            <View style={styles.liveScrim}>
              <Text style={styles.liveKicker}>Summit complete</Text>
              <Text style={styles.waitingTitle}>Thank you for being here.</Text>
              <Text style={styles.waitingBody}>
                The conversations, connections, and resources from the summit remain with you. The full agenda is still available for reference.
              </Text>
              <Link href="/schedule" asChild>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.completionButton, pressed && styles.pressed]}>
                  <Text style={styles.completionButtonText}>View event schedule</Text>
                </Pressable>
              </Link>
            </View>
          </ImageBackground>
        ) : (
          <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.liveImage} style={[styles.liveShell, layout.marginStyle]}>
            <View style={styles.liveScrim}>
              <Text style={styles.liveKicker}>Welcome to the summit</Text>
              <Text style={styles.waitingTitle}>You are not alone.</Text>
              <Text style={styles.waitingBody}>
                {snapshot.scheduleItems.length > 0
                  ? "Your schedule, venue guide, and event information are together in one place."
                  : "Programming will appear here as soon as the event team publishes it."}
              </Text>
            </View>
          </ImageBackground>
        )}

        <View style={[styles.quickPanel, layout.marginStyle, layout.cardPaddingStyle]}>
          <Text style={styles.panelLabel}>Your summit day</Text>
          <MiniStatus
            title={eventPhase === "after" ? "Event status" : "Up next"}
            value={eventPhase === "after" ? "The summit has concluded" : nextItem ? nextItem.title : "Schedule coming soon"}
            meta={eventPhase === "after" ? "View the completed agenda" : nextItem ? `${toEventTimeRange(nextItem, snapshot.event.timeZone)} · Starts in ${getCountdownLabel(nextItem.startUtc, nowUtc)}` : "Check back for event updates"}
            detail={nextItem ? `${nextItem.locationName} · ${nextItem.visibilityScope.label}` : undefined}
            href={nextItem ? { pathname: "/session/[id]", params: { id: nextItem.id } } : "/schedule"}
            railLabel={eventPhase === "after" ? "Done" : "Next"}
          />
          <View style={styles.divider} />
          <View style={styles.aiBlock}>
            <View style={styles.aiHeader}>
              <View>
                <Text style={styles.panelLabel}>Ask AI concierge</Text>
                <Text style={styles.aiTitle}>Fast answers, grounded in the agenda.</Text>
              </View>
              <Link href="/help" asChild>
                <Pressable accessibilityLabel="Ask the summit concierge" accessibilityRole="button" style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
                  <Text style={styles.smallButtonText}>Ask</Text>
                </Pressable>
              </Link>
            </View>
            <View style={styles.promptRow}>
              {homePrompts.map((prompt) => (
                <Link key={prompt} href="/help" asChild>
                  <Pressable accessibilityLabel={`Ask: ${prompt}`} accessibilityRole="button" style={({ pressed }) => [styles.promptChip, pressed && styles.pressed]}>
                    <Text style={styles.promptText}>{prompt}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.toolsPanel, layout.marginStyle]}>
          <ToolPill href="/schedule" label="Schedule" value={`${snapshot.scheduleItems.length} sessions`} />
          <ToolPill href="/map" label="Map" value={snapshot.event.venueName} />
          <ToolPill href="/help" label="Help" value="Concierge" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function LiveSessionCard({ insetStyle, item, nowUtc, speaker }: { insetStyle: StyleProp<ViewStyle>; item: ScheduleItem; nowUtc: string; speaker: Speaker | undefined }) {
  const speakerImage = getSpeakerImage(speaker);
  return (
    <Link href={{ pathname: "/session/[id]", params: { id: item.id } }} asChild>
      <Pressable
        accessibilityLabel={`Live now. ${item.title}. ${item.locationName}`}
        accessibilityRole="button"
        style={({ pressed }) => [styles.liveShell, insetStyle, pressed && styles.pressed]}
      >
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.liveImage} style={styles.liveBackground}>
          <View style={styles.liveScrim}>
            <View style={styles.liveTop}>
              <View style={styles.liveTopText}>
                <Text style={styles.liveKicker}>Live now</Text>
                <Text style={styles.liveTime}>{toEventTimeRange(item, item.eventTimeZone)}</Text>
                <Text style={styles.countdownText}>Ends in {getCountdownLabel(item.endUtc, nowUtc)}</Text>
              </View>
              {speakerImage ? <Image accessibilityLabel={speaker ? `Headshot of ${speaker.name}` : "Live session speaker"} resizeMode="cover" source={speakerImage} style={styles.speakerPortrait} /> : null}
            </View>
            <Text style={styles.sessionTitle}>{item.title}</Text>
            {speaker ? <Text style={styles.speakerName}>{speaker.name} · {speaker.role}</Text> : null}
            <Text style={styles.sessionSummary} numberOfLines={2}>{item.summary}</Text>
            <View style={styles.liveFooter}>
              <Text style={styles.locationText}>{item.locationName}</Text>
              <Text style={styles.accessText}>{item.visibilityScope.label}</Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Link>
  );
}

function NoticeStack({ insetStyle, notices }: { insetStyle: StyleProp<ViewStyle>; notices: OperationalNotice[] }) {
  return (
    <View accessibilityLabel="Important event updates" style={[styles.noticeStack, insetStyle]}>
      {notices.map((notice) => {
        const body = <View style={[styles.notice, notice.severity === "urgent" && styles.noticeUrgent]}>
          <Text style={[styles.noticeLabel, notice.severity === "urgent" && styles.noticeLabelUrgent]}>{notice.severity === "urgent" ? "Urgent notice" : notice.severity === "change" ? "Schedule update" : "Event notice"}</Text>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeBody}>{notice.body}</Text>
        </View>;
        return notice.scheduleItemId ? <Link href={{ pathname: "/session/[id]", params: { id: notice.scheduleItemId } }} asChild key={notice.id}><Pressable accessibilityRole="button">{body}</Pressable></Link> : <View key={notice.id}>{body}</View>;
      })}
    </View>
  );
}

function MiniStatus({
  title,
  value,
  meta,
  detail,
  href,
  railLabel = "Next"
}: {
  title: string;
  value: string;
  meta: string;
  detail?: string | undefined;
  href: "/schedule" | { pathname: "/session/[id]"; params: { id: string } };
  railLabel?: string | undefined;
}) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={`${title}. ${value}. ${meta}`} accessibilityRole="button" style={({ pressed }) => [styles.miniStatus, pressed && styles.pressed]}>
        <View style={styles.statusRail}>
          <Text style={styles.statusRailText}>{railLabel}</Text>
        </View>
        <View style={styles.statusText}>
          <Text style={styles.panelLabel}>{title}</Text>
          <Text style={styles.statusTitle} numberOfLines={2}>{value}</Text>
          <Text style={styles.statusMeta}>{meta}</Text>
          {detail ? <Text numberOfLines={2} style={styles.statusDetail}>{detail}</Text> : null}
        </View>
      </Pressable>
    </Link>
  );
}

function ToolPill({ href, label, value }: { href: "/schedule" | "/map" | "/help"; label: string; value: string }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={`${label}. ${value}`} accessibilityRole="button" style={({ pressed }) => [styles.toolPill, pressed && styles.pressed]}>
        <Text style={styles.toolLabel}>{label}</Text>
        <Text style={styles.toolValue} numberOfLines={1}>{value}</Text>
      </Pressable>
    </Link>
  );
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getSpeakerImage(speaker: Speaker | undefined): ImageSourcePropType | undefined {
  if (!speaker) return undefined;
  if (speaker.headshotUrl) return { uri: speaker.headshotUrl };
  return /steve wozniak/i.test(speaker.name) ? steveWozniakHeadshot : undefined;
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
    paddingTop: spacing.xs
  },
  eyebrow: {
    color: colors.gold,
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
    lineHeight: 30,
    marginTop: 2
  },
  headerMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 2
  },
  syncStrip: {
    alignItems: "center",
    backgroundColor: "rgba(13, 21, 48, 0.74)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  syncDot: {
    borderRadius: 8,
    height: 8,
    width: 8
  },
  syncDotReady: {
    backgroundColor: colors.gold
  },
  syncDotWarn: {
    backgroundColor: colors.warning
  },
  syncText: {
    color: colors.body,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 12,
    fontWeight: "500"
  },
  noticeStack: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md
  },
  notice: {
    backgroundColor: "rgba(230, 192, 111, 0.1)",
    borderColor: "rgba(230, 192, 111, 0.42)",
    borderLeftWidth: 4,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  noticeUrgent: {
    backgroundColor: "rgba(154, 44, 44, 0.18)",
    borderColor: "rgba(240, 111, 111, 0.65)"
  },
  noticeLabel: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  noticeLabelUrgent: { color: "#FF9B9B" },
  noticeTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 3
  },
  noticeBody: { color: colors.body, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  revisionText: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  liveShell: {
    backgroundColor: colors.surface,
    borderColor: "rgba(230, 192, 111, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    overflow: "hidden"
  },
  liveBackground: {
    minHeight: 0
  },
  liveImage: {
    opacity: 0.58
  },
  liveScrim: {
    backgroundColor: "rgba(5, 10, 30, 0.72)",
    padding: spacing.lg
  },
  liveTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  liveTopText: {
    flex: 1,
    paddingRight: spacing.md
  },
  liveKicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  liveTime: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: spacing.sm
  },
  countdownText: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs
  },
  speakerPortrait: {
    backgroundColor: colors.surface,
    borderColor: "rgba(230, 192, 111, 0.5)",
    borderRadius: 8,
    borderWidth: 1,
    height: 120,
    width: 92
  },
  speakerName: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: spacing.xs
  },
  sessionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 29,
    marginTop: spacing.sm
  },
  sessionSummary: {
    color: colors.body,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  liveFooter: {
    alignItems: "center",
    borderTopColor: "rgba(220, 229, 245, 0.14)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md
  },
  locationText: {
    color: colors.surfaceMuted,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "600",
    paddingRight: spacing.sm
  },
  accessText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  waitingTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 37,
    marginTop: spacing.xl,
    maxWidth: 260
  },
  waitingBody: {
    color: colors.body,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md
  },
  completionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 42,
    paddingHorizontal: spacing.lg
  },
  completionButtonText: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800"
  },
  quickPanel: {
    backgroundColor: "rgba(13, 21, 48, 0.9)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  miniStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  statusRail: {
    alignItems: "center",
    backgroundColor: colors.goldSoft,
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 58
  },
  statusRailText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statusText: {
    flex: 1
  },
  panelLabel: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  statusTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 3
  },
  statusMeta: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs
  },
  statusDetail: { color: colors.surfaceMuted, fontFamily: typography.medium, fontSize: 11, lineHeight: 16, marginTop: 3 },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.lg
  },
  aiBlock: {
    gap: spacing.md
  },
  aiHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  aiTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
    marginTop: 3,
    maxWidth: 230
  },
  smallButton: {
    alignItems: "center",
    borderColor: "rgba(230, 192, 111, 0.46)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 58
  },
  smallButtonText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  promptChip: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(220, 229, 245, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  promptText: {
    color: colors.surfaceMuted,
    fontFamily: typography.medium,
    fontSize: 12,
    fontWeight: "500"
  },
  toolsPanel: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  toolPill: {
    backgroundColor: "rgba(13, 21, 48, 0.82)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: spacing.md
  },
  toolLabel: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  toolValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  pressed: {
    opacity: 0.84
  }
});
