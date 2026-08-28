"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import { AUTH_LOGOUT_EVENT } from "@/lib/auth/logout-destinations";

/**
 * Who is signed in, resolved once for the whole app.
 *
 * The site header and the bottom navigation are both mounted by the root
 * layout, and each of them used to answer this question on its own: a
 * `getUser()` call against the auth server, then — because the role is not in
 * the JWT — a `profiles` read and possibly a `users` read to find it. Two
 * components, the same four network round trips, on every page of the site,
 * with the chrome sitting in its signed-out state until they came back.
 *
 * They share this now, so it happens once.
 *
 * The role is also cached in `sessionStorage`, keyed by user id. A role does
 * not change between two page views, and re-reading it on every navigation
 * was the part a customer actually felt: the header and the tab bar would
 * flip from their guest shape to their signed-in shape a moment after the
 * page appeared. On a fresh tab the cache is cold and it is looked up once.
 */

export type AppRole = "admin" | "agent" | "customer" | "agency_partner";

const ROLE_VALUES = ["admin", "agent", "customer", "agency_partner"];
const ADMIN_ALIASES = new Set(["super_admin", "staff", "team", "employee", "processor"]);
const PARTNER_ALIASES = new Set(["agent", "agency_partner"]);

function isAppRole(role: string): role is AppRole {
  return ROLE_VALUES.includes(role);
}

function normalise(value: unknown): AppRole | null {
  const role = String(value ?? "").toLowerCase();
  if (ADMIN_ALIASES.has(role)) return "admin";
  if (PARTNER_ALIASES.has(role)) return "agency_partner";
  return isAppRole(role) ? role : null;
}

const CACHE_PREFIX = "dc:role:";

function readCachedRole(userId: string): AppRole | null {
  try {
    return normalise(window.sessionStorage.getItem(CACHE_PREFIX + userId));
  } catch {
    // Private browsing, or storage disabled. Falling through to a lookup is
    // the correct behaviour, not an error.
    return null;
  }
}

function cacheRole(userId: string, role: AppRole) {
  try {
    window.sessionStorage.setItem(CACHE_PREFIX + userId, role);
  } catch {
    // Not being able to cache is not worth telling anyone about.
  }
}

async function resolveRole(user: User): Promise<AppRole> {
  const cached = readCachedRole(user.id);
  if (cached) return cached;

  const fromMetadata = normalise(user.user_metadata.role);
  if (fromMetadata) {
    cacheRole(user.id, fromMetadata);
    return fromMetadata;
  }

  const email = (user.email ?? "").toLowerCase();
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (email && adminEmails.includes(email)) {
    cacheRole(user.id, "admin");
    return "admin";
  }

  const supabase = createClient();
  if (!supabase) return "customer";

  try {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const fromProfile = normalise(profile?.role);
    if (fromProfile) {
      cacheRole(user.id, fromProfile);
      return fromProfile;
    }

    const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    const fromUsers = normalise(portalUser?.role) ?? "customer";
    cacheRole(user.id, fromUsers);
    return fromUsers;
  } catch {
    return "customer";
  }
}

export interface AppSession {
  user: User | null;
  role: AppRole | null;
  /** False until the first answer arrives, so chrome can avoid flashing. */
  ready: boolean;
}

const SessionContext = createContext<AppSession>({ user: null, role: null, ready: false });

export function useAppSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppSession>({ user: null, role: null, ready: false });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();
    if (!supabase) {
      setState({ user: null, role: null, ready: true });
      return;
    }

    let mounted = true;

    const signOut = () => {
      if (mounted) setState({ user: null, role: null, ready: true });
    };

    const adopt = async (next: User | null) => {
      if (!mounted) return;
      if (!next) {
        signOut();
        return;
      }
      // The user lands first so the chrome can switch out of its guest shape
      // straight away; the role follows, usually from cache and instantly.
      setState({ user: next, role: readCachedRole(next.id), ready: true });
      const role = await resolveRole(next);
      if (mounted) setState({ user: next, role, ready: true });
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, signOut);

    // `loggedOut=1` means a sign-out just happened: treat the visitor as a
    // guest even if a stale session briefly reads back.
    const loggedOut = new URLSearchParams(window.location.search).get("loggedOut") === "1";
    if (loggedOut) signOut();

    void supabase.auth.getUser().then(({ data }) => {
      if (loggedOut) {
        signOut();
        return;
      }
      void adopt(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        signOut();
        return;
      }
      if (new URLSearchParams(window.location.search).get("loggedOut") === "1") {
        signOut();
        return;
      }
      void adopt(session.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(AUTH_LOGOUT_EVENT, signOut);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
