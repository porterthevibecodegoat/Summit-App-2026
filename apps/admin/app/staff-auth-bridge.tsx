"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type AuthState = "checking" | "signed-in" | "signed-out";
type StaffSession = {
  mode: "local-adapter" | "supabase";
  role: "VIEWER" | "EDITOR" | "PUBLISHER" | "ADMIN";
};

const LEGACY_ACCESS_TOKEN_KEY = "not-alone.staff.supabaseAccessToken";
const LEGACY_REFRESH_TOKEN_KEY = "not-alone.staff.supabaseRefreshToken";
const LEGACY_EXPIRES_AT_KEY = "not-alone.staff.supabaseTokenExpiresAt";
const AUTH_REQUEST_TIMEOUT_MS = 8000;

export function StaffAuthBridge({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    let active = true;

    void bootstrapSession();

    async function bootstrapSession() {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token") ?? window.localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
        const refreshToken = hash.get("refresh_token") ?? window.localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
        const legacyExpiresAt = Number(window.localStorage.getItem(LEGACY_EXPIRES_AT_KEY) ?? 0);
        const expiresIn = Number(hash.get("expires_in") ?? 0) || Math.max(Math.floor((legacyExpiresAt - Date.now()) / 1_000), 0);

        if (accessToken) {
          window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
          const exchange = await fetchWithTimeout("/api/staff/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, refreshToken, expiresIn }),
            cache: "no-store"
          });
          if (!exchange.ok) {
            const result = (await exchange.json().catch(() => ({}))) as { error?: string };
            clearLegacySession();
            if (active) {
              setAuthMessage(result.error ?? "The secure sign-in link could not be verified.");
              setAuthState("signed-out");
            }
            return;
          }
          clearLegacySession();
          router.refresh();
        }

        if (active) {
          await verifyStaffSession();
        }
      } catch (error) {
        clearLegacySession();
        if (active) {
          setStaffSession(null);
          setAuthMessage(error instanceof Error && error.name !== "AbortError"
            ? error.message
            : "The staff session service did not respond. Please sign in again.");
          setAuthState("signed-out");
        }
      }
    }

    return () => {
      active = false;
    };
  }, [router]);

  async function verifyStaffSession() {
    setAuthState("checking");
    try {
      let response = await fetchWithTimeout("/api/staff/me", { cache: "no-store" });
      if (response.status === 401) {
        const refreshed = await fetchWithTimeout("/api/staff/session", { method: "PATCH", cache: "no-store" });
        if (refreshed.ok) {
          response = await fetchWithTimeout("/api/staff/me", { cache: "no-store" });
        }
      }

      const result = (await response.json()) as {
        ok?: boolean;
        mode?: StaffSession["mode"];
        role?: StaffSession["role"];
      };
      if (!response.ok || !result.ok || !result.mode || !result.role) {
        throw new Error("Staff session is not authorized.");
      }

      setStaffSession({ mode: result.mode, role: result.role });
      setAuthState("signed-in");
    } catch {
      setStaffSession(null);
      setAuthState("signed-out");
    }
  }

  async function requestSignInLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setAuthMessage("Enter a valid staff email address.");
      return;
    }

    setSendingLink(true);
    setAuthMessage("Sending a secure sign-in link...");
    try {
      const response = await fetchWithTimeout("/api/staff/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
        cache: "no-store"
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "Unable to send the sign-in link.");
      }
      setAuthMessage("Check your email for the secure staff sign-in link.");
    } catch (error) {
      setAuthMessage(error instanceof Error && error.name !== "AbortError"
        ? error.message
        : "The sign-in service did not respond. Please try again.");
    } finally {
      setSendingLink(false);
    }
  }

  async function signOut() {
    await fetch("/api/staff/session", { method: "DELETE", cache: "no-store" }).catch(() => undefined);
    clearLegacySession();
    setStaffSession(null);
    setAuthState("signed-out");
    router.refresh();
  }

  const publicPage = ["/privacy", "/support"].includes(pathname);
  if (publicPage) return children;

  if (authState !== "signed-in") {
    return (
      <main className="staffLoginShell">
        <section className="staffLoginPanel" aria-live="polite">
          <div className="loginMark">NA</div>
          <div className="kicker">Not Alone Summit</div>
          <h1>{authState === "checking" ? "Checking your staff access" : "Staff sign in"}</h1>
          <p>Use an invited staff email. Every approved staff account receives administrator access.</p>
          {authState === "signed-out" ? (
            <div className="staffSignIn staffSignInPage">
              <input
                aria-label="Staff email"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@organization.org"
                type="email"
                value={email}
              />
              <button disabled={sendingLink} type="button" onClick={requestSignInLink}>
                {sendingLink ? "Sending..." : "Email Secure Sign-In Link"}
              </button>
              {authMessage ? <span className="staffAuthMessage">{authMessage}</span> : null}
            </div>
          ) : <div className="loginProgress" />}
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="staffAuthBridge signedIn" aria-live="polite">
        <span>Staff {staffSession?.role ?? "session"} active</span>
        {staffSession ? <span>{staffSession.mode}</span> : null}
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
      {children}
    </>
  );
}

export function getStaffAuthHeaders(): Record<string, string> {
  return {};
}

function clearLegacySession() {
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_EXPIRES_AT_KEY);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}
