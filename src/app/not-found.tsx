import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Home, LayoutGrid, LogIn, ShieldCheck, UserRound } from "lucide-react";

import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";

/**
 * Its own title, and kept out of the index.
 *
 * Without this the 404 inherited the site's homepage title and description, so
 * every mistyped URL a crawler followed looked — to the crawler and in a
 * browser tab — like the front page. `noindex` is the part that matters:
 * indexed 404s dilute the pages that are meant to rank.
 */
export const metadata: Metadata = {
  title: "Page Not Found (404) | DigiConnect Dukan",
  description:
    "The page you are looking for does not exist or has moved. Browse services, track an application, or sign in to your DigiConnect Dukan account.",
  robots: { index: false, follow: true },
};

const recoveryActions = [
  { href: "/", label: "Go Home", icon: Home },
  { href: "/services", label: "Browse Services", icon: LayoutGrid },
  { href: "/customer/login", label: "Customer Login", icon: UserRound },
  { href: DIGI_PARTNER_LOGIN_ROUTE, label: "Digi Partner Login", icon: BadgeCheck },
  { href: "/admin/login", label: "Admin Login", icon: ShieldCheck },
];

export default function GlobalNotFound() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f6f8fc] px-4 py-12">
      {/* Ambient liquid-glass wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, rgba(37,99,235,0.10), transparent 55%)," +
            "radial-gradient(90% 70% at 100% 110%, rgba(99,102,241,0.10), transparent 55%)," +
            "#f6f8fc",
        }}
      />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/60 bg-white/70 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <span className="text-3xl font-black tracking-tight text-slate-400">404</span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Page Not Found</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
          The page you are looking for doesn&apos;t exist or has been moved. Pick a destination below to get back on track.
        </p>

        {/* Role-aware recovery actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {recoveryActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-md transition hover:border-slate-300 hover:bg-white hover:text-slate-900 active:scale-[0.98]"
            >
              <Icon className="h-4 w-4 text-blue-500" />
              {label}
            </Link>
          ))}
        </div>

        {/* Digi Partner recovery card */}
        <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-indigo-100/80 bg-white/70 p-5 text-left shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-indigo-700">
            <BadgeCheck className="h-4 w-4" />
            <p className="text-sm font-extrabold">Looking for the Digi Partner portal?</p>
          </div>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
            Access applications, commissions, wallet and support in one place.
          </p>
          <Link
            href={DIGI_PARTNER_LOGIN_ROUTE}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-extrabold text-white shadow-md shadow-indigo-700/15 transition hover:scale-[1.01] active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" />
            Open Digi Partner Login
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-8 text-[11px] font-medium text-slate-400">
          DigiConnect Dukan — Connecting People. Empowering Digital India.
          <br />
          Powered by <span className="font-semibold text-slate-500">RNoS India Pvt. Ltd.</span>
        </p>
      </div>
    </div>
  );
}
