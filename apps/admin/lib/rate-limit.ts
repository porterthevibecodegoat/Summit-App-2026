import type { NextRequest } from "next/server";

type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  options: { limit: number; windowMs: number }
) {
  const now = Date.now();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientId = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const key = `${scope}:${clientId}`;
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 2_000) {
    for (const [bucketKey, candidate] of buckets) {
      if (candidate.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const remaining = Math.max(options.limit - bucket.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1_000), 1);
  return {
    allowed: bucket.count <= options.limit,
    retryAfterSeconds,
    headers: {
      "RateLimit-Limit": String(options.limit),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1_000))
    }
  };
}
