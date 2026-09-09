import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { getNowAndUpcoming, toEventTimeRange } from "@not-alone/domain";
import type { EventSnapshot, ScheduleItem } from "@not-alone/validation";
import { useSummitDemo } from "../../components/demo-mode";

const summitArt = require("../../assets/summit-art-v2.png");

const promptChips = [
  "What is happening now?",
  "What is the summit?",
  "Who is featured?",
  "Where do I go next?",
  "Quiet reset options"
];

const summitKnowledge = {
  dates: "November 2-4, 2026",
  venue: "Wynn Las Vegas",
  tagline: "The Davos of Human Development",
  presenting:
    "The summit is presented by Villa Bibbiani, powered by the Steven & Alexandra Cohen Foundation, and produced by the Inspiring Children Foundation.",
  purpose:
    "Not Alone Summit brings CEOs, artists, athletes, philanthropists, clinicians, researchers, and youth ambassadors together to advance emotional and mental health through dialogue, collaboration, storytelling, music, and awards.",
  community:
    "The public Summit positioning emphasizes meaningful relationships over surface-level networking, with business, culture, science, philanthropy, music, and youth voices gathered around mental health.",
  foundation:
    "Inspiring Children Foundation is a 501(c)(3) nonprofit with more than 25 years serving young people facing financial hardship, anxiety, depression, and suicidal ideation through a daily whole-human-development model.",
  hosts:
    "Public summit materials list Steve Wozniak, Jewel, and Cherrial Odell as co-chairs, Jason Kennedy as summit host, and Loni Love as awards host.",
  formats:
    "The summit experience includes panels, pitches, awards, debates, concerts, seminars, meditation, workshops, VIP dinners, philanthropy, fitness and yoga, product launches, group discussions, and exclusive VIP experiences.",
  featured:
    "Public materials highlight experts, celebrities, athletes, business leaders, philanthropists, musicians, and Not Alone supporters. Featured names include Jewel, Steve Wozniak, Mike Tyson, Jada Pinkett Smith, Loni Love, Jason Kennedy, Rachel Platten, Darryl McDaniels, Harry Hudson, Kevin Hines, and others.",
  checkIn:
    "For prototype purposes, check-in and registration appear in the loaded schedule. Final credential pickup, guest services, and room assignments should be verified by staff before launch.",
  support:
    "This prototype can give summit information and schedule guidance, but it is not emergency or crisis support."
};

const featuredPeople = [
  {
    name: "Mike Tyson",
    role: "Hall of Fame boxer",
    group: "Entertainers & Athletes",
    aliases: ["mike tyson", "tyson"]
  },
  {
    name: "Steve Wozniak",
    role: "Apple co-founder and mental health advocate; public summit co-chair",
    group: "Co-Chairs",
    aliases: ["steve wozniak", "wozniak", "the woz"]
  },
  {
    name: "Jewel",
    role: "Grammy-nominated singer-songwriter, mental health pioneer, and public summit co-chair",
    group: "Co-Chairs, Musicians, Executive Producers",
    aliases: ["jewel"]
  },
  {
    name: "Jada Pinkett Smith",
    role: "Actress and businesswoman",
    group: "Entertainers & Athletes",
    aliases: ["jada", "jada pinkett", "jada pinkett smith"]
  },
  {
    name: "Jason Kennedy",
    role: "Entertainment journalist and public summit host",
    group: "Summit Host",
    aliases: ["jason kennedy", "jason"]
  },
  {
    name: "Loni Love",
    role: "Comedian, TV host, and public awards host",
    group: "Awards Host",
    aliases: ["loni love", "loni"]
  },
  {
    name: "Rachel Platten",
    role: "Singer-songwriter",
    group: "Founders, Musicians",
    aliases: ["rachel platten", "rachel"]
  },
  {
    name: "Darryl McDaniels",
    role: "Run-DMC artist",
    group: "Musicians",
    aliases: ["darryl mcdaniels", "dmc", "run dmc"]
  },
  {
    name: "Harry Hudson",
    role: "Singer-songwriter",
    group: "Musicians",
    aliases: ["harry hudson", "harry"]
  },
  {
    name: "Kevin Hines",
    role: "Suicide prevention speaker",
    group: "Experts",
    aliases: ["kevin hines", "kevin"]
  }
];

export default function HelpScreen() {
  const [selectedPrompt, setSelectedPrompt] = useState<string>(promptChips[0] ?? "What is happening now?");
  const [customQuestion, setCustomQuestion] = useState("");
  const { demoEnabled, snapshot, nowUtc } = useSummitDemo();
  const { current, upcoming } = getNowAndUpcoming({
    audienceGroups: ["public"],
    nowUtc,
    snapshot
  });
  const answer = useMemo(
    () =>
      getLocalConciergeAnswer({
        prompt: selectedPrompt,
        snapshot,
        nowUtc,
        current,
        upcoming,
        demoEnabled
      }),
    [selectedPrompt, snapshot, nowUtc, current, upcoming, demoEnabled]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ImageBackground source={summitArt} resizeMode="cover" imageStyle={styles.heroImage} style={styles.hero}>
          <View style={styles.heroScrim}>
            <Text style={styles.kicker}>Ask AI</Text>
            <Text style={styles.title}>Your summit concierge.</Text>
            <Text style={styles.copy}>
              Local prototype answers for the schedule, venue, speakers, and summit context.
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.promptPanel}>
          <Text style={styles.promptTitle}>How can I help today?</Text>
          <View style={styles.chipGrid}>
            {promptChips.map((prompt) => (
              <Pressable
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
              accessibilityLabel="Ask the local schedule concierge"
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
              accessibilityRole="button"
              onPress={() => {
                const question = customQuestion.trim();
                if (question.length > 0) {
                  setSelectedPrompt(question);
                }
              }}
              style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.answerPanel}>
          <Text style={styles.answerKicker}>{demoEnabled ? "Demo answer" : "Prototype answer"}</Text>
          <Text style={styles.answerTitle}>{answer.title}</Text>
          <Text style={styles.answerBody}>{answer.body}</Text>
          {answer.items.length > 0 ? (
            <View style={styles.answerList}>
              {answer.items.map((item, index) => (
                <Link key={`${item.id}-${item.startUtc}-${index}`} href={{ pathname: "/session/[id]", params: { id: item.id } }} asChild>
                  <Pressable style={({ pressed }) => [styles.answerItem, pressed && styles.pressed]}>
                    <Text style={styles.answerItemTime}>{toEventTimeRange(item, snapshot.event.timeZone)}</Text>
                    <Text style={styles.answerItemTitle}>{item.title}</Text>
                    <Text style={styles.answerItemMeta}>{item.locationName}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <CapabilityRow title="Schedule answers" body="Grounded in the same published agenda used by Home and Schedule." />
          <CapabilityRow title="Summit knowledge" body="Preloaded with approved public website context until the real AI service is connected." />
          <CapabilityRow title="Human escalation" body="Sensitive or unresolved requests should route to a trained event team member." />
        </View>

        <Link href="/schedule" asChild>
          <Pressable style={({ pressed }) => [styles.scheduleLink, pressed && styles.pressed]}>
            <Text style={styles.scheduleLinkText}>Open Full Schedule</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function getLocalConciergeAnswer({
  prompt,
  snapshot,
  nowUtc,
  current,
  upcoming,
  demoEnabled
}: {
  prompt: string;
  snapshot: EventSnapshot;
  nowUtc: string;
  current: ScheduleItem[];
  upcoming: ScheduleItem[];
  demoEnabled: boolean;
}) {
  const normalizedPrompt = prompt.toLowerCase();
  const allItems = [...snapshot.scheduleItems].sort((left, right) => left.startUtc.localeCompare(right.startUtc));
  const firstUpcoming = upcoming[0] ?? allItems.find((item) => item.published);
  const currentItem = current[0];
  const answerMode = demoEnabled ? "Demo Mode is on, so this answer uses the live-day demo timeline." : "This answer uses the current prototype schedule loaded from last year's production timeline.";
  const featuredPerson = findFeaturedPerson(normalizedPrompt);

  if (allItems.length === 0) {
    return {
      title: "No schedule is loaded yet.",
      body: `${summitKnowledge.purpose} The concierge will add agenda-specific answers once staff publishes sessions.`,
      items: []
    };
  }

  if (matchesAny(normalizedPrompt, ["crisis", "suicide", "self-harm", "self harm", "emergency", "unsafe", "hurt myself"])) {
    return {
      title: "Please get immediate human support.",
      body:
        "This app is not emergency or crisis care. If you are in immediate danger, call local emergency services now. In the United States, call or text 988 for the 988 Suicide & Crisis Lifeline, or use 988lifeline.org/chat/.",
      items: []
    };
  }

  if (matchesAny(normalizedPrompt, ["inspiring children", "foundation", "icf", "nonprofit", "charity"])) {
    return {
      title: "Inspiring Children Foundation is the nonprofit behind the summit.",
      body:
        "ICF is a 501(c)(3) nonprofit based in Las Vegas with more than 25 years of work helping young people facing financial hardship, anxiety, depression, and suicidal ideation. Its model connects physical health, emotional wellbeing, academics, athletics, creativity, entrepreneurship, and service.",
      items: []
    };
  }

  if (featuredPerson) {
    const personItems = findItems(allItems, featuredPerson.aliases);
    const asksForTiming = matchesAny(normalizedPrompt, [
      "when",
      "time",
      "schedule",
      "appearance",
      "appearence",
      "appearing",
      "speaking",
      "session",
      "where"
    ]);

    const firstItem = personItems[0];
    if (firstItem) {
      return {
        title: `${featuredPerson.name} is in the loaded schedule.`,
        body: `${featuredPerson.name} is listed as ${featuredPerson.role}. The first matching app session is ${firstItem.title}, scheduled for ${toEventTimeRange(firstItem, snapshot.event.timeZone)} in ${firstItem.locationName}.`,
        items: personItems.slice(0, 5)
      };
    }

    return {
      title: asksForTiming
        ? `${featuredPerson.name} does not have a scheduled app time yet.`
        : `${featuredPerson.name} is listed in public summit materials.`,
      body: asksForTiming
        ? `${featuredPerson.name} is listed publicly as ${featuredPerson.role} in ${featuredPerson.group}, but the current loaded prototype schedule does not include a specific session time or room for them yet. Once staff adds or publishes that session, this answer will show the exact time and location.`
        : `${featuredPerson.name} is listed publicly as ${featuredPerson.role} in ${featuredPerson.group}. No dedicated session card is loaded for them in the prototype schedule yet.`,
      items: []
    };
  }

  if (matchesAny(normalizedPrompt, ["what is", "about", "mission", "purpose", "davos", "human development", "summit"])) {
    return {
      title: `Not Alone Summit is ${summitKnowledge.tagline}.`,
      body: `${summitKnowledge.purpose} ${summitKnowledge.community} It takes place ${summitKnowledge.dates} at ${summitKnowledge.venue}. ${summitKnowledge.presenting}`,
      items: uniqueScheduleItems([firstUpcoming, ...upcoming.slice(0, 3)].filter(Boolean) as ScheduleItem[])
    };
  }

  if (matchesAny(normalizedPrompt, ["who", "featured", "speaker", "speakers", "celebrity", "celebrities", "athlete", "athletes", "expert", "experts", "musician", "musicians"])) {
    const speakerItems = findItems(allItems, [
      "panel",
      "speaker",
      "jewel",
      "wozniak",
      "mike tyson",
      "loni love",
      "jason kennedy",
      "rachel platten",
      "performance"
    ]);
    return {
      title: "The summit is built around high-trust voices.",
      body: summitKnowledge.featured,
      items: speakerItems.slice(0, 5)
    };
  }

  if (matchesAny(normalizedPrompt, ["host", "hosts", "chair", "chairs", "cochair", "co-chair", "loni", "jason", "steve wozniak", "wozniak", "cherrial"])) {
    return {
      title: "Here are the public host and chair details.",
      body: summitKnowledge.hosts,
      items: findItems(allItems, ["wozniak", "jewel", "awards", "opening"]).slice(0, 4)
    };
  }

  if (matchesAny(normalizedPrompt, ["when", "date", "dates", "november"])) {
    return {
      title: `The summit is scheduled for ${summitKnowledge.dates}.`,
      body: `The prototype schedule is organized around ${summitKnowledge.dates}. Final session times should still be verified by staff before publishing to attendees.`,
      items: allItems.slice(0, 4)
    };
  }

  if (matchesAny(normalizedPrompt, ["venue", "wynn", "hotel", "las vegas", "address"])) {
    return {
      title: `The summit venue is ${summitKnowledge.venue}.`,
      body:
        "The current prototype schedule uses Wynn room and wayfinding labels so the app can guide attendees by session location. Final room assignments should be confirmed before launch.",
      items: uniqueScheduleItems([currentItem, firstUpcoming, ...upcoming.slice(0, 3)].filter(Boolean) as ScheduleItem[])
    };
  }

  if (matchesAny(normalizedPrompt, ["registration", "check in", "check-in", "credential", "badge", "arrive", "arrival"])) {
    const registrationItems = findItems(allItems, ["registration", "check in", "credential", "gifting", "wellness rooms open"]);
    return {
      title: "Check-in guidance is schedule-grounded.",
      body: summitKnowledge.checkIn,
      items: registrationItems.length > 0 ? registrationItems.slice(0, 4) : uniqueScheduleItems([firstUpcoming].filter(Boolean) as ScheduleItem[])
    };
  }

  if (matchesAny(normalizedPrompt, ["format", "formats", "workshop", "workshops", "panel", "panels", "debate", "debates", "award", "awards", "concert", "concerts", "fitness", "yoga", "vip", "experience"])) {
    return {
      title: "The summit is designed as a full experience, not just talks.",
      body: summitKnowledge.formats,
      items: findItems(allItems, ["panel", "workshop", "awards", "concert", "fitness", "yoga", "vip", "dinner"]).slice(0, 5)
    };
  }

  if (matchesAny(normalizedPrompt, ["sponsor", "sponsors", "presented", "powered", "villa", "cohen"])) {
    return {
      title: "Here is the public presenting information.",
      body: summitKnowledge.presenting,
      items: []
    };
  }

  if (matchesAny(normalizedPrompt, ["quiet", "break", "calm", "rest", "meditation", "breathe"])) {
    const quietItems = findItems(allItems, ["meditation", "breathwork", "reset", "stretching", "wellness", "sauna"]);
    return {
      title: "For a quieter reset, use the wellness programming.",
      body:
        "The calmest prototype options are meditation, breathwork, stretching, and wellness-room sessions. Check the room name before walking over, because the final 2026 room plan may change.",
      items: quietItems.slice(0, 4)
    };
  }

  if (matchesAny(normalizedPrompt, ["tonight", "evening", "dinner", "show", "concert", "awards", "red carpet"])) {
    const eveningItems = allItems.filter((item) => {
      const hour = new Date(item.startUtc).getUTCHours() - 8;
      return hour >= 17 || matchesAny(searchText(item), ["dinner", "performance", "awards", "concert", "red carpet", "jewel", "rachel"]);
    });
    return {
      title: "Tonight centers on dinner, performances, and awards moments.",
      body: "The prototype evening flow includes founder dinner, opening night performances, the Not Alone Awards, and the closing dinner/concert. Visibility labels show which moments are invite-only.",
      items: eveningItems.slice(0, 5)
    };
  }

  if (matchesAny(normalizedPrompt, ["jewel", "music", "performance"])) {
    const musicItems = findItems(allItems, ["jewel", "performance", "music", "concert", "harry hudson", "rachel platten"]);
    return {
      title: "Here are the prototype music moments.",
      body: "These are adapted from the prior summit timeline and should be replaced with approved 2026 artist details when confirmed.",
      items: musicItems.slice(0, 5)
    };
  }

  if (matchesAny(normalizedPrompt, ["founder", "vip", "private", "invite"])) {
    const founderItems = allItems.filter((item) => item.visibilityScope.id === "founders");
    return {
      title: "Founder-only moments are labeled clearly.",
      body: "The current prototype schedule includes founder cocktails and Founder's Dinner. These are separated with a Founders only visibility label so the app can later support audience-specific experiences.",
      items: founderItems
    };
  }

  if (matchesAny(normalizedPrompt, ["community"])) {
    const communityItems = allItems.filter((item) => item.visibilityScope.id === "community");
    return {
      title: "Community Day has its own prototype flow.",
      body: "The current schedule includes pickleball, life-plan workshop, DBT, emotional intelligence, panels, lunch, and a closing mindfulness/music moment for Community Day.",
      items: communityItems.slice(0, 6)
    };
  }

  if (matchesAny(normalizedPrompt, ["lunch", "food", "eat", "meal"])) {
    const mealItems = findItems(allItems, ["lunch", "dinner", "nourish"]);
    return {
      title: "Meals are already represented in the prototype agenda.",
      body: "Lunch and dinner blocks are included so the app can preview reminders, venue routing, and day planning around food moments.",
      items: mealItems.slice(0, 5)
    };
  }

  if (matchesAny(normalizedPrompt, ["where", "go", "next", "room", "location", "map"])) {
    if (currentItem) {
      return {
        title: `Head to ${currentItem.locationName}.`,
        body: `${currentItem.title} is happening now from ${toEventTimeRange(currentItem, snapshot.event.timeZone)}. ${firstUpcoming ? `After that, ${firstUpcoming.title} is next.` : answerMode}`,
        items: uniqueScheduleItems([currentItem, ...upcoming.slice(0, 2)])
      };
    }

    return {
      title: firstUpcoming ? `Your next stop is ${firstUpcoming.locationName}.` : "No next session found.",
      body: firstUpcoming
        ? `${firstUpcoming.title} begins ${toEventTimeRange(firstUpcoming, snapshot.event.timeZone)}. ${answerMode}`
        : "There is no upcoming session in the current schedule.",
      items: firstUpcoming ? uniqueScheduleItems([firstUpcoming, ...upcoming.slice(1, 3)]) : []
    };
  }

  if (matchesAny(normalizedPrompt, ["now", "happening", "current", "live"])) {
    if (currentItem) {
      return {
        title: "Here is what is happening now.",
        body: `${currentItem.title} is live from ${toEventTimeRange(currentItem, snapshot.event.timeZone)} in ${currentItem.locationName}.`,
        items: uniqueScheduleItems([currentItem, ...upcoming.slice(0, 2)])
      };
    }

    return {
      title: "Nothing is live at this moment yet.",
      body: firstUpcoming
        ? `The next prototype session is ${firstUpcoming.title}, scheduled for ${toEventTimeRange(firstUpcoming, snapshot.event.timeZone)} in ${firstUpcoming.locationName}. ${answerMode}`
        : "No upcoming session is available.",
      items: firstUpcoming ? uniqueScheduleItems([firstUpcoming, ...upcoming.slice(0, 2)]) : []
    };
  }

  const matchingItems = findItems(allItems, normalizedPrompt.split(/\s+/).filter((word) => word.length > 3));
  if (matchingItems.length > 0) {
    return {
      title: "I found schedule matches for that.",
      body: "These are the closest prototype agenda items from the currently loaded schedule.",
      items: matchingItems.slice(0, 5)
    };
  }

  return {
    title: "Here is the best current guidance.",
    body: firstUpcoming
      ? `${answerMode} The next known item is ${firstUpcoming.title} at ${toEventTimeRange(firstUpcoming, snapshot.event.timeZone)} in ${firstUpcoming.locationName}.`
      : `${answerMode} Open the full schedule for all loaded prototype sessions.`,
    items: firstUpcoming ? uniqueScheduleItems([firstUpcoming, ...upcoming.slice(0, 4)]) : allItems.slice(0, 4)
  };
}

function uniqueScheduleItems(items: ScheduleItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function findItems(items: ScheduleItem[], terms: string[]) {
  return uniqueScheduleItems(items.filter((item) => matchesAny(searchText(item), terms)));
}

function searchText(item: ScheduleItem) {
  return `${item.title} ${item.shortTitle} ${item.summary} ${item.description} ${item.locationName} ${item.visibilityScope.label}`.toLowerCase();
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function findFeaturedPerson(prompt: string) {
  return featuredPeople.find((person) => matchesAny(prompt, person.aliases));
}

function CapabilityRow({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.helpRow}>
      <Text style={styles.helpTitle}>{title}</Text>
      <Text style={styles.helpBody}>{body}</Text>
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
  hero: {
    backgroundColor: colors.midnight,
    borderColor: "rgba(230, 192, 111, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 220,
    overflow: "hidden"
  },
  heroImage: {
    borderRadius: 8
  },
  heroScrim: {
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
    fontSize: 39,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 43,
    marginTop: spacing.xs
  },
  copy: {
    color: colors.surfaceMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md
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
    color: colors.muted,
    fontSize: 14
  },
  sendButton: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
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
  panel: {
    backgroundColor: "rgba(13, 21, 48, 0.72)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg
  },
  helpRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg
  },
  helpTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    fontWeight: "700"
  },
  helpBody: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs
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
