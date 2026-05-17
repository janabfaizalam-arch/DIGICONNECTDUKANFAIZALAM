"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CreateAgentResult = {
  message?: string;
  agentId?: string;
  agentName?: string;
  agentCode?: string;
  loginUrl?: string;
};

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizeAgentCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function CreateAgentForm({ defaultAgentCode }: { defaultAgentCode: string }) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mobile, setMobile] = useState("");
  const [agentCode, setAgentCode] = useState(defaultAgentCode);
  const [formError, setFormError] = useState("");
  const [createdAgent, setCreatedAgent] = useState<CreateAgentResult | null>(null);

  function setError(message: string) {
    setFormError(message);
    toastError(message);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFormError("");
    setCreatedAgent(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const address = String(formData.get("address") ?? "").trim();
    const commissionValue = Number(formData.get("commissionValue") ?? 0);

    if (!fullName || !mobile || !email || !agentCode || !password || !address) {
      setError("Please fill all required agent fields.");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10 digit Indian mobile number.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!Number.isFinite(commissionValue) || commissionValue < 0) {
      setError("Commission value must be zero or more.");
      return;
    }

    formData.set("mobile", mobile);
    formData.set("agentCode", agentCode);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/agents", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json().catch(() => ({}))) as CreateAgentResult;

        if (!response.ok || !result.agentId) {
          throw new Error(result.message ?? "Agent could not be created.");
        }

        success(result.message ?? "Agent created.");
        setCreatedAgent(result);
        form.reset();
        setMobile("");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Agent could not be created.");
      }
    });
  }

  return (
    <Card className="p-4 md:p-6">
      {createdAgent ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold">Agent created successfully</p>
              <p className="mt-2">Name: {createdAgent.agentName}</p>
              <p>Agent ID / Code: <span className="font-mono font-bold">{createdAgent.agentCode}</span></p>
              <p>
                Login URL:{" "}
                <Link href={createdAgent.loginUrl || "/login/agent"} className="font-bold text-emerald-800 underline">
                  {createdAgent.loginUrl || "/login/agent"}
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
              <span className="text-sm font-bold text-slate-700">Agent Name</span>
              <Input name="fullName" placeholder="Full name" autoComplete="name" required />
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
              <Input name="email" placeholder="agent@example.com" type="email" autoComplete="email" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Username / Agent Code</span>
              <Input
                name="agentCode"
                placeholder="DCD-AGT-0001"
                value={agentCode}
                onChange={(event) => setAgentCode(normalizeAgentCode(event.target.value))}
                className="font-mono uppercase"
                required
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Address / Area</span>
              <Input name="address" placeholder="Area, city, or service location" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <Input name="password" placeholder="Minimum 8 characters" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Commission Type</span>
              <Select name="commissionType" defaultValue="fixed">
                <SelectTrigger aria-label="Commission type">
                  <SelectValue placeholder="Commission Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Commission Value</span>
              <Input name="commissionValue" placeholder="Amount or percentage" type="number" min="0" step="0.01" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Status</span>
              <Select name="isActive" defaultValue="true">
                <SelectTrigger aria-label="Agent status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          {formError ? (
            <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" role="alert">
              {formError}
            </p>
          ) : null}

          <FormSubmitButton loading={isPending} loadingText="Creating agent..." icon={<UserPlus className="h-4 w-4" />} className="w-full md:w-fit">
            Create Agent
          </FormSubmitButton>
        </fieldset>
      </form>
    </Card>
  );
}
