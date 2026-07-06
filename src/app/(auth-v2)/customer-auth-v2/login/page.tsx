"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CustomerLoginV2Page() {
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/customer-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, pin, rememberMe }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      window.location.href = "/customer/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
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
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
          >
            Welcome Back
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 mt-2 text-sm font-medium"
          >
            Secure access to your workspace
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center backdrop-blur-md"
              role="alert"
              aria-live="polite"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-5">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative group"
          >
            <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
            <input 
              required 
              type="tel" 
              placeholder="Mobile Number" 
              value={mobile} 
              onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
              className={`${inputClass} pl-12`} 
              aria-invalid={!!error}
              aria-label="Mobile Number"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="relative group"
          >
            <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
            <input 
              required 
              type="password" 
              placeholder="6-Digit PIN" 
              maxLength={6} 
              value={pin} 
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))} 
              className={`${inputClass} pl-12 font-mono tracking-widest`} 
              aria-invalid={!!error}
              aria-label="6-Digit PIN"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-between"
          >
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 border-2 border-white/20 rounded-md peer-checked:bg-[#00bfa5] peer-checked:border-[#00bfa5] transition-all flex items-center justify-center">
                  <svg className={`w-3.5 h-3.5 text-white ${rememberMe ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-white/60 text-sm group-hover:text-white transition-colors">Remember this device</span>
            </label>
            <Link href="/customer-auth-v2/forgot-pin" className="text-[#00bfa5] hover:text-[#00e5ff] text-sm font-semibold transition-colors">
              Forgot PIN?
            </Link>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading || mobile.length !== 10 || pin.length !== 6} 
            type="submit" 
            className="w-full bg-white text-[#0a0f16] font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#00bfa5]" /> : <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
          </motion.button>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-6 pt-4 border-t border-white/5"
          >
            <span className="text-white/40 text-xs font-medium">New to DigiConnect? </span>
            <Link href="/customer-auth-v2/signup" className="text-white hover:text-[#00bfa5] font-semibold text-xs transition-colors">
              Create an account
            </Link>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
}
