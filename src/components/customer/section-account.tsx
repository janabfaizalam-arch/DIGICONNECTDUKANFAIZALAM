"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  MapPin,
  Save,
  Smartphone,
  UserRound,
} from "lucide-react";

import { Reveal } from "@/components/homepage/motion";
import { useToast } from "@/components/providers/toast-provider";
import { getCustomerAccountStatus } from "@/lib/customer/account-status";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

import type { CustomerPortalData } from "@/components/customer/types";
import {
  PortalButton,
  PortalCard,
  PortalHeading,
  PortalIcon,
  formatDate,
} from "@/components/customer/ui";

/**
 * Account.
 *
 * Profile, security and preferences — the three things a customer comes to
 * "my account" to change. Security is new: the live portal had none, no way to
 * see where the account was signed in and no way to sign other devices out,
 * even though the endpoint to do it has existed all along and was wired only
 * into the retired `customer-v2` screens.
 */

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const LANGUAGES = ["Hindi", "English"];

export function AccountSection({
  user,
  profile,
  profileStatus,
  onSignOut,
}: CustomerPortalData & { onSignOut: () => void }) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const saved = profileStatus?.profile ?? null;

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  const [whatsapp, setWhatsapp] = useState(true);
  const [language, setLanguage] = useState("Hindi");
  const [alerts, setAlerts] = useState(true);

  const [pincodeBusy, setPincodeBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastPincode = useRef("");

  useEffect(() => {
    setFullName(saved?.full_name || profile.name || "");
    setMobile(saved?.mobile || user.phone || String(user.user_metadata?.mobile ?? "") || "");
    setPincode(saved?.pincode || "");
    setCity(saved?.city || "");
    setDistrict(saved?.district || "");
    setState(saved?.state || "");
    setAddress(saved?.address || "");
    setGender(saved?.gender || "");
    setDob(saved?.dob || "");
    lastPincode.current = saved?.pincode || "";

    setWhatsapp(Boolean(user.user_metadata?.whatsapp_support ?? true));
    setLanguage(String(user.user_metadata?.language_preference ?? "Hindi"));
    setAlerts(Boolean(user.user_metadata?.notification_preference ?? true));
  }, [saved, profile.name, user]);

  /** PIN code autofill. Only fires on a complete, changed code. */
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode) || pincode === lastPincode.current) return;

    let cancelled = false;
    const load = async () => {
      setPincodeBusy(true);
      try {
        const response = await fetch(`/api/pincode?pincode=${pincode}`);
        const data = (await response.json()) as {
          success?: boolean;
          ok?: boolean;
          city?: string;
          district?: string;
          state?: string;
        };
        if (cancelled) return;
        if (data.success && data.ok) {
          setCity(data.city || "");
          setDistrict(data.district || "");
          setState(data.state || "");
          lastPincode.current = pincode;
        }
      } catch {
        // Silent: the customer can still type the three fields themselves,
        // and an error toast on every keystroke of a PIN code is noise.
      } finally {
        if (!cancelled) setPincodeBusy(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  const status = useMemo(
    () =>
      getCustomerAccountStatus({
        email: user.email,
        mobile,
        completionPercent: profileStatus?.completion?.percent ?? 0,
      }),
    [user.email, mobile, profileStatus],
  );

  const save = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (saving) return;

      const trimmedName = fullName.trim();
      const trimmedMobile = mobile.trim();

      if (!trimmedName) return toastError("Please enter your full name.");
      if (!/^[6-9]\d{9}$/.test(trimmedMobile)) return toastError("Enter a valid 10-digit Indian mobile number.");
      if (!/^\d{6}$/.test(pincode.trim())) return toastError("Enter a valid 6-digit PIN code.");
      if (!city.trim() || !district.trim() || !state.trim()) {
        return toastError("City, district and state are all needed.");
      }

      setSaving(true);
      try {
        const supabase = createClient();
        if (!supabase) throw new Error("Could not reach the server. Please try again.");

        const row = {
          id: user.id,
          full_name: trimmedName,
          mobile: trimmedMobile,
          email: user.email || "",
          pincode: pincode.trim(),
          city: city.trim(),
          district: district.trim(),
          state: state.trim(),
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase.from("customer_profiles").upsert({
          ...row,
          address: address.trim(),
          gender: gender || null,
          dob: dob || null,
          profile_completed: true,
        });
        if (profileError) throw profileError;

        // The legacy `profiles` table is still read by other parts of the app,
        // so both stay in step until that is untangled.
        const { error: legacyError } = await supabase.from("profiles").upsert(row);
        if (legacyError) throw legacyError;

        await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            mobile: trimmedMobile,
            phone: trimmedMobile,
            pincode: pincode.trim(),
            city: city.trim(),
            district: district.trim(),
            state: state.trim(),
            whatsapp_support: whatsapp,
            language_preference: language,
            notification_preference: alerts,
          },
        });

        toastSuccess("Saved.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Could not save. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      fullName,
      mobile,
      pincode,
      city,
      district,
      state,
      address,
      gender,
      dob,
      whatsapp,
      language,
      alerts,
      user,
      router,
      toastSuccess,
      toastError,
    ],
  );

  return (
    <div className="space-y-6">
      {/* ── Who you are ──────────────────────────────────────────────── */}
      <section aria-labelledby="account-heading">
        <PortalHeading eyebrow="Your account" title="Profile" />
        <h2 id="account-heading" className="sr-only">
          Profile
        </h2>

        <PortalCard className="mt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <PortalIcon tone="flame" className="h-12 w-12 rounded-2xl">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </PortalIcon>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-[var(--dc-ink)]">
                  {fullName || profile.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--dc-muted)]">{user.email}</p>
              </div>
            </div>

            <div className="w-full min-w-0 sm:w-52">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-extrabold text-[var(--dc-body)]">{status.badge.label}</span>
                <span
                  className={cn(
                    "text-[11px] font-extrabold",
                    status.profileComplete ? "text-emerald-600" : "text-[var(--dc-flame)]",
                  )}
                >
                  {status.completionPercent}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--dc-blue-soft)]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${status.completionPercent}%`,
                    background: status.profileComplete ? "var(--dc-grad-blue)" : "var(--dc-grad-flame)",
                  }}
                />
              </div>
              {saved?.updated_at ? (
                <p className="mt-1.5 text-[10.5px] font-semibold text-[var(--dc-muted)]">
                  Last updated {formatDate(saved.updated_at)}
                </p>
              ) : null}
            </div>
          </div>
        </PortalCard>
      </section>

      {/* ── Details ──────────────────────────────────────────────────── */}
      <form onSubmit={save} className="space-y-4">
        <PortalCard>
          <p className="inline-flex items-center gap-2 border-b border-[var(--dc-blue-bright)]/12 pb-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-ink)]">
            <UserRound className="h-4 w-4 text-[var(--dc-blue-mid)]" aria-hidden="true" />
            Personal details
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                autoComplete="name"
                className={inputClass}
              />
            </Field>

            <Field label="Mobile number" required hint="We send application updates to this number.">
              <input
                type="tel"
                inputMode="numeric"
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
                required
                autoComplete="tel-national"
                className={inputClass}
              />
            </Field>

            <Field label="Email" hint="Sign in address. Contact support to change it.">
              <input type="email" value={user.email ?? ""} readOnly className={cn(inputClass, "opacity-70")} />
            </Field>

            <Field label="Date of birth">
              <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} className={inputClass} />
            </Field>

            <Field label="Gender">
              <select value={gender} onChange={(event) => setGender(event.target.value)} className={inputClass}>
                <option value="">Prefer not to say</option>
                {GENDERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </PortalCard>

        <PortalCard>
          <p className="inline-flex items-center gap-2 border-b border-[var(--dc-blue-bright)]/12 pb-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-ink)]">
            <MapPin className="h-4 w-4 text-[var(--dc-blue-mid)]" aria-hidden="true" />
            Address
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="PIN code"
              required
              hint={pincodeBusy ? "Looking up your area…" : "City, district and state fill in automatically."}
            >
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoComplete="postal-code"
                  className={inputClass}
                />
                {pincodeBusy ? (
                  <Loader2
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--dc-blue-mid)]"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </Field>

            <Field label="City" required>
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
                className={inputClass}
              />
            </Field>

            <Field label="District" required>
              <input
                type="text"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                required
                className={inputClass}
              />
            </Field>

            <Field label="State" required>
              <input
                type="text"
                value={state}
                onChange={(event) => setState(event.target.value)}
                required
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Street address">
                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={2}
                  className={cn(inputClass, "h-auto resize-none py-2.5")}
                />
              </Field>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <p className="border-b border-[var(--dc-blue-bright)]/12 pb-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-ink)]">
            Preferences
          </p>

          <div className="mt-4 space-y-3">
            <Toggle
              label="WhatsApp updates"
              hint="Status changes and document requests, on WhatsApp."
              checked={whatsapp}
              onChange={setWhatsapp}
            />
            <Toggle
              label="Portal alerts"
              hint="Show alerts in the bell menu."
              checked={alerts}
              onChange={setAlerts}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="min-w-0">
                <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Language</p>
                <p className="mt-0.5 text-[11.5px] font-medium text-[var(--dc-body)]">
                  How our team talks to you on calls and WhatsApp.
                </p>
              </div>
              <div className="flex gap-1.5">
                {LANGUAGES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    aria-pressed={language === item}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3.5 text-[12.5px] font-extrabold transition",
                      language === item ? "text-white" : "lg-pill text-[var(--dc-blue-mid)]",
                    )}
                    style={language === item ? { background: "var(--dc-grad-blue)" } : undefined}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PortalCard>

        {/* Not sticky. A save button pinned to the bottom of a form this tall
            floats over the fields for the whole scroll of it — the PIN code and
            city rows sat underneath it — and a control that hides the thing it
            is about is worse than one you scroll to. */}
        <div>
          <PortalButton type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save changes
              </>
            )}
          </PortalButton>
        </div>
      </form>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <Reveal>
        <SecurityPanel onSignOut={onSignOut} />
      </Reveal>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Security
   ───────────────────────────────────────────────────────────────────────── */

type DeviceSession = {
  id: string;
  created_at: string;
  expires_at: string;
  device_id?: string | null;
  customer_devices?: { device_name?: string | null; ip_address?: string | null; last_active?: string | null } | null;
};

/**
 * Security.
 *
 * The device list comes from `/api/customer-auth/sessions`, which is scoped to
 * the PIN-based JWT session. A customer signed in with email and password does
 * not have one, and the endpoint answers 401 — which is not an error worth
 * showing them. In that case the panel says device history is unavailable for
 * this sign-in and still offers the two controls that always work: change your
 * password, and sign out.
 */
function SecurityPanel({ onSignOut }: { onSignOut: () => void }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/customer-auth/sessions");
      if (!response.ok) {
        setUnavailable(true);
        return;
      }
      const data = (await response.json()) as { sessions?: DeviceSession[] };
      setSessions(data.sessions ?? []);
    } catch {
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revokeAll = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/customer-auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error();
      toastSuccess("Signed out on every device. Sign in again to continue.");
      await load();
    } catch {
      toastError("Could not sign out the other devices. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [load, toastSuccess, toastError]);

  return (
    <section id="security" className="scroll-mt-24" aria-labelledby="security-heading">
      <PortalHeading eyebrow="Security" title="Keeping your account safe" />
      <h2 id="security-heading" className="sr-only">
        Security
      </h2>

      <div className="mt-5 space-y-3">
        <PortalCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PortalIcon tone="blue">
              <KeyRound className="h-[18px] w-[18px]" aria-hidden="true" />
            </PortalIcon>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-[var(--dc-ink)]">Password</p>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                Change it whenever you like. We will email you a link to set a new one.
              </p>
            </div>
          </div>
          <PortalButton href="/customer/forgot-password" tone="ghost" className="shrink-0">
            Change password
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PortalButton>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-[14px] font-extrabold text-[var(--dc-ink)]">
              <Laptop className="h-4 w-4 text-[var(--dc-blue-mid)]" aria-hidden="true" />
              Where you are signed in
            </p>
            {sessions && sessions.length > 1 ? (
              <button
                type="button"
                onClick={revokeAll}
                disabled={busy}
                className="text-[12px] font-extrabold text-[var(--dc-flame)] underline disabled:opacity-60"
              >
                {busy ? "Signing out…" : "Sign out everywhere"}
              </button>
            ) : null}
          </div>

          {unavailable ? (
            <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
              Device history is not recorded for this sign-in method. Signing out below ends this session.
            </p>
          ) : sessions === null ? (
            <p className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[var(--dc-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Checking…
            </p>
          ) : sessions.length === 0 ? (
            <p className="mt-3 text-[12.5px] font-medium text-[var(--dc-body)]">No other active sessions.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--dc-blue-soft)]/60 px-3 py-2.5"
                >
                  <PortalIcon tone="muted" className="h-9 w-9 rounded-[0.7rem]">
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                  </PortalIcon>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-[var(--dc-ink)]">
                      {session.customer_devices?.device_name || "Unrecognised device"}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[var(--dc-muted)]">
                      Signed in {formatDate(session.created_at)}
                      {session.customer_devices?.last_active
                        ? ` · last used ${formatDate(session.customer_devices.last_active)}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        <PortalCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-[var(--dc-ink)]">Sign out</p>
            <p className="mt-1 text-[12.5px] font-medium text-[var(--dc-body)]">Ends this session on this device.</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="lg-pill lg-raise inline-flex h-11 shrink-0 items-center justify-center gap-2 px-4 text-[14px] font-extrabold text-[var(--dc-flame)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </PortalCard>

        <p className="px-1 text-center text-[11.5px] font-medium text-[var(--dc-body)]">
          We will never ask for your password or an OTP on a call.{" "}
          <Link href="/privacy-policy" className="font-bold text-[var(--dc-blue-mid)] underline">
            Privacy policy
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Form parts
   ───────────────────────────────────────────────────────────────────────── */

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--dc-blue-bright)]/18 bg-white px-3 text-[13.5px] font-semibold text-[var(--dc-ink)] outline-none transition focus:border-[var(--dc-blue-bright)]";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
        {label}
        {required ? <span className="ml-1 text-[var(--dc-flame)]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-[11px] font-medium text-[var(--dc-body)]">{hint}</span> : null}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">{label}</p>
        <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]",
          checked ? "" : "bg-[var(--dc-blue-soft)]",
        )}
        style={checked ? { background: "var(--dc-grad-blue)" } : undefined}
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        >
          {checked ? <Check className="h-3 w-3 text-[var(--dc-blue-mid)]" aria-hidden="true" /> : null}
        </span>
      </button>
    </div>
  );
}
