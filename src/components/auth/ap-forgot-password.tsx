"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Lock, Mail, MessageCircle } from "lucide-react";

import { APOtpLogin } from "@/components/auth/ap-otp-login";
import { AuthButton, AuthHeading, GlassCard, SegmentedControl, TextField } from "@/components/auth/ui";
import { postJson } from "@/components/auth/ui/request";
import { useToast } from "@/components/providers/toast-provider";

/**
 * DC Partner forgot password.
 *
 * A partner's Auth user sits at an internal address
 * (`<username>@agency.rnos.internal`), not at a mailbox anybody reads, so
 * an emailed reset link never reached anyone — while the page said it had
 * been sent. The partner's registered mobile is the thing they always have:
 * a WhatsApp code to it proves who they are (and signs them in, exactly as
 * the WhatsApp login does), then they set a new password on the same card.
 */
export function ApForgotPassword() {
  const { success } = useToast();
  const [stage, setStage] = useState<"verify" | "password" | "done">("verify");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const [method, setMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [email, setEmail] = useState("");
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  async function sendEmail() {
    if (emailBusy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setEmailError("Enter a valid email address.");
    setEmailBusy(true);
    setEmailError(null);
    try {
      const result = await postJson<{ message?: string; error?: string }>("/api/auth/ap/forgot-password", { email: email.trim() });
      if (!result.ok) {
        setEmailError(result.timedOut ? "Request timed out. Try again." : result.data?.error || "Could not send the email. Try again.");
        return;
      }
      setEmailNote(result.data?.message ?? "Reset link sent. Check Inbox and Spam.");
    } catch {
      setEmailError("Could not send the email. Try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function save() {
    if (savingRef.current) return;
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    savingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<{ error?: string; redirectTo?: string }>("/api/auth/ap/change-password", {
        newPassword: password,
        confirmPassword: confirm,
      });
      if (!result.ok) {
        setError(result.timedOut ? "Request timed out. Try again." : result.data?.error || "Could not save the password. Try again.");
        return;
      }
      setStage("done");
      success("New password saved.");
      window.location.assign(result.data?.redirectTo || "/dc-partner/dashboard");
    } catch {
      setError("Could not save the password. Try again.");
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <GlassCard>
      <AuthHeading
        title="Forgot password?"
        subtitle={
          stage !== "verify"
            ? "Verified. Now set a new password."
            : method === "email"
              ? "Enter the email you registered with. We will send a reset link."
              : "Enter your registered mobile. We will send a code on WhatsApp."
        }
      />

      {stage === "verify" ? (
        <SegmentedControl
          aria-label="Reset ka tareeka"
          value={method}
          onChange={(next) => setMethod(next)}
          options={[
            { value: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
            { value: "email", label: "Email / Gmail", icon: <Mail className="h-4 w-4" /> },
          ]}
        />
      ) : null}

      {stage === "verify" && method === "email" ? (
        emailNote ? (
          <p role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs font-semibold leading-relaxed text-emerald-800">
            {emailNote}
          </p>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void sendEmail();
            }}
          >
            <TextField
              label="Registered email"
              type="email"
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              disabled={emailBusy}
              error={emailError}
              hint="The email used to create your DC Partner account"
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
            />
            <AuthButton type="submit" loading={emailBusy} loadingText="Sending…">
              <Mail className="h-4 w-4" />
              Send reset link
            </AuthButton>
          </form>
        )
      ) : stage === "verify" ? (
        <APOtpLogin verifyLabel="Verify code" onVerified={() => setStage("password")} />
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <TextField
            label="New password"
            secure
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            disabled={busy}
            hint="At least 8 characters"
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />
          <TextField
            label="Confirm new password"
            secure
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
            value={confirm}
            disabled={busy}
            error={error}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (error) setError(null);
            }}
          />
          <AuthButton type="submit" loading={busy} loadingText="Saving…" status={stage === "done" ? "success" : "idle"}>
            Save new password
          </AuthButton>
          <p className="text-center text-xs text-slate-500">You are signed in. You can also change it later from the dashboard.</p>
        </form>
      )}

      <Link href="/dc-partner/login" className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to login
      </Link>
    </GlassCard>
  );
}
