"use client";

import { type FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Save } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getCustomerProfileCompletion,
  isCustomerProfileComplete,
  type CustomerProfile,
  type CustomerProfileFormValues,
} from "@/lib/customer-profile-shared";
import { createClient } from "@/lib/supabase/browser";

type CustomerProfileFormProps = {
  userId: string;
  initialProfile: CustomerProfileFormValues;
  savedProfile: CustomerProfile | null;
};

const fieldClassName = "h-12 bg-white/78 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";

function normalizeFormValue(formData: FormData, field: keyof CustomerProfileFormValues) {
  return String(formData.get(field) ?? "").trim();
}

export function CustomerProfileForm({ userId, initialProfile, savedProfile }: CustomerProfileFormProps) {
  const { error: toastError, success } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profile, setProfile] = useState<CustomerProfileFormValues>({
    full_name: savedProfile?.full_name ?? initialProfile.full_name,
    mobile: savedProfile?.mobile ?? initialProfile.mobile,
    email: savedProfile?.email ?? initialProfile.email,
    dob: savedProfile?.dob ?? initialProfile.dob,
    gender: savedProfile?.gender ?? initialProfile.gender,
    address: savedProfile?.address ?? initialProfile.address,
    city: savedProfile?.city ?? initialProfile.city,
    state: savedProfile?.state ?? initialProfile.state,
    pincode: savedProfile?.pincode ?? initialProfile.pincode,
    photo_url: savedProfile?.photo_url ?? initialProfile.photo_url,
  });
  const completion = useMemo(() => getCustomerProfileCompletion(profile), [profile]);
  const complete = isCustomerProfileComplete(profile);
  const avatarLabel = profile.full_name.trim() ? profile.full_name.trim().charAt(0).toUpperCase() : "D";

  function updateField(field: keyof CustomerProfileFormValues, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const nextProfile: CustomerProfileFormValues = {
      full_name: normalizeFormValue(formData, "full_name"),
      mobile: normalizeFormValue(formData, "mobile"),
      email: normalizeFormValue(formData, "email").toLowerCase(),
      dob: normalizeFormValue(formData, "dob"),
      gender: normalizeFormValue(formData, "gender"),
      address: normalizeFormValue(formData, "address"),
      city: normalizeFormValue(formData, "city"),
      state: normalizeFormValue(formData, "state"),
      pincode: normalizeFormValue(formData, "pincode"),
      photo_url: normalizeFormValue(formData, "photo_url"),
    };
    const profileCompleted = isCustomerProfileComplete(nextProfile);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const { error } = await supabase.from("customer_profiles").upsert(
        {
          id: userId,
          ...nextProfile,
          dob: nextProfile.dob || null,
          gender: nextProfile.gender || null,
          photo_url: nextProfile.photo_url || null,
          profile_completed: profileCompleted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (error) {
        throw error;
      }

      setProfile(nextProfile);
      setMessage({
        type: "success",
        text: profileCompleted ? "Profile saved successfully. Your customer profile is complete." : "Profile saved. Complete the highlighted details before using the dashboard.",
      });
      success("Profile saved successfully.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Profile could not be saved. Please try again.";
      setMessage({ type: "error", text });
      toastError(text);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <aside className="glass-panel rounded-[1.75rem] border border-white/15 p-5 md:p-6">
        <div className="flex items-center gap-4">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt={profile.full_name || "Customer profile photo"}
              width={72}
              height={72}
              className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 text-2xl font-bold text-white">
              {avatarLabel}
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--secondary)]">Customer Profile</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{profile.full_name || "Your Profile"}</h1>
            <p className="mt-1 text-sm text-slate-600">{profile.email || "Add your email"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 bg-white/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">Profile completion</p>
              <p className="mt-1 text-xs text-slate-600">
                {completion.completed} of {completion.total} required details added
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${complete ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
              {completion.percent}%
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-orange-500" style={{ width: `${completion.percent}%` }} />
          </div>
          {complete ? (
            <Link href="/customer/dashboard" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
              <CheckCircle2 className="h-4 w-4" />
              Go to Dashboard
            </Link>
          ) : (
            <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
              Complete the required fields to access your customer dashboard.
            </p>
          )}
        </div>
      </aside>

      <form onSubmit={handleSubmit} className="glass-panel rounded-[1.75rem] border border-white/15 p-5 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Personal Details</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Edit customer profile</h2>
          </div>
          <Link href="/customer/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border bg-white/70 px-4 text-sm font-bold text-slate-900">
            Dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <Input name="full_name" value={profile.full_name} onChange={(event) => updateField("full_name", event.target.value)} required className={fieldClassName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
            <Input name="mobile" type="tel" value={profile.mobile} onChange={(event) => updateField("mobile", event.target.value)} required className={fieldClassName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <Input name="email" type="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} required className={fieldClassName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Date of Birth</span>
            <Input name="dob" type="date" value={profile.dob} onChange={(event) => updateField("dob", event.target.value)} className={fieldClassName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Gender</span>
            <select
              name="gender"
              value={profile.gender}
              onChange={(event) => updateField("gender", event.target.value)}
              className="h-12 rounded-2xl border bg-white/78 px-4 text-base text-slate-900 outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(15,93,184,0.08)]"
            >
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Pincode</span>
            <Input name="pincode" inputMode="numeric" value={profile.pincode} onChange={(event) => updateField("pincode", event.target.value)} required className={fieldClassName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">City</span>
            <Input name="city" value={profile.city} onChange={(event) => updateField("city", event.target.value)} required className={fieldClassName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">State</span>
            <Input name="state" value={profile.state} onChange={(event) => updateField("state", event.target.value)} required className={fieldClassName} />
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Address</span>
            <Textarea name="address" value={profile.address} onChange={(event) => updateField("address", event.target.value)} required className="bg-white/78 text-base" />
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Profile Photo URL optional</span>
            <Input name="photo_url" type="url" value={profile.photo_url} onChange={(event) => updateField("photo_url", event.target.value)} placeholder="https://..." className={fieldClassName} />
          </label>
        </div>

        {message ? (
          <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
            {message.text}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending} className="mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold md:w-auto">
          {isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </Button>
      </form>
    </div>
  );
}
