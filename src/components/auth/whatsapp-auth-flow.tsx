"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Phone, ArrowLeft, RefreshCw, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ButtonSpinner, FormSubmitButton } from "@/components/ui/loading";
import { useToast } from "@/components/providers/toast-provider";
import { indianMobilePattern } from "@/lib/customer-oauth";

type AuthPhase = "mobile" | "otp";
type AuthPurpose = "login" | "signup" | "password_reset";

export function WhatsappAuthFlow({ 
  purpose = "login", 
  onSuccess 
}: { 
  purpose?: AuthPurpose;
  onSuccess?: (destination: string) => void;
}) {
  const { error: toastError, success: toastSuccess } = useToast();
  
  const [phase, setPhase] = useState<AuthPhase>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const normalizeMobile = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  const handleSendOTP = async () => {
    const cleanMobile = normalizeMobile(mobile);
    if (!indianMobilePattern.test(cleanMobile)) {
      toastError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/auth/send-whatsapp-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile, purpose })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send OTP.");
      
      toastSuccess("OTP sent to your WhatsApp.");
      setPhase("otp");
      setTimeLeft(60); // 60 seconds countdown
      
      // Auto focus first OTP input
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async (completeOtp: string) => {
    if (completeOtp.length !== 6) return;
    
    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/verify-whatsapp-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mobile: normalizeMobile(mobile), 
          otp: completeOtp, 
          purpose 
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to verify OTP.");
      
      toastSuccess(data.message || "Verified successfully.");
      
      if (onSuccess) {
        onSuccess(data.destination || "/customer/dashboard");
      } else {
        window.location.assign(data.destination || "/customer/dashboard");
      }
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Invalid OTP.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    // If typing a digit
    if (value.length === 1) {
      newOtp[index] = value;
      setOtp(newOtp);
      // Auto advance
      if (index < 5) {
        otpRefs.current[index + 1]?.focus();
      } else {
        // Auto submit
        handleVerifyOTP(newOtp.join(""));
      }
    } else if (value.length === 0) {
      // If deleting
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      // Focus previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    if (pastedData.length === 6) {
      handleVerifyOTP(newOtp.join(""));
    } else {
      otpRefs.current[pastedData.length]?.focus();
    }
  };

  if (phase === "mobile") {
    return (
      <div className="flex flex-col gap-4 text-left">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">WhatsApp Number</span>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(normalizeMobile(e.target.value))}
              disabled={isSending}
              className="h-12 bg-white pl-11 text-base shadow-sm focus-visible:ring-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
            />
          </div>
        </label>

        <FormSubmitButton
          type="button"
          loading={isSending}
          loadingText="Sending OTP..."
          icon={<MessageCircle className="h-4 w-4" />}
          onClick={handleSendOTP}
          disabled={!mobile || mobile.length !== 10 || isSending}
          className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
        >
          Continue with WhatsApp
        </FormSubmitButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-left animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setPhase("mobile")} 
          disabled={isVerifying}
          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-sm font-semibold text-slate-700">Enter WhatsApp OTP</span>
          <p className="text-xs text-slate-500">Sent to +91 {mobile}</p>
        </div>
      </div>

      <div className="flex justify-between gap-2 mt-2">
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              otpRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            onPaste={handleOtpPaste}
            disabled={isVerifying}
            className="h-14 w-12 text-center text-xl font-bold bg-white shadow-sm focus-visible:ring-emerald-500"
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={handleSendOTP}
          disabled={timeLeft > 0 || isSending || isVerifying}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:opacity-50 disabled:hover:text-emerald-600"
        >
          {isSending ? (
            <ButtonSpinner className="h-3 w-3" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : "Resend OTP"}
        </button>
      </div>

      <FormSubmitButton
        type="button"
        loading={isVerifying}
        loadingText="Verifying..."
        icon={<LogIn className="h-4 w-4" />}
        onClick={() => handleVerifyOTP(otp.join(""))}
        disabled={otp.join("").length !== 6 || isVerifying}
        className="h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
      >
        Verify and Securely Login
      </FormSubmitButton>
    </div>
  );
}
