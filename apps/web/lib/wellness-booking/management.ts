import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({ purpose: z.literal("wellness-management-v1"), intakeId: z.uuid(), attendeeKey: z.string().regex(/^[a-f0-9]{64}$/), expires: z.number().int().positive() }).strict();
const requireSecret = (secret: string) => { if (secret.length < 32) throw new Error("Wellness management is not configured."); };
const signature = (encoded: string, secret: string) => createHmac("sha256", secret).update(`wellness-management:${encoded}`).digest();

export function managementToken(intakeId: string, attendeeKey: string, expires: Date, secret: string) {
  requireSecret(secret);
  const encoded = Buffer.from(JSON.stringify(payloadSchema.parse({ purpose: "wellness-management-v1", intakeId, attendeeKey, expires: Math.floor(expires.getTime() / 1000) }))).toString("base64url");
  return `${encoded}.${signature(encoded, secret).toString("base64url")}`;
}

export function readManagementToken(token: string, secret: string, now: Date) {
  requireSecret(secret);
  if (token.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error("This private link is invalid or has expired.");
  const [encoded, signed] = token.split(".") as [string, string];
  const supplied = Buffer.from(signed, "base64url"), expected = signature(encoded, secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("This private link is invalid or has expired.");
  const payload = payloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  if (payload.expires * 1000 <= now.getTime()) throw new Error("This private link is invalid or has expired.");
  return payload;
}
