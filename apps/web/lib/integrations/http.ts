import { createHash, timingSafeEqual } from "node:crypto";

export const integrationHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Netlify-CDN-Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function sameSecret(actual: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

export function authenticated(request: Request, secret: string | undefined, allowQuery = false) {
  if (!secret || secret.length < 32) return false;
  const bearer = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  const token = bearer ?? (allowQuery ? new URL(request.url).searchParams.get("token") : null);
  return Boolean(token && sameSecret(token, secret));
}

export function integrationJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: integrationHeaders });
}

export class PayloadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Enforce the actual streamed size as well as Content-Length; never log webhook URLs or bodies.
export async function limitedBody(request: Request, limit = 16_384) {
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new PayloadError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new PayloadError(400, "Missing body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new PayloadError(413, "Request is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
