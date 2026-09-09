import { Tabs } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "@not-alone/design-tokens";

const tabScreens = [
  { name: "index", title: "Home", icon: "house", activeIcon: "house.fill" },
  { name: "schedule", title: "Schedule", icon: "calendar", activeIcon: "calendar" },
  { name: "help", title: "Ask AI", icon: "sparkles", activeIcon: "sparkles" },
  { name: "map", title: "Map", icon: "map", activeIcon: "map.fill" },
  { name: "info", title: "Info", icon: "info.circle", activeIcon: "info.circle.fill" }
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: typography.semibold, fontSize: 11 },
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: colors.border,
          height: 86,
          paddingBottom: 24,
          paddingTop: 10
        }
      }}
    >
      {tabScreens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ color, focused }) => (
              <SymbolView
                name={(focused ? screen.activeIcon : screen.icon) as SFSymbol}
                size={22}
                tintColor={color}
                fallback={<Text style={{ color, fontFamily: typography.bold, fontSize: 16 }}>{screen.title.slice(0, 1)}</Text>}
              />
            )
          }}
        />
      ))}
    </Tabs>
  );
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
