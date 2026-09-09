import type { ExpoConfig } from "expo/config";
import { publicAppConfig } from "@not-alone/config";

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const hasEasProject = Boolean(
  easProjectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(easProjectId)
);
const pushDeliveryEnabled = process.env.EXPO_PUBLIC_ENABLE_PUSH_DELIVERY === "true";

const config: ExpoConfig = {
  name: publicAppConfig.appName,
  slug: publicAppConfig.appSlug,
  scheme: "notalone",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon-premium.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: publicAppConfig.iosBundleIdentifier,
    infoPlist: {
      NSUserNotificationsUsageDescription:
        "Notifications provide schedule reminders and urgent event changes for Not Alone Summit."
    }
  },
  updates: hasEasProject
    ? {
        url: `https://u.expo.dev/${easProjectId}`,
        enabled: true,
        checkAutomatically: "ON_LOAD",
        fallbackToCacheTimeout: 0
      }
    : {
        enabled: false
      },
  runtimeVersion: "0.1.0",
  extra: {
    eas: {
      projectId: hasEasProject ? easProjectId : undefined
    },
    appEnv: publicAppConfig.environmentName,
    eventId: publicAppConfig.eventId,
    apiBaseUrl: publicAppConfig.apiBaseUrl,
    pushDeliveryEnabled
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-notifications",
    "expo-updates",
    [
      "expo-splash-screen",
      {
        image: "./assets/icon-premium.png",
        resizeMode: "contain",
        backgroundColor: "#06102B"
      }
    ]
  ]
};

export default config;
