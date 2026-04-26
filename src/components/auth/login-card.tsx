"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { getAuthRedirectUrl } from "@/lib/auth-config";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const popupFeatures = "width=520,height=720,menubar=no,toolbar=no,status=no";

export function LoginCard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "supabase-auth-success") {
        showToast("Login successful. Dashboard open ho raha hai.");
        router.replace("/dashboard");
        router.refresh();
      }

      if (event.data?.type === "supabase-auth-error") {
        setIsPending(false);
        showToast(event.data.message ?? "Login failed. Please try again.", "error");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router, showToast]);

  const handleGoogleLogin = async () => {
    setIsPending(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      const popup = window.open(data.url, "google-auth-popup", popupFeatures);

      if (!popup) {
        window.location.href = data.url;
        return;
      }

      const timer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(timer);
          setIsPending(false);
        }
      }, 600);
    } catch (error) {
      setIsPending(false);
      showToast(error instanceof Error ? error.message : "Network issue. Please try again.", "error");
    }
  };

  return (
    <div className="glass-panel shadow-soft w-full max-w-md rounded-[2rem] border p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Secure Login</p>
      <h1 className="mt-3 text-3xl font-black text-slate-950">Continue with Google</h1>
      <p className="mt-4 text-base leading-8 text-slate-600">Google se login karein aur apni service track karein</p>
      <p className="mt-1 text-sm text-slate-500">Fast, secure aur easy login</p>

      <Button
        type="button"
        size="lg"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="mt-8 h-14 w-full rounded-2xl bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.12)] hover:bg-slate-50"
      >
        {isPending ? <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="mt-6 rounded-2xl bg-[var(--muted)] px-4 py-3 text-left text-sm text-slate-600">
        Session automatically create hogi aur aapko secure dashboard par redirect kar diya jayega.
      </div>
    </div>
  );
}
