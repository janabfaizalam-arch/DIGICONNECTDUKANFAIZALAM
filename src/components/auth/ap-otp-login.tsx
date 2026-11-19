"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Smartphone } from "lucide-react";

import { rearmPasswordPrompt } from "@/components/ap/password-setup-prompt";
import { AuthButton, OtpField, TextField } from "@/components/auth/ui";
import { postJson } from "@/components/auth/ui/request";
import { useToast } from "@/components/providers/toast-provider";
import { trackLogin } from "@/lib/google-analytics";

/**
 * Signing in with the number and a WhatsApp code.
 *
 * A partner's password is the thing they forget; their mobile number is the
 * thing they never do. So this asks for the number, sends six digits to the
 * WhatsApp on it, and lets them in.
 *
 * Two screens, not two pages: entering the number and entering the code are
 * one task, and sending the partner somewhere else in the middle of it loses
 * the number they just typed.
 */

const RESEND_SECONDS = 60;

export function APOtpLogin({ onUsePassword }: { onUsePassword: () => void }) {
  const { success } = useToast();

  const [stage, setStage] = useState<"number" | "code">("number");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);

  /* The resend countdown, so the partner is not left guessing. */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  async function sendCode() {
    if (sendingRef.current) return;
    if (mobile.length !== 10) {
      setError("10 digit ka mobile number daaliye.");
      return;
    }

    sendingRef.current = true;
    setBusy(true);
    setError(null);

    try {
      const result = await postJson<{ message?: string; error?: string }>(
        "/api/auth/ap/otp/send",
        { mobile },
      );

      if (!result.ok) {
        setError(
          result.timedOut
            ? "Request time out ho gaya. Dobara try kijiye."
            : result.data?.error || "Code bhej nahi paaye. Thodi der baad try kijiye.",
        );
        return;
      }

      setNote(result.data?.message ?? null);
      setStage("code");
      setOtp("");
      setCooldown(RESEND_SECONDS);
    } catch {
      setError("Code bhej nahi paaye. Thodi der baad try kijiye.");
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  async function verifyCode(code: string) {
    if (verifyingRef.current) return;
    if (code.length < 6) {
      setError("Poora 6 digit ka code daaliye.");
      return;
    }

    verifyingRef.current = true;
    setBusy(true);
    setError(null);

    try {
      const result = await postJson<{ destination?: string; error?: string }>(
        "/api/auth/ap/otp/verify",
        { mobile, otp: code },
      );

      if (!result.ok) {
        setError(
          result.timedOut
            ? "Request time out ho gaya. Dobara try kijiye."
            : result.data?.error || "Code verify nahi hua. Dobara try kijiye.",
        );
        setOtp("");
        return;
      }

      // A "later" from an earlier session must not silence the password prompt.
      rearmPasswordPrompt();
      trackLogin("agent_email");
      success("Login ho gaya!");
      setDone(true);
      window.location.assign(result.data?.destination || "/ap/dashboard");
    } catch {
      setError("Code verify nahi hua. Dobara try kijiye.");
    } finally {
      verifyingRef.current = false;
      setBusy(false);
    }
  }

  /* ── Number ───────────────────────────────────────────────────────────── */

  if (stage === "number") {
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode();
        }}
      >
        <TextField
          label="Mobile number"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={mobile}
          disabled={busy}
          error={error}
          hint="Isi number ke WhatsApp par code aayega."
          onChange={(e) => {
            setMobile(digits(e.target.value));
            if (error) setError(null);
          }}
        />

        <AuthButton type="submit" loading={busy} loadingText="Code bhej rahe hain…">
          <MessageCircle className="h-4 w-4" />
          WhatsApp par code bhejiye
        </AuthButton>

        <button
          type="button"
          onClick={onUsePassword}
          className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-slate-500 transition hover:text-slate-900 hover:underline"
        >
          Password se login kijiye
        </button>
      </form>
    );
  }

  /* ── Code ─────────────────────────────────────────────────────────────── */

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void verifyCode(otp);
      }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
        <Smartphone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-xs font-semibold leading-relaxed text-emerald-800">
          {note ?? `+91 ${mobile} ke WhatsApp par code bheja gaya hai.`}
        </p>
      </div>

      <OtpField
        value={otp}
        onChange={(value) => {
          setOtp(value);
          if (error) setError(null);
        }}
        disabled={busy}
        error={error}
        // Six digits in means they are done typing; do not make them hunt for a button.
        onComplete={(value) => void verifyCode(value)}
      />

      <AuthButton type="submit" loading={busy} loadingText="Check kar rahe hain…" status={done ? "success" : "idle"}>
        Login kijiye
      </AuthButton>

      <div className="flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          disabled={busy || cooldown > 0}
          onClick={() => void sendCode()}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 transition hover:text-slate-900 hover:underline disabled:opacity-50 disabled:hover:no-underline"
        >
          {cooldown > 0 ? `Dobara bhejiye ${cooldown}s mein` : "Code dobara bhejiye"}
        </button>

        <button
          type="button"
          onClick={() => {
            setStage("number");
            setOtp("");
            setError(null);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Number badliye
        </button>
      </div>
    </form>
  );
}
