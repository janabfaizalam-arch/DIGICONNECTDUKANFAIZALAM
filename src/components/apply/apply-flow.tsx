"use client";

import dynamic from "next/dynamic";
import Script from "next/script";
import Image from "next/image";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CloudUpload,
  Loader2,
  RotateCcw,
  SwitchCamera,
  X,
  Zap,
  ZapOff,
} from "lucide-react";

import { BrandField } from "@/components/homepage/brand-backdrop";
import { DOC_SLOTS, STEPS, formatINR } from "@/components/apply/shared";
import { StepServices } from "@/components/apply/step-services";
import { useApplyFlow, type ApplyFlowOptions } from "@/components/apply/use-apply-flow";
import { cn } from "@/lib/utils";

/**
 * The five steps a customer is not looking at.
 *
 * Same reasoning as the portal's sections: statically imported children share
 * the route chunk, so the whole flow — the form, the camera-backed uploader,
 * the review, the payment panel — would ship to somebody who opened Apply to
 * browse the catalogue and left. The picker stays static because it is where
 * everyone lands.
 */
const StepCustomer = dynamic(() => import("@/components/apply/step-customer").then((m) => m.StepCustomer), {
  loading: StepSkeleton,
});
const StepDocuments = dynamic(
  () => import("@/components/apply/step-documents").then((m) => m.StepDocuments),
  { loading: StepSkeleton },
);
const StepReview = dynamic(() => import("@/components/apply/step-review").then((m) => m.StepReview), {
  loading: StepSkeleton,
});
const StepPayment = dynamic(() => import("@/components/apply/step-payment").then((m) => m.StepPayment), {
  loading: StepSkeleton,
});
const StepDone = dynamic(() => import("@/components/apply/step-done").then((m) => m.StepDone), {
  loading: StepSkeleton,
});

function StepSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-7 w-44 animate-pulse rounded-lg bg-[var(--dc-blue-soft)]" />
      <div className="lg-card h-32 animate-pulse" />
      <div className="lg-card h-44 animate-pulse" />
    </div>
  );
}

/**
 * Applying for a service.
 *
 * This replaces a single 1,781-line client component that held six steps of
 * markup wrapped around the cart, the catalogue, validation, a camera, uploads
 * and the Razorpay handshake. The behaviour moved to `useApplyFlow` unchanged;
 * what is here is the shell — the brand header, the progress rail, which step
 * is showing, and the one bar of actions at the bottom.
 *
 * Both `/apply` and `/apply/[slug]` render this, so a customer who arrives
 * from a service page and one who arrives from the tab bar get the same
 * screens.
 */
export function ApplyFlow(options: ApplyFlowOptions) {
  const flow = useApplyFlow(options);
  const {
    currentStep,
    handleNext,
    handlePrev,
    totalItemCount,
    cartTotal,
    isSubmitting,
    isScriptReady,
    setIsScriptReady,
    autoSaved,
    canvasRef,
    videoRef,
    cameraSlot,
    capturedFrame,
    flashOn,
    setFlashOn,
    switchCamera,
    captureFrame,
    retakeFrame,
    saveFrame,
    closeCamera,
  } = flow;

  const done = currentStep === 6;
  const activeStep = STEPS[Math.min(currentStep, STEPS.length) - 1];

  return (
    <LazyMotion features={domAnimation} strict>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/*
        `overflow-x-clip`, as on the marketing shell and the portal: the
        ambient orbs are sized in `vw`, which counts the classic scrollbar, so
        on a desktop with real scrollbars the decoration would sit a few pixels
        past the content box and grow a horizontal scrollbar. `clip` does not
        create a scroll container, so the sticky action bar keeps working.
      */}
      <div className="dc-apply-shell dc-ambient min-h-screen overflow-x-clip bg-[var(--dc-sky-soft)] text-[var(--dc-ink)]">
        {/* ── Brand header and progress ──────────────────────────────── */}
        <header className="relative isolate overflow-hidden text-white">
          <BrandField />

          <div className="relative mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pb-5 pt-6 sm:px-6 md:px-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/55">
              {done ? "All done" : `Step ${currentStep} of 5`}
            </p>
            <h1 className="mt-1 text-[1.5rem] font-extrabold leading-tight tracking-[-0.025em] sm:text-[1.9rem]">
              {activeStep.title}
            </h1>
            <p className="mt-1.5 max-w-[46ch] text-[13.5px] font-semibold leading-relaxed text-white/65">
              {activeStep.description}
            </p>

            {/*
              A rail of five segments, not a row of numbered circles with
              labels. On a 390px screen six labelled circles either wrap or
              shrink their text to something nobody reads; a filled bar says
              how far along you are at a glance and the current step is named
              in the heading above it.
            */}
            <ol className="wizard-stepper mt-4 flex items-center gap-1.5" aria-label="Progress">
              {STEPS.slice(0, 5).map((step) => {
                const complete = currentStep > step.id || done;
                const active = currentStep === step.id;
                return (
                  <li key={step.id} className="min-w-0 flex-1">
                    <span className="sr-only">
                      {step.label}
                      {complete ? " — done" : active ? " — current" : ""}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block h-1.5 rounded-full transition-all duration-500",
                        complete || active ? "bg-white" : "bg-white/25",
                      )}
                      style={active && !complete ? { background: "var(--dc-grad-flame)" } : undefined}
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </header>

        {/* ── The step ───────────────────────────────────────────────── */}
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pt-5 sm:px-6 md:px-8"
          style={{
            paddingBottom:
              "calc(var(--bottom-nav-height, 0px) + var(--sticky-action-bar-height, 0px) + env(safe-area-inset-bottom) + 2rem)",
          }}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {currentStep === 1 ? <StepServices flow={flow} /> : null}
              {currentStep === 2 ? <StepCustomer flow={flow} /> : null}
              {currentStep === 3 ? <StepDocuments flow={flow} /> : null}
              {currentStep === 4 ? <StepReview flow={flow} /> : null}
              {currentStep === 5 ? <StepPayment flow={flow} /> : null}
              {currentStep === 6 ? <StepDone flow={flow} /> : null}
            </m.div>
          </AnimatePresence>
        </main>

        {/* ── Actions ────────────────────────────────────────────────── */}
        {!done ? (
          <div
            className="wizard-sticky-actions fixed inset-x-0 z-40 px-3 print:hidden"
            style={{
              bottom: 0,
              paddingBottom: "calc(var(--bottom-nav-height, 0px) + max(0.6rem, env(safe-area-inset-bottom)))",
            }}
          >
            <div className="dc-tabbar mx-auto flex max-w-md items-center gap-2.5 p-2.5">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isSubmitting}
                  aria-label="Back a step"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--dc-blue-mid)] transition active:scale-95 disabled:opacity-40"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleNext}
                disabled={
                  isSubmitting || (currentStep === 1 && totalItemCount === 0) || (currentStep === 5 && !isScriptReady)
                }
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[14.5px] font-extrabold text-white transition duration-300 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
                style={{
                  background: currentStep === 5 ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {currentStep === 5 ? "Taking payment…" : "One moment…"}
                  </>
                ) : currentStep === 1 ? (
                  totalItemCount === 0 ? (
                    "Pick a service to continue"
                  ) : (
                    <>
                      Continue with {totalItemCount} {totalItemCount === 1 ? "service" : "services"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )
                ) : currentStep === 5 ? (
                  <>Pay {formatINR(cartTotal)}</>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            {/*
              The draft notice lives here rather than in the header, where it
              was competing with the step name. It says the thing that stops
              somebody being afraid to close the tab.
            */}
            <AnimatePresence>
              {autoSaved ? (
                <m.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto mt-1.5 flex max-w-md items-center justify-center gap-1.5 text-[11px] font-bold text-[var(--dc-ink)]/45"
                >
                  <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  Saved — you can come back to this
                </m.p>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      {/* ── Camera ─────────────────────────────────────────────────────── */}
      {cameraSlot ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
          style={{ touchAction: "none" }}
          role="dialog"
          aria-modal="true"
          aria-label={DOC_SLOTS.find((slot) => slot.id === cameraSlot)?.label}
        >
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-5 pb-4 pt-10">
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Close camera"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition active:bg-white/30"
            >
              <X className="h-5 w-5 text-white" aria-hidden="true" />
            </button>
            <span className="text-[13px] font-extrabold tracking-wide text-white">
              {DOC_SLOTS.find((slot) => slot.id === cameraSlot)?.label}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFlashOn((on) => !on)}
                aria-label={flashOn ? "Turn flash off" : "Turn flash on"}
                aria-pressed={flashOn}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition active:bg-white/30"
              >
                {flashOn ? (
                  <Zap className="h-5 w-5 fill-[var(--dc-amber)] text-[var(--dc-amber)]" aria-hidden="true" />
                ) : (
                  <ZapOff className="h-5 w-5 text-white/70" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Switch camera"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition active:bg-white/30"
              >
                <SwitchCamera className="h-5 w-5 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>

          {capturedFrame ? (
            <div className="flex flex-1 flex-col items-center justify-between gap-6 px-6 pb-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Preview</p>
              <div className="flex w-full flex-1 items-center justify-center">
                <Image
                  src={capturedFrame}
                  alt="Captured document"
                  width={600}
                  height={600}
                  unoptimized
                  className="max-h-[62vh] max-w-full rounded-2xl object-contain shadow-2xl ring-2 ring-white/10"
                />
              </div>
              <div className="flex w-full max-w-xs gap-3">
                <button
                  type="button"
                  onClick={retakeFrame}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-[13px] font-extrabold text-white transition hover:bg-white/20 active:bg-white/30"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={saveFrame}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[13px] font-extrabold text-white shadow-lg transition hover:brightness-110 active:scale-95"
                  style={{ background: "var(--dc-grad-blue)" }}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Use this
                </button>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-end bg-black pb-10">
              <div className="absolute inset-x-0 bottom-32 top-0 flex items-center justify-center overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              </div>
              <button
                type="button"
                onClick={captureFrame}
                aria-label="Take the photo"
                className="relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-4 border-white/80 bg-white/20 backdrop-blur transition active:scale-90"
              >
                <span className="h-14 w-14 rounded-full bg-white" aria-hidden="true" />
                <Camera className="absolute h-6 w-6 text-[var(--dc-blue-mid)]" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </LazyMotion>
  );
}
