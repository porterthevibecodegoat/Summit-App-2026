import type { ExpoConfig } from "expo/config";
import { publicAppConfig } from "@not-alone/config";

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "replace-with-eas-project-id";

const config: ExpoConfig = {
  name: publicAppConfig.appName,
  slug: publicAppConfig.appSlug,
  scheme: "notalone",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: publicAppConfig.iosBundleIdentifier,
    infoPlist: {
      NSUserNotificationsUsageDescription:
        "Notifications provide schedule reminders and urgent event changes for Not Alone Summit."
    }
  },
  updates: {
    url: `https://u.expo.dev/${easProjectId}`,
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0
  },
  runtimeVersion: "0.1.0",
  extra: {
    eas: {
      projectId: easProjectId
    },
    appEnv: publicAppConfig.environmentName,
    eventId: publicAppConfig.eventId,
    apiBaseUrl: publicAppConfig.apiBaseUrl
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-notifications",
    "expo-updates",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#F7F5F0"
      }
    ]
  ]
};

export default config;
