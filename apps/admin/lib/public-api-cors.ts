import { NextResponse } from "next/server";

const allowedHeaders = "Cache-Control, Content-Type";

export function publicApiCorsHeaders(methods: readonly string[]) {
  return {
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Max-Age": "86400"
  } as const;
}

export function publicApiOptions(methods: readonly string[]) {
  return new NextResponse(null, {
    status: 204,
    headers: publicApiCorsHeaders(methods)
  });
}
