"use client";

import { Mail, Lock, Smartphone } from "lucide-react";
import { useRef, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import {
  AuthButton,
  AuthHeading,
  GlassCard,
  PhoneField,
  PinField,
  SegmentedControl,
  TextField,
} from "@/components/auth/ui";
import {
  categorizeAdminLoginFailure,
  type AdminLoginFailure,
} from "@/lib/auth/admin-login-shared";
import { postJson } from "@/components/auth/ui/request";

type Mode = "email" | "pin";
type Stage = "idle" | "validating" | "requesting" | "redirecting";

export function AdminLoginForm() {
  const { error: toastError } = useToast();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [failure, setFailure] = useState<AdminLoginFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const submittingRef = useRef(false);

  const isDev = process.env.NODE_ENV === "development";

  function fail(failure: AdminLoginFailure) {
    setFailure(failure);
    toastError(failure.message);
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setFailure(null);
    setStage("validating");
    const startedAt = Date.now();

    try {
      if (mode === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setFailure({ category: "invalid_credentials", message: "Enter a valid email address." });
          return;
        }
        if (password.length < 6) {
          setFailure({ category: "invalid_credentials", message: "Password must be at least 6 characters." });
          return;
        }
      } else {
        if (!/^[6-9]\d{9}$/.test(phone)) {
          setFailure({ category: "invalid_credentials", message: "Enter a valid 10-digit mobile number." });
          return;
        }
        if (!/^\d{6}$/.test(pin)) {
          setFailure({ category: "invalid_credentials", message: "PIN must be exactly 6 digits." });
          return;
        }
      }

      const payload =
        mode === "email"
          ? { method: "email" as const, email: email.trim().toLowerCase(), password }
          : { method: "pin" as const, phone, pin };

      setStage("requesting");
      const result = await postJson<{ error?: string; redirectTo?: string }>("/api/auth/admin/login", payload);

      if (result.timedOut) {
        fail(categorizeAdminLoginFailure({ kind: "timeout" }));
        return;
      }
      if (result.networkError) {
        fail(categorizeAdminLoginFailure({ kind: "network" }));
        return;
      }
      if (!result.ok) {
        fail(categorizeAdminLoginFailure({ kind: "http", status: result.status, message: result.data?.error }));
        return;
      }

      setStage("redirecting");
      setDone(true);
      window.location.replace(result.data.redirectTo || "/admin");
    } catch {
      fail(categorizeAdminLoginFailure({ kind: "http", status: 500, message: null }));
    } finally {
      submittingRef.current = false;
      setLoading(false);
      setElapsedMs(Date.now() - startedAt);
      setStage((current) => (current === "redirecting" ? current : "idle"));
    }
  }

  return (
    <GlassCard>
      <AuthHeading
        title="Admin Console"
        subtitle="Faiz Alam — sign in with email + password or mobile + PIN."
      />

      <SegmentedControl<Mode>
        aria-label="Admin login method"
        value={mode}
        disabled={loading}
        onChange={(next) => {
          setMode(next);
          setFailure(null);
        }}
        options={[
          { value: "email", label: "Email + Password" },
          { value: "pin", label: "Mobile + PIN" },
        ]}
      />

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {mode === "email" ? (
          <>
            <TextField
              label="Email"
              type="email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              disabled={loading}
              autoComplete="email"
              placeholder="janabfaizalam@gmail.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              secure
              icon={<Lock className="h-4 w-4" />}
              value={password}
              disabled={loading}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              error={failure?.message ?? null}
            />
          </>
        ) : (
          <>
            <PhoneField
              label="Mobile number"
              icon={<Smartphone className="h-4 w-4" />}
              value={phone}
              disabled={loading}
              success={/^[6-9]\d{9}$/.test(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            <PinField value={pin} onChange={setPin} disabled={loading} error={failure?.message ?? null} />
          </>
        )}

        <AuthButton
          type="submit"
          loading={loading}
          loadingText={stage === "redirecting" ? "Redirecting…" : "Signing in…"}
          status={done ? "success" : "idle"}
        >
          Login
        </AuthButton>
      </form>

      {isDev ? (
        <p className="text-center text-[11px] text-slate-400">
          [dev] stage: {stage}
          {elapsedMs !== null ? ` · ${elapsedMs}ms` : ""}
          {failure ? ` · ${failure.category}` : ""}
        </p>
      ) : null}
    </GlassCard>
  );
}
