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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setEmailError("Sahi email address daaliye.");
    setEmailBusy(true);
    setEmailError(null);
    try {
      const result = await postJson<{ message?: string; error?: string }>("/api/auth/ap/forgot-password", { email: email.trim() });
      if (!result.ok) {
        setEmailError(result.timedOut ? "Request time out ho gaya. Dobara try kijiye." : result.data?.error || "Email bhej nahi paaye. Dobara try kijiye.");
        return;
      }
      setEmailNote(result.data?.message ?? "Reset link bhej diya gaya hai. Inbox aur Spam dekhiye.");
    } catch {
      setEmailError("Email bhej nahi paaye. Dobara try kijiye.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function save() {
    if (savingRef.current) return;
    if (password.length < 8) return setError("Password kam se kam 8 character ka rakhiye.");
    if (password !== confirm) return setError("Dono password ek jaise nahi hain.");
    savingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<{ error?: string; redirectTo?: string }>("/api/auth/ap/change-password", {
        newPassword: password,
        confirmPassword: confirm,
      });
      if (!result.ok) {
        setError(result.timedOut ? "Request time out ho gaya. Dobara try kijiye." : result.data?.error || "Password badal nahi paaye. Dobara try kijiye.");
        return;
      }
      setStage("done");
      success("Naya password set ho gaya!");
      window.location.assign(result.data?.redirectTo || "/ap/dashboard");
    } catch {
      setError("Password badal nahi paaye. Dobara try kijiye.");
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <GlassCard>
      <AuthHeading
        title="Password bhool gaye?"
        subtitle={
          stage !== "verify"
            ? "Number verify ho gaya. Ab naya password bana lijiye."
            : method === "email"
              ? "Apna registered email (Gmail) daaliye. Us par password badalne ka link aayega."
              : "Apna registered mobile number daaliye. WhatsApp par code aayega, phir naya password bana lijiye."
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
              hint="Wahi email jo DC Partner banate waqt diya tha"
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
            />
            <AuthButton type="submit" loading={emailBusy} loadingText="Link bhej rahe hain…">
              <Mail className="h-4 w-4" />
              Email par reset link bhejiye
            </AuthButton>
          </form>
        )
      ) : stage === "verify" ? (
        <APOtpLogin verifyLabel="Code verify kijiye" onVerified={() => setStage("password")} />
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <TextField
            label="Naya password"
            secure
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            disabled={busy}
            hint="Kam se kam 8 character"
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />
          <TextField
            label="Naya password dobara"
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
          <AuthButton type="submit" loading={busy} loadingText="Save kar rahe hain…" status={stage === "done" ? "success" : "idle"}>
            Naya password save kijiye
          </AuthButton>
          <p className="text-center text-xs text-slate-500">Aap login ho chuke hain. Password baad mein bhi dashboard se badal sakte hain.</p>
        </form>
      )}

      <Link href="/ap/login" className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Login par wapas jaiye
      </Link>
    </GlassCard>
  );
}
