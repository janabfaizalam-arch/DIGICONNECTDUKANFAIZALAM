"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

type CreateCustomerResult = {
  message?: string;
  customerId?: string;
  customerName?: string;
  loginUrl?: string;
};

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizePincode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function CreateCustomerForm() {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mobile, setMobile] = useState("");
  const [pincode, setPincode] = useState("");
  const [formError, setFormError] = useState("");
  const [createdCustomer, setCreatedCustomer] = useState<CreateCustomerResult | null>(null);

  function setError(message: string) {
    setFormError(message);
    toastError(message);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFormError("");
    setCreatedCustomer(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!fullName || !email || !mobile || !password) {
      setError("Full name, email, mobile number, and password are required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10 digit mobile number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (pincode && !/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6 digit PIN code.");
      return;
    }

    formData.set("mobile", mobile);
    formData.set("pincode", pincode);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/customers", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json().catch(() => ({}))) as CreateCustomerResult;

        if (!response.ok || !result.customerId) {
          throw new Error(result.message ?? "Customer could not be created.");
        }

        success(result.message ?? "Customer created.");
        setCreatedCustomer(result);
        form.reset();
        setMobile("");
        setPincode("");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Customer could not be created.");
      }
    });
  }

  return (
    <Card className="p-4 md:p-6">
      {createdCustomer ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold">Customer created successfully</p>
              <p className="mt-2">Name: {createdCustomer.customerName}</p>
              <p>
                Login URL:{" "}
                <Link href={createdCustomer.loginUrl || "/login/customer"} className="font-bold text-emerald-800 underline">
                  {createdCustomer.loginUrl || "/login/customer"}
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-4" aria-busy={isPending}>
        <fieldset disabled={isPending} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Full Name</span>
              <Input name="fullName" placeholder="Customer name" autoComplete="name" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Mobile Number</span>
              <Input
                name="mobile"
                placeholder="10 digit mobile"
                inputMode="numeric"
                value={mobile}
                onChange={(event) => setMobile(normalizeMobile(event.target.value))}
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <Input name="email" placeholder="customer@example.com" type="email" autoComplete="email" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <Input name="password" placeholder="Minimum 6 characters" type="password" autoComplete="new-password" minLength={6} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">PIN Code</span>
              <Input
                name="pincode"
                placeholder="Optional"
                inputMode="numeric"
                value={pincode}
                onChange={(event) => setPincode(normalizePincode(event.target.value))}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">City</span>
              <Input name="city" placeholder="Optional" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">State</span>
              <Input name="state" placeholder="Optional" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Address</span>
              <Input name="address" placeholder="Optional area or address" />
            </label>
          </div>

          {formError ? (
            <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" role="alert">
              {formError}
            </p>
          ) : null}

          <FormSubmitButton loading={isPending} loadingText="Creating customer..." icon={<UserPlus className="h-4 w-4" />} className="w-full md:w-fit">
            Create Customer
          </FormSubmitButton>
        </fieldset>
      </form>
    </Card>
  );
}
