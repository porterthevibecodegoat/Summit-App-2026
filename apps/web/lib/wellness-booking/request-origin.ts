// Next may normalize loopback URLs or use an internal URL behind the hosting
// proxy. Compare against the incoming Host authority, which browser scripts
// cannot override. Do not trust an arbitrary X-Forwarded-Host value.
export function sameWebsiteOrigin(request: Request): boolean {
  const raw = request.headers.get("origin");
  if (!raw) return false;
  try {
    const origin = new URL(raw), target = new URL(request.url);
    const host = request.headers.get("host") ?? target.host;
    if (origin.origin !== raw || origin.host !== host.toLowerCase()) return false;
    if (origin.protocol === "https:") return true;
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return origin.protocol === "http:" && target.protocol === "http:" && loopback.has(origin.hostname) && loopback.has(target.hostname);
  } catch { return false; }
}
