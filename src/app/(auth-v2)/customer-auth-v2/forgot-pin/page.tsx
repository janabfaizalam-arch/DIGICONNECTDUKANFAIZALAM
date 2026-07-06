"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, ShieldCheck, KeyRound, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomerForgotPinV2Page() {
  const router = useRouter();
  const [step, setStep] = useState<"mobile" | "otp" | "reset">("mobile");
  
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer-auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp, purpose: "password_reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer-auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset PIN");
      router.push("/customer-auth-v2/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50 focus:border-[#00bfa5] transition-all backdrop-blur-sm";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <motion.h1 
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
          >
            {step === "mobile" ? "Forgot PIN" : step === "otp" ? "Verify WhatsApp" : "Set New PIN"}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/50 mt-2 text-sm font-medium"
          >
            {step === "mobile" ? "Enter your mobile to receive an OTP" : step === "otp" ? `Enter the code sent to ${mobile}` : "Create a new 6-digit PIN"}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center backdrop-blur-md"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === "mobile" && (
            <motion.form 
              key="mobile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp} 
              className="space-y-5"
            >
              <div className="relative group">
                <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                <input 
                  required 
                  type="tel" 
                  placeholder="Mobile Number" 
                  value={mobile} 
                  onChange={e => setMobile(e.target.value.replace(/\\D/g, '').slice(0, 10))} 
                  className={`${inputClass} pl-12`} 
                />
              </div>

              <button 
                disabled={isLoading || mobile.length !== 10} 
                type="submit" 
                className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(37,211,102,0.15)] hover:shadow-[0_0_30px_rgba(37,211,102,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send WhatsApp OTP <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </motion.form>
          )}

          {step === "otp" && (
            <motion.form 
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-5"
            >
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-[#25D366]" />
                <input 
                  required 
                  type="text" 
                  placeholder="6-Digit OTP" 
                  maxLength={6} 
                  value={otp} 
                  onChange={e => setOtp(e.target.value.replace(/\\D/g, ''))} 
                  className={`${inputClass} pl-12 font-mono tracking-widest text-center`} 
                />
              </div>

              <button 
                disabled={isLoading || otp.length !== 6} 
                type="submit" 
                className="w-full bg-white text-[#0a0f16] font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0a0f16]" /> : "Verify OTP"}
              </button>
            </motion.form>
          )}

          {step === "reset" && (
            <motion.form 
              key="reset"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleResetPin} 
              className="space-y-5"
            >
              <div className="relative group">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-[#00bfa5]" />
                <input 
                  required 
                  type="password" 
                  placeholder="New 6-Digit PIN" 
                  maxLength={6} 
                  value={newPin} 
                  onChange={e => setNewPin(e.target.value.replace(/\\D/g, ''))} 
                  className={`${inputClass} pl-12 font-mono tracking-widest text-center`} 
                />
              </div>

              <button 
                disabled={isLoading || newPin.length !== 6} 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#00bfa5] to-[#00897b] text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(0,191,165,0.2)] hover:shadow-[0_0_30px_rgba(0,191,165,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : "Save New PIN"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="text-center mt-6 pt-4 border-t border-white/5">
          <Link href="/customer-auth-v2/login" className="text-white/40 hover:text-white text-xs transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
