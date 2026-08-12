"use client";

import { AtSign, Home, KeyRound, LoaderCircle, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AuthButton,
  AuthHeading,
  GlassCard,
  PhoneField,
  TextField,
} from "@/components/auth/ui";
import { messageFor, postJson } from "@/components/auth/ui/request";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { useToast } from "@/components/providers/toast-provider";
import type { PincodeLocation } from "@/lib/geo/pincode-core";

type Step = "account" | "address";
const STEPS: Step[] = ["account", "address"];
const STEP_LABELS: Record<Step, string> = { account: "Account", address: "Address" };

type FieldName =
  | "fullName"
  | "email"
  | "mobile"
  | "password"
  | "confirmPassword"
  | "address"
  | "pincode"
  | "city";

export function CustomerEmailSignupFlow() {
  const { error: toastError } = useToast();

  const [step, setStep] = useState<Step>("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState<PincodeLocation | null>(null);
  const [pincodeBusy, setPincodeBusy] = useState(false);
  const [pincodeNote, setPincodeNote] = useState<string | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Resolve district/state and the village list as soon as a full pincode is typed.
  useEffect(() => {
    if (pincode.length !== 6) {
      setLocation(null);
      setPincodeNote(null);
      return;
    }

    let cancelled = false;
    setPincodeBusy(true);
    setPincodeNote(null);

    void (async () => {
      try {
        const response = await fetch(`/api/geo/pincode/${pincode}`, { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          location?: PincodeLocation;
          error?: string;
        };
        if (cancelled) return;

        if (body.ok && body.location) {
          setLocation(body.location);
          // Single area — fill it in rather than making them pick from a list of one.
          setCity(body.location.areas.length === 1 ? body.location.areas[0] : "");
          setErrors((prev) => ({ ...prev, pincode: undefined, city: undefined }));
        } else {
          setLocation(null);
          setPincodeNote(body.error ?? "Could not find this pincode. You can type your city below.");
        }
      } catch {
        if (!cancelled) {
          setLocation(null);
          setPincodeNote("Lookup failed. You can type your city below.");
        }
      } finally {
        if (!cancelled) setPincodeBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pincode]);

  function goToAddress() {
    const next: Partial<Record<FieldName, string>> = {};
    if (fullName.trim().length < 2) next.fullName = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) next.email = "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      next.password = "Password must include letters and numbers.";
    }
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";

    setErrors(next);
    if (Object.keys(next).length === 0) setStep("address");
  }

  async function submit() {
    if (loading) return;
    setFormError(null);

    if (!acceptedTerms) {
      setFormError("Please accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const result = await postJson<{
        error?: string;
        field?: FieldName;
        needsConfirmation?: boolean;
        redirectTo?: string | null;
      }>("/api/auth/customer/register", {
        fullName,
        email,
        mobile,
        password,
        confirmPassword,
        address,
        pincode,
        city,
        district: location?.district ?? "",
        state: location?.state ?? "",
      });

      if (!result.ok) {
        const message = messageFor(result, "Signup failed.");
        const field = result.data?.field;
        if (field) {
          setErrors((prev) => ({ ...prev, [field]: message }));
          // Send them back to the step that owns the bad field.
          if (["fullName", "email", "mobile", "password", "confirmPassword"].includes(field)) {
            setStep("account");
          }
        }
        setFormError(message);
        toastError(message);
        return;
      }

      if (result.data.needsConfirmation) {
        setSentTo(email.trim().toLowerCase());
        return;
      }

      window.location.replace(result.data.redirectTo || "/customer/dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <GlassCard>
        <AuthHeading title="Check your email" subtitle={`We sent a confirmation link to ${sentTo}.`} />
        <p className="text-sm leading-relaxed text-slate-600">
          Open that link to activate your account, then sign in. If it is not in your inbox within a
          few minutes, check the spam folder.
        </p>
        <Link
          href="/customer/login"
          className="inline-flex h-[52px] w-full items-center justify-center rounded-2xl bg-blue-600 text-[15px] font-bold text-white transition hover:bg-blue-700"
        >
          Go to sign in
        </Link>
      </GlassCard>
    );
  }

  const activeIndex = STEPS.indexOf(step);

  return (
    <GlassCard>
      <AuthHeading title="Create your account" subtitle="Email and password. Takes under a minute." />

      <div className="flex items-center gap-2" aria-hidden>
        {STEPS.map((s, index) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-colors duration-300 ${
                index <= activeIndex ? "bg-blue-500" : "bg-slate-200"
              }`}
            />
            <span
              className={`text-[10px] font-semibold ${index <= activeIndex ? "text-blue-600" : "text-slate-400"}`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      {step === "account" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            goToAddress();
          }}
        >
          <TextField
            label="Full name"
            icon={<UserRound className="h-4 w-4" />}
            value={fullName}
            autoComplete="name"
            error={errors.fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <TextField
            label="Email address"
            icon={<AtSign className="h-4 w-4" />}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PhoneField
            label="Mobile number"
            value={mobile}
            autoComplete="tel-national"
            success={/^[6-9]\d{9}$/.test(mobile)}
            error={errors.mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          <TextField
            label="Password"
            icon={<KeyRound className="h-4 w-4" />}
            secure
            value={password}
            autoComplete="new-password"
            hint="At least 8 characters, with letters and numbers."
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Confirm password"
            icon={<KeyRound className="h-4 w-4" />}
            secure
            value={confirmPassword}
            autoComplete="new-password"
            error={errors.confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <AuthButton type="submit">Continue</AuthButton>

          <SocialAuthButtons onError={(message) => setFormError(message)} />
          {formError ? <p className="pl-1 text-xs font-semibold text-rose-600">{formError}</p> : null}

          <p className="text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/customer/login" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField
            label="Pincode"
            icon={<MapPin className="h-4 w-4" />}
            inputMode="numeric"
            autoComplete="postal-code"
            value={pincode}
            disabled={loading}
            success={Boolean(location)}
            error={errors.pincode}
            onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />

          {pincodeBusy ? (
            <p className="flex items-center gap-2 pl-1 text-xs font-semibold text-slate-500">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Finding your area…
            </p>
          ) : null}

          {location ? (
            <>
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                {location.district}, {location.state}
              </div>

              {location.areas.length > 1 ? (
                <div>
                  <label htmlFor="signup-city" className="mb-1.5 block pl-1 text-xs font-bold text-slate-600">
                    City / village
                  </label>
                  <select
                    id="signup-city"
                    value={city}
                    disabled={loading}
                    onChange={(event) => setCity(event.target.value)}
                    className="h-[58px] w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition focus:border-blue-500"
                  >
                    <option value="">Select your area</option>
                    {location.areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  {errors.city ? (
                    <p className="mt-1.5 pl-1 text-xs font-semibold text-rose-600">{errors.city}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {/* Manual fallback so a lookup outage can never block a signup. */}
          {!location && pincode.length === 6 && !pincodeBusy ? (
            <TextField
              label="City / village"
              icon={<MapPin className="h-4 w-4" />}
              value={city}
              disabled={loading}
              error={errors.city}
              hint={pincodeNote ?? undefined}
              onChange={(event) => setCity(event.target.value)}
            />
          ) : null}

          <TextField
            label="Full address"
            icon={<Home className="h-4 w-4" />}
            value={address}
            autoComplete="street-address"
            disabled={loading}
            error={errors.address}
            onChange={(event) => setAddress(event.target.value)}
          />

          <label className="flex items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={acceptedTerms}
              disabled={loading}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms-and-conditions" className="font-semibold text-blue-600 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="font-semibold text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {formError ? <p className="pl-1 text-xs font-semibold text-rose-600">{formError}</p> : null}

          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Creating account…"
            disabled={!acceptedTerms || !city.trim() || !address.trim() || pincode.length !== 6}
          >
            Create account
          </AuthButton>

          <button
            type="button"
            disabled={loading}
            onClick={() => setStep("account")}
            className="mx-auto text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Back
          </button>
        </form>
      )}
    </GlassCard>
  );
}
