"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cookieCategories } from "@/lib/compliance/config";
import { OPEN_SETTINGS_EVENT, getConsent, saveConsent } from "@/lib/consent/consent";
import { useConsent } from "@/lib/consent/use-consent";

/**
 * Cookie banner and preference centre.
 *
 * Design rules, because this is where dark patterns usually live:
 *   • "Accept all" and "Reject non-essential" are the same size and weight,
 *     side by side — refusing is exactly as easy as agreeing.
 *   • Nothing is pre-ticked in the preference centre on a first visit.
 *   • The banner is a non-modal region: the page stays usable, and nothing
 *     non-essential loads until a choice is made.
 *   • The preference centre is a native modal <dialog>: it traps focus, closes
 *     on Escape, and returns focus to whatever opened it.
 */
export function CookieConsent() {
  const consent = useConsent();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const headingId = useId();
  const descriptionId = useId();
  const bannerHeadingId = useId();

  const openSettings = useCallback(() => {
    const current = getConsent();
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const closeSettings = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings);
  }, [openSettings]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target && document.contains(target)) target.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  function decide(choice: { analytics: boolean; marketing: boolean }) {
    saveConsent(choice);
    closeSettings();
  }

  const showBanner = consent === null;
  // Accept and Reject share one style on purpose: neither is the "default".
  const choiceButton = "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800";
  const buttonBase =
    "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

  return (
    <>
      {showBanner ? (
        <section
          aria-labelledby={bannerHeadingId}
          className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-[70] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-[0_18px_42px_rgba(15,23,42,0.22)] print:hidden md:bottom-4 md:p-5"
        >
          <h2 id={bannerHeadingId} className="text-base font-extrabold text-slate-950">
            Your privacy choices
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            We use strictly necessary cookies to run this site. With your permission we would also like to use
            analytics (Google Analytics) and marketing (Meta Pixel) cookies. You can change your choice at any time
            from &ldquo;Cookie Settings&rdquo; in the footer. See our{" "}
            <Link href="/cookie-policy" className="font-bold text-blue-800 underline underline-offset-2">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => decide({ analytics: false, marketing: false })}
              className={`${buttonBase} ${choiceButton}`}
            >
              Reject non-essential
            </button>
            <button
              type="button"
              onClick={() => decide({ analytics: true, marketing: true })}
              className={`${buttonBase} ${choiceButton}`}
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={openSettings}
              className={`${buttonBase} border border-slate-300 bg-white text-slate-800 underline underline-offset-2 hover:bg-slate-50`}
            >
              Manage preferences
            </button>
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50"
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            decide({ analytics, marketing });
          }}
          className="p-5 md:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id={headingId} className="text-lg font-extrabold text-slate-950">
              Cookie settings
            </h2>
            <button
              type="button"
              onClick={closeSettings}
              className={`${buttonBase} -mr-2 -mt-2 min-w-11 px-2 text-slate-700 hover:bg-slate-100`}
              aria-label="Close cookie settings without saving"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                &times;
              </span>
            </button>
          </div>
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-slate-700">
            Choose which optional cookies we may use. Strictly necessary cookies are always on because the site needs
            them to work. Your choice is saved in this browser for about six months.
          </p>

          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Cookie categories</legend>
            {cookieCategories.map((category) => {
              const inputId = `cookie-category-${category.id}`;
              const checked =
                category.id === "necessary" ? true : category.id === "analytics" ? analytics : marketing;
              return (
                <div key={category.id} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-start gap-3">
                    <input
                      id={inputId}
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-blue-700"
                      checked={checked}
                      disabled={category.required}
                      aria-describedby={`${inputId}-desc`}
                      onChange={(event) => {
                        if (category.id === "analytics") setAnalytics(event.target.checked);
                        if (category.id === "marketing") setMarketing(event.target.checked);
                      }}
                    />
                    <div>
                      <label htmlFor={inputId} className="text-sm font-bold text-slate-950">
                        {category.label}
                        {category.required ? <span className="ml-1.5 font-semibold text-slate-600">(always on)</span> : null}
                      </label>
                      <p id={`${inputId}-desc`} className="mt-1 text-[13px] leading-relaxed text-slate-700">
                        {category.description}
                      </p>
                      <details className="mt-1.5 text-[13px] text-slate-700">
                        <summary className="cursor-pointer font-semibold text-blue-800">
                          What is stored ({category.items.length})
                        </summary>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5">
                          {category.items.map((item) => (
                            <li key={item.name}>
                              <span className="font-semibold">{item.name}</span> — {item.provider}. {item.purpose}{" "}
                              <span className="text-slate-600">({item.duration})</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })}
          </fieldset>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => decide({ analytics: false, marketing: false })}
              className={`${buttonBase} ${choiceButton}`}
            >
              Reject non-essential
            </button>
            <button type="submit" className={`${buttonBase} border border-blue-800 bg-white text-blue-800 hover:bg-blue-50`}>
              Save my choices
            </button>
            <button
              type="button"
              onClick={() => decide({ analytics: true, marketing: true })}
              className={`${buttonBase} ${choiceButton}`}
            >
              Accept all
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Footer / policy-page entry point back into the preference centre. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
      className={className}
    >
      Cookie Settings
    </button>
  );
}
