import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { createAttendeeConciergeAnswer } from "@not-alone/domain/concierge";
import { toEventTimeRange } from "@not-alone/domain";
import type { ScheduleItem } from "@not-alone/validation";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout } from "../../components/responsive-layout";
import { mobileApiBaseUrl } from "../../lib/mobile-api";
import { sessionHref } from "../../lib/session-link";

const promptChips = [
  "What is happening now?",
  "What is the summit?",
  "Who is featured?",
  "Where do I go next?",
  "Quiet reset options"
];

type ConciergeAnswer = {
  title: string;
  body: string;
  items: ScheduleItem[];
};

type AttendeeAiResponse = {
  ok?: boolean;
  engine?: "openai" | "deterministic-fallback";
  answer?: {
    title?: string;
    body?: string;
    items?: Array<{ id?: string }>;
  };
};

export default function HelpScreen() {
  const layout = useResponsiveLayout();
  const [selectedPrompt, setSelectedPrompt] = useState<string>(promptChips[0] ?? "What is happening now?");
  const [customQuestion, setCustomQuestion] = useState("");
  const [remoteAnswer, setRemoteAnswer] = useState<ConciergeAnswer | null>(null);
  const [answerStatus, setAnswerStatus] = useState<"loading" | "live" | "fallback" | "offline">("loading");
  const { snapshot, nowUtc } = useSummit();
  const localAnswer = useMemo(() => {
    const response = createAttendeeConciergeAnswer({ question: selectedPrompt, snapshot, nowUtc });
    const itemById = new Map(snapshot.scheduleItems.map(item => [item.id, item]));
    return {
      title: response.title,
      body: response.body,
      items: response.items.flatMap(item => itemById.get(item.id) ?? [])
    };
  }, [selectedPrompt, snapshot, nowUtc]);
  const answer = remoteAnswer ?? localAnswer;
  const canSend = customQuestion.trim().length > 0;

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setAnswerStatus("loading");
    setRemoteAnswer(null);
    fetch(`${mobileApiBaseUrl}/api/ai/attendee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: selectedPrompt }),
      signal: controller.signal
    })
      .then(async (response) => {
        const result = (await response.json()) as AttendeeAiResponse;
        if (!response.ok || !result.ok || !result.answer?.title || !result.answer.body) {
          throw new Error("Concierge response unavailable.");
        }
        const itemById = new Map(snapshot.scheduleItems.map((item) => [item.id, item]));
        const items = (result.answer.items ?? [])
          .map((item) => item.id ? itemById.get(item.id) : undefined)
          .filter((item): item is ScheduleItem => Boolean(item));
        if (disposed) return;
        setRemoteAnswer({ title: result.answer.title, body: result.answer.body, items });
        setAnswerStatus(result.engine === "openai" ? "live" : "fallback");
      })
      .catch(() => {
        if (disposed) return;
        setRemoteAnswer(null);
        setAnswerStatus("offline");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedPrompt, snapshot]);

  const answerKicker = answerStatus === "loading"
      ? "Checking live concierge"
      : answerStatus === "live"
        ? "Live AI answer"
        : answerStatus === "offline"
          ? "Offline schedule answer"
          : "Schedule-grounded answer";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={layout.contentStyle}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.header, layout.paddingStyle]}>
          <Text style={styles.kicker}>Summit concierge</Text>
          <Text style={styles.title}>Ask AI</Text>
          <Text style={styles.copy}>Clear answers from the latest published event information.</Text>
        </View>

        <View style={[styles.promptPanel, layout.marginStyle, layout.cardPaddingStyle]}>
          <Text style={styles.promptTitle}>How can I help?</Text>
          <View style={styles.chipGrid}>
            {promptChips.map((prompt) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedPrompt === prompt }}
                key={prompt}
                onPress={() => {
                  setSelectedPrompt(prompt);
                  setCustomQuestion("");
                }}
                style={({ pressed }) => [
                  styles.promptChip,
                  selectedPrompt === prompt && styles.promptChipActive,
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.promptChipText, selectedPrompt === prompt && styles.promptChipTextActive]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inputShell}>
            <TextInput
              accessibilityLabel="Ask the summit concierge"
              onChangeText={setCustomQuestion}
              onSubmitEditing={() => {
                const question = customQuestion.trim();
                if (question.length > 0) {
                  setSelectedPrompt(question);
                }
              }}
              placeholder="Ask about sessions, speakers, venue..."
              placeholderTextColor={colors.muted}
              returnKeyType="send"
              style={styles.inputText}
              value={customQuestion}
            />
            <Pressable
              accessibilityLabel="Send question"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => {
                const question = customQuestion.trim();
                if (question.length > 0) {
                  setSelectedPrompt(question);
                }
              }}
              style={({ pressed }) => [styles.sendButton, !canSend && styles.sendButtonDisabled, pressed && canSend && styles.pressed]}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.answerPanel, layout.marginStyle, layout.cardPaddingStyle]}>
          <Text accessibilityLiveRegion="polite" style={styles.answerKicker}>{answerKicker}</Text>
          <Text style={styles.answerTitle}>{answer.title}</Text>
          <Text style={styles.answerBody}>{answer.body}</Text>
          {answer.items.length > 0 ? (
            <View style={styles.answerList}>
              {answer.items.map((item, index) => (
                <Link key={`${item.id}-${item.startUtc}-${index}`} href={sessionHref(item)} asChild>
                  <Pressable accessibilityLabel={`${item.title}. ${toEventTimeRange(item, snapshot.event.timeZone)}. ${item.locationName}`} accessibilityRole="button" style={({ pressed }) => [styles.answerItem, pressed && styles.pressed]}>
                    <Text style={styles.answerItemTime}>{toEventTimeRange(item, snapshot.event.timeZone)}</Text>
                    <Text style={styles.answerItemTitle}>{item.title}</Text>
                    <Text style={styles.answerItemMeta}>{item.locationName}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          ) : null}
        </View>

        <Link href="/schedule" asChild>
          <Pressable accessibilityLabel="Open full schedule" accessibilityRole="button" style={({ pressed }) => [styles.scheduleLink, layout.marginStyle, pressed && styles.pressed]}>
            <Text style={styles.scheduleLinkText}>Open Full Schedule</Text>
          </Pressable>
        </Link>
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
  header: {
    borderBottomColor: "rgba(230, 192, 111, 0.2)",
    borderBottomWidth: 1,
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg
  },
  kicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 40,
    marginTop: spacing.sm
  },
  copy: {
    color: colors.surfaceMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  promptPanel: {
    backgroundColor: "#0D1530",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  promptTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  promptChip: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(230, 192, 111, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  promptChipActive: {
    backgroundColor: colors.gold
  },
  promptChipText: {
    color: colors.surfaceMuted,
    fontFamily: typography.medium,
    fontSize: 14,
    fontWeight: "500"
  },
  promptChipTextActive: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontWeight: "800"
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: "rgba(5, 10, 30, 0.82)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm
  },
  inputText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    minWidth: 0,
    paddingRight: spacing.sm
  },
  sendButton: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  sendButtonDisabled: {
    opacity: 0.38
  },
  sendText: {
    color: colors.midnight,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800"
  },
  answerPanel: {
    backgroundColor: "rgba(13, 21, 48, 0.78)",
    borderColor: "rgba(230, 192, 111, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  answerKicker: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  answerTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 27,
    marginTop: spacing.xs
  },
  answerBody: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm
  },
  answerList: {
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  answerItem: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(230, 192, 111, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  answerItemTime: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    fontWeight: "800"
  },
  answerItemTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 4
  },
  answerItemMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4
  },
  scheduleLink: {
    alignItems: "center",
    borderColor: colors.gold,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md
  },
  scheduleLinkText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  pressed: {
    opacity: 0.84
  }
});
