"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, UserPlus2, ArrowLeft } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CreateTeamResult = {
  message?: string;
  partnerId?: string;
  partnerCode?: string;
  partnerType?: string;
};

export function CreateTeamMemberForm() {
  const { success, error: toastError } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [partnerType, setPartnerType] = useState("field_executive");
  const [formError, setFormError] = useState("");
  const [createdMember, setCreatedMember] = useState<CreateTeamResult | null>(null);

  function normalizeMobile(value: string) {
    return value.replace(/\D/g, "").slice(0, 10);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFormError("");
    setCreatedMember(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const businessName = String(formData.get("businessName") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const pin = String(formData.get("pin") ?? "").replace(/\D/g, "");

    if (!fullName || !mobile || !email || !password || !address) {
      const msg = "Name, Mobile, Email, Password, and Address are required.";
      setFormError(msg);
      toastError(msg);
      return;
    }

    if (mobile.length !== 10) {
      const msg = "Enter a valid 10-digit mobile number.";
      setFormError(msg);
      toastError(msg);
      return;
    }

    if (password.length < 8) {
      const msg = "Password must be at least 8 characters.";
      setFormError(msg);
      toastError(msg);
      return;
    }

    const payload = {
      fullName,
      email,
      password,
      partnerType,
      mobile,
      whatsapp,
      businessName,
      address,
      district,
      state,
      pin,
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/ap/team", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => ({}))) as CreateTeamResult;

        if (!response.ok || !result.partnerId) {
          throw new Error(result.message ?? "Team member could not be created.");
        }

        success(result.message ?? "Team member created successfully!");
        setCreatedMember(result);
        form.reset();
        setMobile("");
        setWhatsapp("");
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Error creating team member.");
        toastError(error instanceof Error ? error.message : "Error creating team member.");
      }
    });
  }

  return (
    <Card className="p-4 md:p-6 space-y-6">
      {createdMember ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold">Team member created successfully!</p>
              <p className="mt-2">Partner Code: <span className="font-mono font-bold text-slate-900">{createdMember.partnerCode}</span></p>
              <p className="mt-1">Role: <span className="font-bold capitalize">{createdMember.partnerType?.replace(/_/g, " ")}</span></p>
              <div className="flex gap-3 mt-3">
                <Link href="/ap/team" className="font-bold text-emerald-800 underline text-xs">
                  View Team
                </Link>
                <button
                  onClick={() => {
                    setCreatedMember(null);
                    setFormError("");
                  }}
                  className="font-bold text-blue-700 underline text-xs cursor-pointer"
                >
                  Create Another
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6" aria-busy={isPending}>
        <fieldset disabled={isPending} className="space-y-6">
          
          {/* Section 1: Role Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">1. Team Member Role</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Role *</span>
                <Select value={partnerType} onValueChange={setPartnerType}>
                  <SelectTrigger aria-label="Partner Type">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop_owner">Shop Owner</SelectItem>
                    <SelectItem value="field_executive">Field Executive</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>

          {/* Section 2: Profile & Login */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">2. Profile & Login</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Full Name *</span>
                <Input name="fullName" placeholder="Team member full name" required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Mobile Number *</span>
                <Input
                  name="mobile"
                  placeholder="10 digit mobile"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Email Address *</span>
                <Input name="email" placeholder="member@email.com" type="email" required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Login Password *</span>
                <Input name="password" placeholder="Min 8 chars" type="password" minLength={8} required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">WhatsApp Contact</span>
                <Input
                  name="whatsapp"
                  placeholder="WhatsApp number"
                  inputMode="numeric"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(normalizeMobile(e.target.value))}
                />
              </label>
            </div>
          </div>

          {/* Section 3: Business / Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">3. Business & Location</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Business / Shop Name</span>
                <Input name="businessName" placeholder="Shop or business name" />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-bold text-slate-700">Address *</span>
                <Input name="address" placeholder="Full address" required />
              </label>
              <div className="grid gap-3 grid-cols-3 sm:col-span-2">
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">District</span>
                  <Input name="district" placeholder="District" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">State</span>
                  <Input name="state" placeholder="State" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">Pincode</span>
                  <Input name="pin" placeholder="PIN" maxLength={6} />
                </label>
              </div>
            </div>
          </div>

          {formError ? (
            <p className="rounded-xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700" role="alert">
              {formError}
            </p>
          ) : null}

          <FormSubmitButton loading={isPending} loadingText="Creating Member..." icon={<UserPlus2 className="h-4.5 w-4.5" />} className="w-full md:w-fit px-6 h-11 bg-[var(--primary)] text-white font-bold rounded-xl">
            Create Team Member
          </FormSubmitButton>

        </fieldset>
      </form>
    </Card>
  );
}
