export const STAFF_ACCESS_COOKIE = "not-alone.staff.access";
export const STAFF_REFRESH_COOKIE = "not-alone.staff.refresh";

export function staffCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production"
  };
}
