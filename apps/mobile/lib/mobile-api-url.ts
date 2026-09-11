const loopbackHosts = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);

export function resolveMobileApiBaseUrl(configuredUrl: unknown, fallbackUrl: string) {
  if (typeof configuredUrl === "string") {
    try {
      const url = new URL(configuredUrl);
      const isSecure = url.protocol === "https:";
      const isLocalDevelopment = url.protocol === "http:" && loopbackHosts.has(url.hostname);

      if (isSecure || isLocalDevelopment) {
        return configuredUrl.replace(/\/+$/, "");
      }
    } catch {
      // Invalid runtime configuration falls back to the validated public app config.
    }
  }

  return fallbackUrl.replace(/\/+$/, "");
}
