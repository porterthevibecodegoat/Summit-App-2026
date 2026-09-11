import Constants from "expo-constants";
import { publicAppConfig } from "@not-alone/config";
import { resolveMobileApiBaseUrl } from "./mobile-api-url";

export const mobileApiBaseUrl = resolveMobileApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBaseUrl,
  publicAppConfig.apiBaseUrl
);
