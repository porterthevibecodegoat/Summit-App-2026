import { Tabs } from "expo-router";
import { CalendarDays, House, Info, Map, Sparkles, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@not-alone/design-tokens";
import { useResponsiveLayout } from "../../components/responsive-layout";

const tabScreens = [
  { name: "index", title: "Home", icon: House },
  { name: "schedule", title: "Schedule", icon: CalendarDays },
  { name: "help", title: "Ask AI", icon: Sparkles },
  { name: "map", title: "Map", icon: Map },
  { name: "info", title: "Info", icon: Info }
] as const;

export default function TabsLayout() {
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const compact = layout.compact || layout.short;
  const bottomInset = Math.max(insets.bottom, compact ? 5 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: typography.semibold, fontSize: compact ? 9 : 11 },
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: colors.border,
          height: (compact ? 54 : 62) + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: compact ? 6 : 9
        }
      }}
    >
      {tabScreens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} icon={screen.icon} />
          }}
        />
      ))}
    </Tabs>
  );
}

function TabIcon({ color, focused, icon: Icon }: { color: ColorValue; focused: boolean; icon: LucideIcon }) {
  return <Icon color={color} size={22} strokeWidth={focused ? 2.5 : 2} />;
}

const styles = StyleSheet.create({
  tabBarBackground: {
    backgroundColor: "rgba(9, 15, 36, 0.98)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  }
});
