"use client";

import { type FormEvent, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";

import { resetPartnerPasswordAction } from "@/app/admin/agency-partners/[id]/actions";
import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

export function AgentPasswordResetForm({ agentId }: { agentId: string }) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetPartnerPasswordAction(agentId, password);
        form.reset();
        setMessage("");
        success(result.message || "Partner password updated successfully.");
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message : "Password could not be updated.";
        setMessage(safeMessage);
        toastError(safeMessage);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-3" aria-busy={isPending}>
      <fieldset disabled={isPending} className="grid gap-3">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="New password" required />
        <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} placeholder="Confirm new password" required />
        {message ? (
          <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" role="alert">
            {message}
          </p>
        ) : null}
        <FormSubmitButton loading={isPending} loadingText="Updating password..." icon={<KeyRound className="h-4 w-4" />} className="h-12 w-full">
          Reset / Change Password
        </FormSubmitButton>
      </fieldset>
    </form>
  );
}
