"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";

/**
 * Asking a partner to replace the password we handed them.
 *
 * Every partner account starts on a password built from their own mobile
 * number, because that is the only thing that survives being read down a phone
 * line. The cost of that is a password anybody who knows their number can
 * guess, so it has to be temporary in practice and not just in name.
 *
 * It is a prompt and not a wall: a partner standing at a counter with a
 * customer in front of them should be able to say "later" and get on with the
 * work. But "later" lasts until they sign out — the next sign-in asks again,
 * and keeps asking, until they actually set one.
 *
 * `dismissUntilNextLogin` is what the login forms call so that dismissing it
 * once does not silence it for every later session in the same tab.
 */

const DISMISSED_KEY = "dcp_password_prompt_dismissed";

/** Called by the login forms on a successful sign-in, so the nag comes back. */
export function rearmPasswordPrompt(): void {
  try {
    window.sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* Private window: nothing was stored, so nothing needs clearing. */
  }
}

function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Storage unavailable: show the prompt. Asking twice is better than a
    // partner never being asked at all.
    return false;
  }
}

function remember(): void {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    /* It will simply ask again on the next page. */
  }
}

export function PasswordSetupPrompt({ mustChange }: { mustChange: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  /*
    Decided after mount, not during render: sessionStorage does not exist on
    the server, and reading it in the render pass would make the server and
    the browser disagree about what is on screen.
  */
  useEffect(() => {
    if (mustChange && !wasDismissed()) setOpen(true);
  }, [mustChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dcp-password-prompt-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 id="dcp-password-prompt-title" className="text-lg font-black tracking-tight text-slate-900">
              Apna password banaiye
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Abhi aapka password aapke mobile number se bana hua hai — jo bhi aapka number jaanta
              hai wo andaza laga sakta hai. Apna password bana lijiye, ek minute ka kaam hai.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/ap/change-password");
            }}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Abhi banayein
          </button>
          <button
            type="button"
            onClick={() => {
              remember();
              setOpen(false);
            }}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Baad mein
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] font-medium text-slate-400">
          Agli baar login karne par ye phir poochha jayega.
        </p>
      </div>
    </div>
  );
}
