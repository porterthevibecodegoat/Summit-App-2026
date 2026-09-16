import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { directoryCategorySchema, type Speaker } from "@not-alone/validation";

export function PublishedPeople({ people }: { people: Speaker[] }) {
  const [selected, setSelected] = useState("All");
  const personCategories = (person: Speaker) => person.directoryCategories?.length ? person.directoryCategories : ["Attendees"];
  const categories = ["All", ...directoryCategorySchema.options.filter(category => people.some(person => personCategories(person).includes(category)))];
  const active = categories.includes(selected) ? selected : "All";
  const visible = people.filter(person => active === "All" || personCategories(person).includes(active));
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>People</Text>
    <ScrollView horizontal contentContainerStyle={styles.tabs} showsHorizontalScrollIndicator={false}>{categories.map(category => <Pressable key={category} accessibilityRole="tab" accessibilityState={{ selected: active === category }} aria-selected={active === category} onPress={() => setSelected(category)} style={[styles.tab, active === category && styles.active]}><Text style={[styles.label, active === category && styles.activeLabel]}>{category}</Text></Pressable>)}</ScrollView>
    {!visible.length && <Text style={styles.body}>Confirmed guests will appear here after event-team approval.</Text>}
    <View style={styles.grid}>{visible.map(person => <View key={person.id} style={styles.person}>
      {person.headshotUrl ? <Image source={{ uri: person.headshotUrl }} accessibilityLabel={person.name} style={styles.image} /> : null}
      <Text style={styles.name}>{person.name}</Text><Text style={styles.body}>{person.role}</Text>
      {person.bio ? <Text style={styles.body}>{person.bio}</Text> : null}
    </View>)}</View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 120, width: "100%", maxWidth: 1100, alignSelf: "center" },
  title: { fontFamily: typography.display, fontSize: 34, color: colors.plum },
  tabs: { gap: 8, paddingVertical: 20 },
  tab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  active: { backgroundColor: colors.plum },
  label: { color: colors.ink, fontFamily: typography.semibold },
  activeLabel: { color: "white" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  person: { flexGrow: 1, flexBasis: 280, maxWidth: "100%", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  image: { width: "100%", aspectRatio: 1, resizeMode: "cover", borderRadius: 8 },
  name: { fontFamily: typography.semibold, fontSize: 21, color: colors.ink },
  body: { color: colors.body, fontSize: 15, lineHeight: 23 }
});
