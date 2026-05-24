"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Gift, MapPin, Phone } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { ButtonSpinner, FormSubmitButton } from "@/components/ui/loading";

type CustomerOnboardingFormProps = {
  userEmail: string;
  userFullName: string;
};

type OnboardingApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  destination?: string;
};

type PinLookup = {
  ok?: boolean;
  success?: boolean;
  pincode?: string;
  city?: string;
  district?: string;
  state?: string;
  message?: string;
};

const fieldClassName = "h-12 bg-white/78 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizePincode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function CustomerOnboardingForm({ userEmail, userFullName }: CustomerOnboardingFormProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [mobile, setMobile] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");

  const [pinMessage, setPinMessage] = useState("");
  const [pinLookupPending, setPinLookupPending] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);

  useEffect(() => {
    if (pincode.length !== 6) return;

    let active = true;

    async function lookupPin() {
      setPinLookupPending(true);
      setPinMessage("Fetching city, district and state from PIN code...");

      try {
        const response = await fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`, { cache: "no-store" });
        const result = (await response.json()) as PinLookup;

        if (!active) return;

        if (!response.ok || !(result.success ?? result.ok) || !result.city || !result.district || !result.state) {
          setManualLocation(true);
          setPinMessage(result.message ?? "Could not auto fetch location. Please enter city, district and state manually.");
          return;
        }

        setCity(result.city);
        setDistrict(result.district);
        setState(result.state);
        setManualLocation(false);
        setPinMessage("City, district and state fetched successfully from PIN code.");
      } catch {
        if (active) {
          setManualLocation(true);
          setPinMessage("Could not auto fetch location. Please enter city, district and state manually.");
        }
      } finally {
        if (active) setPinLookupPending(false);
      }
    }

    void lookupPin();

    return () => {
      active = false;
    };
  }, [pincode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || pinLookupPending) return;
    setMessage(null);

    const cleanMobile = normalizeMobile(mobile);
    const cleanPincode = normalizePincode(pincode);

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      const err = "Please enter a valid 10-digit Indian mobile number.";
      setMessage({ type: "error", text: err });
      toastError(err);
      return;
    }

    if (!/^\d{6}$/.test(cleanPincode)) {
      const err = "Please enter a valid 6-digit PIN code.";
      setMessage({ type: "error", text: err });
      toastError(err);
      return;
    }

    if (!city.trim() || !state.trim()) {
      const err = "City and state are required. Enter them manually if PIN lookup failed.";
      setMessage({ type: "error", text: err });
      toastError(err);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/customer/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: cleanMobile,
          pincode: cleanPincode,
          city: city.trim(),
          district: district.trim(),
          state: state.trim(),
        }),
      });

      const result = (await response.json()) as OnboardingApiResponse;

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to complete onboarding.");
      }

      toastSuccess("Profile details submitted successfully!");
      setMessage({
        type: "success",
        text: "Your profile onboarding is complete! Redirecting you to your dashboard...",
      });

      setTimeout(() => {
        window.location.assign(result.destination || "/customer/dashboard");
      }, 1500);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Onboarding failed. Please try again.";
      setMessage({ type: "error", text: errMsg });
      toastError(errMsg);
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="glass-panel rounded-[1.75rem] border border-white/15 p-5 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-center md:justify-start">
            <Image
              src="/logo-navbar.png"
              alt="DigiConnect Dukan Logo"
              width={200}
              height={85}
              priority
              className="h-auto w-40 object-contain"
            />
          </div>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--secondary)]">Almost Done!</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Complete Onboarding</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Welcome, <strong className="text-slate-900">{userFullName || userEmail}</strong>! To unlock your customized customer dashboard, apply for services, and trace status updates, please fill out these last mandatory details.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/15 bg-gradient-to-br from-blue-50/70 to-sky-50/50 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">₹500 Signup Wallet Credit</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Completing onboarding will automatically credit **₹500** to your reward wallet, fully available to redeem on services!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5 text-center md:text-left">
          <p className="text-xs text-slate-500">
            Secure connection. Your details are processed safely according to privacy guidelines.
          </p>
        </div>
      </aside>

      <form onSubmit={handleSubmit} className="glass-panel rounded-[1.75rem] border border-white/15 p-5 md:p-6" aria-busy={isPending}>
        <fieldset disabled={isPending}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Contact & Address Details</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Add Mandatory Profile Fields</h2>
            <p className="mt-1 text-sm text-slate-600">Provide your actual contact number and billing location details.</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Email Address</span>
              <Input
                name="email"
                type="email"
                value={userEmail}
                disabled
                className="h-12 bg-slate-50 text-base text-slate-500 border-slate-200"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
              <div className="relative">
                <Input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(event) => setMobile(normalizeMobile(event.target.value))}
                  className="h-12 bg-white pl-10 text-base"
                />
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">PIN Code</span>
              <div className="relative">
                <Input
                  name="pincode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="Enter 6-digit PIN code"
                  value={pincode}
                  onChange={(event) => {
                    setPincode(normalizePincode(event.target.value));
                    setCity("");
                    setDistrict("");
                    setState("");
                    setPinMessage("");
                  }}
                  className="h-12 bg-white pl-10 pr-10 text-base"
                />
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {pinLookupPending && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ButtonSpinner className="h-4 w-4 text-blue-700" />
                  </div>
                )}
              </div>
              {pinLookupPending ? (
                <span className="text-xs font-bold text-blue-700 motion-safe:animate-pulse">
                  Fetching city and state from PIN code...
                </span>
              ) : pinMessage ? (
                <span className={`text-xs font-bold ${manualLocation ? "text-orange-700" : "text-emerald-700"}`}>
                  {pinMessage}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">City / Town</span>
              <Input
                name="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
                placeholder="Enter city"
                className={fieldClassName}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">State</span>
              <Input
                name="state"
                value={state}
                onChange={(event) => setState(event.target.value)}
                required
                placeholder="Enter state"
                className={fieldClassName}
              />
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">District (optional)</span>
              <Input
                name="district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                placeholder="Enter district"
                className={fieldClassName}
              />
            </label>
          </div>

          {message && (
            <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
              {message.text}
            </p>
          )}

          <FormSubmitButton
            loading={isPending}
            loadingText="Completing onboarding..."
            icon={<CheckCircle2 className="h-4 w-4" />}
            className="mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold md:w-auto"
          >
            Complete Onboarding & Claim ₹500
          </FormSubmitButton>
        </fieldset>
      </form>
    </div>
  );
}
