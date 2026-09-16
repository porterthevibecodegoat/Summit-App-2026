import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@not-alone/design-tokens";
import { publishedAwardsProgram } from "@not-alone/domain";
import { useSummit } from "../../components/summit-context";
import { useResponsiveLayout } from "../../components/responsive-layout";

export default function AwardsScreen() {
  const { snapshot } = useSummit();
  const layout = useResponsiveLayout();
  const program = publishedAwardsProgram(snapshot);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={[layout.contentStyle, layout.paddingStyle, styles.content]}>
    <Text style={styles.eyebrow}>Not Alone Awards 2026</Text>
    <Text style={styles.title}>{program?.title ?? "2026 Awards"}</Text>
    <Text style={styles.copy}>{program?.body ?? "The 2026 awards program will appear here when confirmed by the event team."}</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: 120 },
  eyebrow: { color: colors.accent, fontFamily: typography.bold, fontSize: 12 },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 30, lineHeight: 36, marginTop: 12 },
  copy: { color: colors.body, fontSize: 16, lineHeight: 25, marginTop: 24 }
});
