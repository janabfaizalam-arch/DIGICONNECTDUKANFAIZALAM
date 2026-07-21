"use client";

import { type FormEvent, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import {
  PARTNER_PASSWORD_MIN_LENGTH,
  PARTNER_PASSWORD_RESET_MESSAGES,
  validatePartnerPasswordInput,
} from "@/lib/admin/partner-password-reset";

type Props = {
  /** auth.users.id / agency_partners.user_id — never agency_partners.id */
  userId: string | null | undefined;
  partnerCode?: string | null;
};

/**
 * Admin Digi Partner password reset.
 * Calls /api/admin/agency-partners/reset-password with the Auth user UUID.
 */
export function PartnerPasswordResetForm({ userId, partnerCode }: Props) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success">("error");

  if (!userId) {
    return (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
        role="alert"
      >
        {PARTNER_PASSWORD_RESET_MESSAGES.missing_user_id}
        {partnerCode ? (
          <span className="mt-1 block font-mono text-xs text-amber-700">Partner {partnerCode}</span>
        ) : null}
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const validation = validatePartnerPasswordInput(password, confirmPassword);
    if (!validation.ok) {
      setTone("error");
      setMessage(validation.message);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/agency-partners/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            temporaryPassword: validation.password,
            confirmPassword,
          }),
        });

        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
          code?: string;
        };

        if (!response.ok) {
          throw new Error(result.error || result.message || "Password could not be updated.");
        }

        form.reset();
        const okMessage = result.message || PARTNER_PASSWORD_RESET_MESSAGES.success;
        setTone("success");
        setMessage(okMessage);
        success(okMessage);
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message : "Password could not be updated.";
        setTone("error");
        setMessage(safeMessage);
        toastError(safeMessage);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-3" aria-busy={isPending}>
      <p className="text-[11px] font-medium text-slate-500">
        Resets the Digi Partner login password via Supabase Auth Admin for user{" "}
        <span className="font-mono text-slate-700">{userId.slice(0, 8)}…</span>
        {partnerCode ? (
          <>
            {" "}
            · Partner <span className="font-mono text-slate-700">{partnerCode}</span>
          </>
        ) : null}
        . They will be asked to change it on next login.
      </p>
      <fieldset disabled={isPending} className="grid gap-3">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PARTNER_PASSWORD_MIN_LENGTH}
          placeholder="New password"
          required
        />
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PARTNER_PASSWORD_MIN_LENGTH}
          placeholder="Confirm new password"
          required
        />
        {message ? (
          <p
            className={
              tone === "success"
                ? "rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                : "rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700"
            }
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <FormSubmitButton
          loading={isPending}
          loadingText="Updating password..."
          icon={<KeyRound className="h-4 w-4" />}
          className="h-12 w-full"
        >
          Reset / Change Password
        </FormSubmitButton>
      </fieldset>
    </form>
  );
}
