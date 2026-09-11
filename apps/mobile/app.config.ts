import type { ExpoConfig } from "expo/config";
import { publicAppConfig } from "@not-alone/config";

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "5a79b65b-7080-4c27-84e1-8eb5e9d119fd";
const hasEasProject = Boolean(
  easProjectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(easProjectId)
);
const pushDeliveryEnabled = process.env.EXPO_PUBLIC_ENABLE_PUSH_DELIVERY === "true";
const appVersion = "1.0.0";

const config: ExpoConfig = {
  name: publicAppConfig.appName,
  owner: "inspiring-children-foundation",
  slug: publicAppConfig.appSlug,
  scheme: "notalone",
  version: appVersion,
  platforms: ["ios", "android", "web"],
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon-premium.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: publicAppConfig.iosBundleIdentifier,
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["fetch", "remote-notification"],
      NSUserNotificationsUsageDescription:
        "Notifications provide schedule reminders and urgent event changes for Not Alone Summit."
    }
  },
  android: {
    package: publicAppConfig.iosBundleIdentifier,
    adaptiveIcon: {
      foregroundImage: "./assets/icon-premium.png",
      backgroundColor: "#06102B"
    }
  },
  web: {
    favicon: "./assets/icon-premium.png",
    backgroundColor: "#06102B",
    bundler: "metro"
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
  runtimeVersion: appVersion,
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
    [
      "expo-router",
      {
        sitemap: false
      }
    ],
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
