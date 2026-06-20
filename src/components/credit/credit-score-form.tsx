// ============================================================
// Credit UI Component — Credit Score Check Multi-step Form
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

"use client";

import React, { useState } from "react";
import { ShieldAlert, CreditCard, ChevronRight, Loader2, Sparkles, FileCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { creditReportRequestSchema, type CreditReportRequestInput } from "@/lib/credit/validators";
import { CREDIT_PACKAGES } from "@/lib/credit/constants";
import { CreditScoreCard } from "./credit-score-card";
import type { CreditScoreResult } from "@/lib/credit/types";

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

interface CreditScoreFormProps {
  onSuccess?: (result: CreditScoreResult) => void;
}

export function CreditScoreForm({ onSuccess }: CreditScoreFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creditReportId, setCreditReportId] = useState<string | null>(null);
  const [result, setResult] = useState<CreditScoreResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreditReportRequestInput>({
    resolver: zodResolver(creditReportRequestSchema),
    defaultValues: {
      fullName: "",
      mobile: "",
      pan: "",
      dob: "",
      consent: false,
      packageType: "report_pdf",
    },
  });

  const selectedPackageType = watch("packageType");
  const consentChecked = watch("consent");

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as Window & { Razorpay?: unknown }).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Step 1: Validate inputs and advance to step 2 (Consent)
  const handleProceedToConsent = () => {
    setStep(2);
  };

  // Step 2: Proceed to Package Selection
  const handleProceedToPackages = () => {
    if (!consentChecked) {
      setErrorMessage("Please check the consent box to continue.");
      return;
    }
    setErrorMessage(null);
    setStep(3);
  };

  // Step 3: Handle form submission to create order and invoke Razorpay checkout
  const onSubmit = async (data: CreditReportRequestInput) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create Razorpay order
      const response = await fetch("/api/credit/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      setCreditReportId(orderData.credit_report_id);

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load payment checkout page. Check your internet connection.");
      }

      // 3. Launch Razorpay payment options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DigiConnect Dukan",
        description: `Credit Bureau Report - ${orderData.packageType || "PDF"}`,
        order_id: orderData.order_id,
        prefill: {
          name: data.fullName,
          contact: data.mobile,
        },
        theme: {
          color: "#0f172a", // Dark indigo theme color
        },
        handler: async (paymentRes: RazorpayPaymentResponse) => {
          setStep(4); // Move to retrieving score loader
          setLoading(true);

          try {
            // 4. Verify payment signature and pull credit score from Unifers
            const verifyResponse = await fetch("/api/credit/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: paymentRes.razorpay_payment_id,
                razorpay_order_id: paymentRes.razorpay_order_id,
                razorpay_signature: paymentRes.razorpay_signature,
                credit_report_id: orderData.credit_report_id,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // Success! Store result
            setResult(verifyData.result);
            setStep(5); // Result display page
            if (onSuccess) onSuccess(verifyData.result);
          } catch (verifyErr: unknown) {
            const verifyErrMsg = verifyErr instanceof Error ? verifyErr.message : "Failed to retrieve credit report after payment.";
            setErrorMessage(verifyErrMsg);
            setStep(3); // Go back to package selection step
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const RazorpayCtor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!RazorpayCtor) {
        throw new Error("Razorpay SDK is not loaded.");
      }
      const rzp = new RazorpayCtor(options as unknown as Record<string, unknown>);
      rzp.open();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred during submission.";
      setErrorMessage(errMsg);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-start gap-3 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Error processing request</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Step 1: Input details */}
      {step === 1 && (
        <div className="space-y-6 bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl text-white">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold tracking-tight">Check Credit Score</h2>
            <p className="text-white/60 text-xs">Verify your identity to pull official TransUnion CIBIL credit score</p>
          </div>

          <form onSubmit={handleSubmit(handleProceedToConsent)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-white/95 block">Full Name (As in PAN)</label>
              <Input
                id="fullName"
                placeholder="Ex. Noushad Khan"
                className="bg-white/5 border-white/10 text-white placeholder-white/40 h-11"
                {...register("fullName")}
              />
              {errors.fullName && <p className="text-red-400 text-xs">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="mobile" className="text-sm font-medium text-white/95 block">10-Digit Mobile Number</label>
              <Input
                id="mobile"
                placeholder="Ex. 9305086491"
                className="bg-white/5 border-white/10 text-white placeholder-white/40 h-11"
                {...register("mobile")}
              />
              {errors.mobile && <p className="text-red-400 text-xs">{errors.mobile.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="pan" className="text-sm font-medium text-white/95 block">PAN Number</label>
              <Input
                id="pan"
                placeholder="Ex. CMAPR8492K"
                className="bg-white/5 border-white/10 text-white placeholder-white/40 h-11 uppercase"
                {...register("pan")}
              />
              {errors.pan && <p className="text-red-400 text-xs">{errors.pan.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="dob" className="text-sm font-medium text-white/95 block">Date of Birth</label>
              <Input
                id="dob"
                type="date"
                className="bg-white/5 border-white/10 text-white placeholder-white/40 h-11"
                {...register("dob")}
              />
              {errors.dob && <p className="text-red-400 text-xs">{errors.dob.message}</p>}
            </div>

            <Button type="submit" className="w-full bg-white hover:bg-white/95 text-black font-semibold h-11 mt-4">
              Proceed to Consent
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        </div>
      )}

      {/* Step 2: Consent confirmation */}
      {step === 2 && (
        <div className="space-y-6 bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl text-white">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold tracking-tight">RBI Compliance Consent</h2>
            <p className="text-white/60 text-xs">Read and accept consent text to check score</p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-white/70 leading-relaxed max-h-48 overflow-y-auto space-y-3">
            <p className="font-semibold text-white">Credit Score Search Consent Wording:</p>
            <p>
              &quot;We confirm and undertake that valid end-user consent has been obtained for fetching CIBIL. I hereby authorize DigiConnect Dukan (Powered by RNOS India Pvt. Ltd.) to fetch my credit information from TransUnion CIBIL, CRIF, and other credit bureaus on my behalf.&quot;
            </p>
            <p>
              I understand that this search will be registered as a soft enquiry on my credit profile and will not adversely impact my overall credit score.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consentChecked}
              onChange={(e) => setValue("consent", e.target.checked)}
              className="mt-1 border-white/30 rounded bg-white/5 text-slate-950 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-white/80 leading-normal cursor-pointer select-none">
              I agree and authorize DigiConnect Dukan to check my credit rating score and download my reports.
            </label>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-white/10 hover:bg-white/5 text-white h-11">
              Back
            </Button>
            <Button onClick={handleProceedToPackages} className="flex-1 bg-white hover:bg-white/95 text-black font-semibold h-11">
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Package selection & Payment */}
      {step === 3 && (
        <div className="space-y-6 bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl text-white">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold tracking-tight">Choose Package</h2>
            <p className="text-white/60 text-xs">Select your preferred report option below</p>
          </div>

          <div className="space-y-3">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.type}
                onClick={() => setValue("packageType", pkg.type)}
                className={`border rounded-xl p-4 cursor-pointer relative transition-all flex items-start gap-3 ${
                  selectedPackageType === pkg.type
                    ? "border-white bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {pkg.recommended && (
                  <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Recommended
                  </span>
                )}
                <div className="mt-1">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedPackageType === pkg.type ? "border-white bg-white" : "border-white/30"
                  }`}>
                    {selectedPackageType === pkg.type && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white text-sm">{pkg.name}</span>
                    <span className="font-bold text-white text-base">₹{pkg.price}</span>
                  </div>
                  <p className="text-xs text-white/50 mt-1 leading-normal">{pkg.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-white/10 hover:bg-white/5 text-white h-11">
              Back
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="flex-1 bg-white hover:bg-white/95 text-black font-semibold h-11 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay & Verify Score
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Fetch score loader */}
      {step === 4 && (
        <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-white text-center space-y-6 flex flex-col items-center justify-center py-16">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
            <Sparkles className="w-6 h-6 text-yellow-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Contacting Credit Bureaus...</h3>
            <p className="text-xs text-white/50 max-w-xs leading-normal">
              Payment verified. We are retrieving your official score, account details, and active overdraft liabilities. Please do not close or refresh this tab.
            </p>
          </div>
        </div>
      )}

      {/* Step 5: Completed result */}
      {step === 5 && result && (
        <div className="space-y-6">
          <CreditScoreCard
            result={result}
            onDownload={() => {
              window.open(`/api/credit/download?id=${creditReportId}`, "_blank");
            }}
          />
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setResult(null);
                setStep(1);
              }}
              variant="ghost"
              className="text-white/60 hover:text-white text-xs flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              Check another Credit Score
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
