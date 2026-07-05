"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Smartphone, KeyRound, MapPin, User, CheckCircle2 } from "lucide-react";

type FlowState = "login" | "signup_mobile" | "signup_otp" | "signup_details" | "forgot_mobile" | "forgot_otp" | "forgot_reset";

export function CustomerAuthUI({ redirectUrl, initialRef }: { redirectUrl: string, initialRef: string }) {
  const [flow, setFlow] = useState<FlowState>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  
  // Signup Details
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [referral, setReferral] = useState(initialRef);

  const fetchPincodeDetails = async (code: string) => {
    if (code.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
      const data = await res.json();
      if (data[0].Status === "Success") {
        const po = data[0].PostOffice[0];
        setDistrict(po.District);
        setCity(po.Block || po.District);
        setState(po.State);
      }
    } catch (e) {
      console.log("Failed to fetch pincode");
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(val);
    if (val.length === 6) fetchPincodeDetails(val);
  };

  const handleSendOTP = async (purpose: "signup" | "password_reset") => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setFlow(purpose === "signup" ? "signup_otp" : "forgot_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (purpose: "signup" | "password_reset") => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setFlow(purpose === "signup" ? "signup_details" : "forgot_reset");
      setOtp(""); // clear
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, name, address, pincode, city, district, state, referral_code: referral, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      window.location.href = redirectUrl;
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
      const res = await fetch("/api/customer/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, newPin: pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setFlow("login");
      setPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00bfa5] focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden text-white font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00bfa5] blur-[150px] opacity-20 rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00e5ff] blur-[150px] opacity-10 rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            {flow === "login" ? "Welcome Back" : 
             flow.includes("signup") ? "Create Account" : "Reset PIN"}
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            {flow === "login" ? "Enter your mobile number and PIN to continue" : 
             flow.includes("signup") ? "Join us with a secure WhatsApp authentication" : "Verify your identity to reset PIN"}
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {flow === "login" && (
            <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} className="space-y-5">
              <div className="relative">
                <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
                <input required type="tel" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} className={`${inputClass} pl-12`} />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
                <input required type="password" placeholder="6-Digit PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={`${inputClass} pl-12`} />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setFlow("forgot_mobile")} className="text-sm text-[#00bfa5] hover:text-[#00e5ff] transition-colors">Forgot PIN?</button>
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-gradient-to-r from-[#00bfa5] to-[#00897b] text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-[#00bfa5]/25 transition-all flex items-center justify-center gap-2 group">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Login <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
              </button>
              <div className="text-center mt-6">
                <span className="text-white/50 text-sm">New here? </span>
                <button type="button" onClick={() => setFlow("signup_mobile")} className="text-[#00bfa5] hover:text-[#00e5ff] font-medium text-sm transition-colors">Continue with WhatsApp</button>
              </div>
            </motion.form>
          )}

          {(flow === "signup_mobile" || flow === "forgot_mobile") && (
            <motion.div key="mobile_otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <div className="relative">
                <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
                <input type="tel" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} className={`${inputClass} pl-12`} />
              </div>
              <button disabled={isLoading || mobile.length < 10} onClick={() => handleSendOTP(flow === "signup_mobile" ? "signup" : "password_reset")} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send WhatsApp OTP"}
              </button>
              <button onClick={() => setFlow("login")} className="w-full text-white/50 hover:text-white transition-colors text-sm py-2">Back to Login</button>
            </motion.div>
          )}

          {(flow === "signup_otp" || flow === "forgot_otp") && (
            <motion.div key="verify_otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-[#25D366]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-[#25D366]" />
                </div>
                <p className="text-sm text-white/70">Enter the OTP sent to your WhatsApp on <span className="font-semibold text-white">{mobile}</span></p>
              </div>
              <input type="text" placeholder="6-Digit OTP" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className={`${inputClass} text-center tracking-[0.5em] font-mono text-xl`} />
              <button disabled={isLoading || otp.length !== 6} onClick={() => handleVerifyOTP(flow === "signup_otp" ? "signup" : "password_reset")} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
              </button>
              <button onClick={() => setFlow(flow === "signup_otp" ? "signup_mobile" : "forgot_mobile")} className="w-full text-white/50 hover:text-white transition-colors text-sm py-2">Change Number</button>
            </motion.div>
          )}

          {flow === "signup_details" && (
            <motion.form key="signup_details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleSignup} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
                  <input required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className={`${inputClass} pl-12`} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
                    <input required placeholder="Pincode" maxLength={6} value={pincode} onChange={handlePincodeChange} className={`${inputClass} pl-12`} />
                  </div>
                  <input required placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} />
                  <input required placeholder="State" value={state} onChange={e => setState(e.target.value)} className={inputClass} />
                </div>
                
                <input required placeholder="Full Address" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
                
                <input placeholder="Referral Code (Optional)" value={referral} onChange={e => setReferral(e.target.value)} className={inputClass} />
                
                <div className="relative mt-2">
                  <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-[#00bfa5]" />
                  <input required type="password" placeholder="Create 6-Digit PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={`${inputClass} pl-12 border-[#00bfa5]/30 focus:border-[#00bfa5]`} />
                </div>
              </div>
              
              <button disabled={isLoading} type="submit" className="w-full mt-6 bg-gradient-to-r from-[#00bfa5] to-[#00897b] text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-[#00bfa5]/25 transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
              </button>
            </motion.form>
          )}

          {flow === "forgot_reset" && (
            <motion.form key="forgot_reset" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleResetPin} className="space-y-5">
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-[#00bfa5]" />
                <input required type="password" placeholder="New 6-Digit PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={`${inputClass} pl-12 border-[#00bfa5]/30`} />
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-gradient-to-r from-[#00bfa5] to-[#00897b] text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset PIN"}
              </button>
            </motion.form>
          )}

        </AnimatePresence>
      </motion.div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 191, 165, 0.5);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}
