"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIGI_PARTNER_TYPES, DIGI_PARTNER_TYPE_VALUES, partnerTypeSelectOptions } from "@/lib/ap/partner-type";

type CreateAPResult = {
  message?: string;
  partnerId?: string;
  partnerCode?: string;
};

const PARTNER_TYPE_OPTIONS = partnerTypeSelectOptions(DIGI_PARTNER_TYPE_VALUES);

export function CreateAPForm({ defaultPartnerCode }: { defaultPartnerCode: string }) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [partnerCode, setPartnerCode] = useState(defaultPartnerCode);
  const [partnerType, setPartnerType] = useState("business_partner");
  const [commissionType, setCommissionType] = useState("fixed");
  const [kycStatus, setKycStatus] = useState("pending");
  const [accountStatus, setAccountStatus] = useState("pending");
  const [formError, setFormError] = useState("");
  const [createdAP, setCreatedAP] = useState<CreateAPResult | null>(null);

  function normalizeMobile(value: string) {
    return value.replace(/\D/g, "").slice(0, 10);
  }

  function normalizeCode(value: string) {
    return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFormError("");
    setCreatedAP(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    
    const fullName = String(formData.get("fullName") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const commissionValue = Number(formData.get("commissionValue") ?? 0);

    if (!fullName || !username || !mobile || !partnerCode || !password) {
      const msg = "Name, Username, Mobile, Partner Code, and Temporary Password are required.";
      setFormError(msg);
      toastError(msg);
      return;
    }

    if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
      const msg = "Username: 3-64 chars, letters/numbers/._- only.";
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
      const msg = "Temporary password must be at least 8 characters.";
      setFormError(msg);
      toastError(msg);
      return;
    }

    const payload = {
      fullName,
      username,
      mobile,
      email,
      temporaryPassword: password,
      partnerCode,
      partnerType,
      commissionType,
      commissionValue,
      kycStatus,
      accountStatus,
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/agency-partners/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => ({}))) as CreateAPResult & { error?: string; ok?: boolean };

        if (!response.ok) {
          throw new Error(result.error ?? result.message ?? "Agency Partner could not be created.");
        }

        success(result.message ?? "Agency Partner registered successfully!");
        setCreatedAP({
          message: result.message,
          partnerId: result.partnerId,
          partnerCode: result.partnerCode ?? partnerCode,
        });
        form.reset();
        setMobile("");
        setWhatsapp("");
        setPartnerCode(defaultPartnerCode);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Error onboarding AP.");
        toastError(error instanceof Error ? error.message : "Error onboarding AP.");
      }
    });
  }

  return (
    <Card className="p-4 md:p-6 space-y-6">
      {createdAP ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold">Agency Partner created successfully!</p>
              <p className="mt-2">AP ID / Code: <span className="font-mono font-bold text-slate-900">{createdAP.partnerCode}</span></p>
              <p className="mt-1">
                Portal Login:{" "}
                <Link href="/ap/login" className="font-bold text-emerald-800 underline">
                  /ap/login
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6" aria-busy={isPending}>
        <fieldset disabled={isPending} className="space-y-6">
          
          {/* Section 1: Credentials Setup */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">1. Profile & Login Setup</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Full Name *</span>
                <Input name="fullName" placeholder="AP Representative full name" required />
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
                <span className="text-xs font-bold text-slate-700">Username *</span>
                <Input name="username" placeholder="ap1001" autoComplete="off" required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Email (optional)</span>
                <Input name="email" placeholder="partner@business.com" type="email" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Temporary Password *</span>
                <Input name="password" placeholder="Min 8 chars — must change on first login" type="password" minLength={8} required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">KYC Status</span>
                <Select value={kycStatus} onValueChange={setKycStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="KYC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Account Status</span>
                <Select value={accountStatus} onValueChange={setAccountStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Partner Code *</span>
                <Input
                  name="partnerCode"
                  placeholder="DCD-AP-0001"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(normalizeCode(e.target.value))}
                  className="font-mono uppercase"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">WhatsApp Contact</span>
                <Input
                  name="whatsapp"
                  placeholder="WhatsApp mobile"
                  inputMode="numeric"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(normalizeMobile(e.target.value))}
                />
              </label>
            </div>
          </div>

          {/* Section 2: Business & Address Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">2. Business / Location Info</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Business / Shop Name</span>
                <Input name="businessName" placeholder="Digital center name or enterprise" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Partner Type *</span>
                <Select value={partnerType} onValueChange={setPartnerType}>
                  <SelectTrigger aria-label="Partner Type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-slate-500">
                  {DIGI_PARTNER_TYPES[partnerType as keyof typeof DIGI_PARTNER_TYPES]?.description}
                </span>
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-bold text-slate-700">Detailed Address</span>
                <Input name="address" placeholder="Shop/Building address, area, or street name" />
              </label>
              <div className="grid gap-3 grid-cols-3 sm:col-span-2">
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">District</span>
                  <Input name="district" placeholder="City / District" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">State</span>
                  <Input name="state" placeholder="State" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">Pincode</span>
                  <Input name="pin" placeholder="6-digit PIN" maxLength={6} />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Bank account details */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">3. Bank Settlement Account</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Account Holder Name</span>
                <Input name="bankAccountName" placeholder="Name in bank records" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Account Number</span>
                <Input name="bankAccountNumber" placeholder="Account number" inputMode="numeric" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">IFSC Code</span>
                <Input name="bankIfsc" placeholder="IFSC code" className="uppercase" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Bank Name</span>
                <Input name="bankName" placeholder="Bank name" />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-bold text-slate-700">UPI ID</span>
                <Input name="upiId" placeholder="UPI ID (e.g. partner@upi)" />
              </label>
            </div>
          </div>

          {/* Section 4: Identifiers & Nominee details */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">4. Identifiers & Nominee Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Aadhaar Number</span>
                <Input name="aadhaarNumber" placeholder="12 digit Aadhaar" maxLength={12} inputMode="numeric" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">PAN Card Number</span>
                <Input name="panNumber" placeholder="ABCDE1234F" maxLength={10} className="uppercase" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">GSTIN</span>
                <Input name="gstin" placeholder="15 digit GST Number" maxLength={15} className="uppercase" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Emergency Mobile Contact</span>
                <Input name="emergencyContact" placeholder="Emergency mobile number" inputMode="numeric" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Nominee Name</span>
                <Input name="nomineeName" placeholder="Full name of Nominee" />
              </label>
              <div className="grid gap-3 grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">Nominee Relation</span>
                  <Input name="nomineeRelation" placeholder="Relation (e.g., Wife, Son)" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-700">Referral Source</span>
                  <Input name="referralSource" placeholder="Referral (e.g. Staff, Search)" />
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Commission rule settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2">5. Default Commission Plan</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Plan Type</span>
                <Select value={commissionType} onValueChange={setCommissionType}>
                  <SelectTrigger aria-label="Commission Type">
                    <SelectValue placeholder="Commission Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Flat Payout</SelectItem>
                    <SelectItem value="percentage">Percentage Rate (%)</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-700">Commission Payout Value</span>
                <Input name="commissionValue" placeholder="₹ Value or % Rate" type="number" min="0" step="0.01" required />
              </label>
            </div>
          </div>

          {formError ? (
            <p className="rounded-xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700" role="alert">
              {formError}
            </p>
          ) : null}

          <FormSubmitButton loading={isPending} loadingText="Creating Partner..." icon={<UserPlus className="h-4.5 w-4.5" />} className="w-full md:w-fit px-6 h-11 bg-[var(--primary)] text-white font-bold rounded-xl">
            Register Partner Shop
          </FormSubmitButton>

        </fieldset>
      </form>
    </Card>
  );
}
