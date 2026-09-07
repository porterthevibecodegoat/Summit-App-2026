"use client";

import { useEffect, useState } from "react";

const ACCESS_TOKEN_KEY = "not-alone.staff.supabaseAccessToken";
const REFRESH_TOKEN_KEY = "not-alone.staff.supabaseRefreshToken";
const TOKEN_EXPIRES_AT_KEY = "not-alone.staff.supabaseTokenExpiresAt";

type AuthState = "checking" | "signed-in" | "signed-out";
type StaffSession = {
  mode: "local-adapter" | "supabase";
  role: "VIEWER" | "EDITOR" | "PUBLISHER" | "ADMIN";
};

export function StaffAuthBridge() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const expiresIn = Number(hash.get("expires_in") ?? 0);

    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      if (Number.isFinite(expiresIn) && expiresIn > 0) {
        window.localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
      }
      window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
      window.dispatchEvent(new Event("not-alone-staff-auth-changed"));
    }

    void verifyStaffSession();

    function handleAuthChange() {
      void verifyStaffSession();
    }

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("not-alone-staff-auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("not-alone-staff-auth-changed", handleAuthChange);
    };
  }, []);

  async function verifyStaffSession() {
    setAuthState("checking");
    try {
      const response = await fetch("/api/staff/me", {
        headers: getStaffAuthHeaders(),
        cache: "no-store"
      });
      const result = (await response.json()) as { ok?: boolean; mode?: StaffSession["mode"]; role?: StaffSession["role"] };

      if (!response.ok || !result.ok || !result.mode || !result.role) {
        throw new Error("Staff session is not authorized.");
      }

      setStaffSession({
        mode: result.mode,
        role: result.role
      });
      setAuthState("signed-in");
    } catch {
      setStaffSession(null);
      setAuthState("signed-out");
    }
  }

  function signOut() {
    clearStoredStaffSession();
    setStaffSession(null);
    window.dispatchEvent(new Event("not-alone-staff-auth-changed"));
  }

  return (
    <div className={`staffAuthBridge ${authState === "signed-in" ? "signedIn" : ""}`} aria-live="polite">
      <span>
        {authState === "checking"
          ? "Checking staff session"
          : authState === "signed-in"
            ? `Staff ${staffSession?.role ?? "session"} active`
            : "Staff sign-in needed"}
      </span>
      {staffSession ? <span>{staffSession.mode}</span> : null}
      {authState === "signed-in" ? (
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      ) : null}
    </div>
  );
}

export function getStaffAuthHeaders() {
  const token = getStoredStaffAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getStoredStaffAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const expiresAt = Number(window.localStorage.getItem(TOKEN_EXPIRES_AT_KEY) ?? 0);
  if (expiresAt > 0 && expiresAt <= Date.now()) {
    clearStoredStaffSession();
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearStoredStaffSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}
