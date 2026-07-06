"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, ShieldCheck, User, Mail, Link as LinkIcon, 
  MapPin, Home, Map, Navigation, KeyRound, Loader2, ArrowRight, CheckCircle2 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomerSignupV3Wizard() {
  const router = useRouter();
  
  // Step Management
  const [step, setStep] = useState<"mobile" | "otp" | "profile" | "address" | "pin" | "success">("mobile");
  
  // Data States
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");

  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [country] = useState("India");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const res = await fetch("/api/customer-auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStep("otp");
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } 
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const res = await fetch("/api/customer-auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setStep("profile");
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } 
    finally { setIsLoading(false); }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return setError("Full Name is required.");
    setError("");
    setStep("address");
  };

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
    } catch {
      console.log("Failed to fetch pincode");
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(val);
    if (val.length === 6) fetchPincodeDetails(val);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNo || !street || !pincode || !city || !state) return setError("Please fill all required address fields.");
    setError("");
    setStep("pin");
  };

  const calculatePinStrength = (p: string) => {
    if (p.length < 6) return 0;
    if (/^(\d)\1{5}$/.test(p)) return 1; // e.g. 111111
    if (p === "123456" || p === "654321") return 1;
    const uniqueDigits = new Set(p.split("")).size;
    if (uniqueDigits <= 3) return 2;
    return 3;
  };
  const pinStrength = calculatePinStrength(pin);
  const strengthColors = ["bg-gray-500", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) return setError("PINs do not match.");
    if (pin.length !== 6) return setError("PIN must be 6 digits.");
    
    setError(""); setIsLoading(true);
    try {
      const res = await fetch("/api/customer-auth/set-pin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mobile, pin, name, father_or_husband_name: fatherName, email, 
          house_no: houseNo, street, landmark, country, 
          pincode, city, district, state, referral_code: referral 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");
      
      setStep("success");
      setTimeout(() => {
        router.push("/customer-v2/dashboard");
      }, 2000);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } 
    finally { setIsLoading(false); }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50 focus:border-[#00bfa5] transition-all backdrop-blur-sm";

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: { zIndex: 0, x: -50, opacity: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {step !== "success" && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              {step === "mobile" && "Create Account"}
              {step === "otp" && "Verify WhatsApp"}
              {step === "profile" && "Personal Details"}
              {step === "address" && "Your Address"}
              {step === "pin" && "Secure Your Account"}
            </h1>
            <p className="text-white/50 mt-2 text-sm font-medium">
              Step {["mobile", "otp", "profile", "address", "pin"].indexOf(step) + 1} of 5
            </p>
            {/* Progress Bar */}
            <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#00bfa5] to-[#00e5ff]"
                initial={{ width: 0 }}
                animate={{ width: `${(["mobile", "otp", "profile", "address", "pin"].indexOf(step) + 1) * 20}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

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

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {step === "mobile" && (
              <motion.form key="mobile" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleSendOtp} className="space-y-5">
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                  <input required type="tel" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className={`${inputClass} pl-12`} aria-invalid={!!error} />
                </div>
                <button disabled={isLoading || mobile.length !== 10} type="submit" className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(37,211,102,0.15)] hover:shadow-[0_0_30px_rgba(37,211,102,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 group">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send WhatsApp OTP <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </button>
              </motion.form>
            )}

            {step === "otp" && (
              <motion.form key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-[#25D366]" />
                  <input required type="text" placeholder="6-Digit OTP" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className={`${inputClass} pl-12 font-mono tracking-widest text-center`} aria-invalid={!!error} />
                </div>
                <button disabled={isLoading || otp.length !== 6} type="submit" className="w-full bg-white text-[#0a0f16] font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0a0f16]" /> : "Verify OTP"}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setStep("mobile")} className="text-xs text-white/40 hover:text-white transition-colors">Change Number</button>
                </div>
              </motion.form>
            )}

            {step === "profile" && (
              <motion.form key="profile" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleProfileSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                  <input required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className={`${inputClass} pl-12`} />
                </div>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                  <input placeholder="Father/Husband Name (Optional)" value={fatherName} onChange={e => setFatherName(e.target.value)} className={`${inputClass} pl-12`} />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                  <input type="email" placeholder="Email Address (Optional)" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} pl-12`} />
                </div>
                <div className="relative group">
                  <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                  <input placeholder="Referral Code (Optional)" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())} className={`${inputClass} pl-12`} />
                </div>
                <button type="submit" className="w-full bg-white text-[#0a0f16] font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 mt-4">
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            )}

            {step === "address" && (
              <motion.form key="address" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleAddressSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <Home className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                    <input required placeholder="House No." value={houseNo} onChange={e => setHouseNo(e.target.value)} className={`${inputClass} pl-12`} />
                  </div>
                  <input required placeholder="Street/Area" value={street} onChange={e => setStreet(e.target.value)} className={inputClass} />
                </div>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                  <input placeholder="Landmark (Optional)" value={landmark} onChange={e => setLandmark(e.target.value)} className={`${inputClass} pl-12`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <Navigation className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
                    <input required placeholder="PIN Code" maxLength={6} value={pincode} onChange={handlePincodeChange} className={`${inputClass} pl-12`} />
                  </div>
                  <input required placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} />
                  <input required placeholder="State" value={state} onChange={e => setState(e.target.value)} className={inputClass} />
                </div>
                <div className="relative group">
                  <Map className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
                  <input readOnly value={country} className={`${inputClass} pl-12 opacity-70 cursor-not-allowed`} />
                </div>
                <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setStep("profile")} className="w-1/3 bg-white/10 text-white font-bold py-3.5 rounded-2xl">Back</button>
                  <button type="submit" className="w-2/3 bg-white text-[#0a0f16] font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.form>
            )}

            {step === "pin" && (
              <motion.form key="pin" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleFinalSubmit} className="space-y-5">
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-[#00bfa5]" />
                  <input required type="password" placeholder="Create 6-Digit PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={`${inputClass} pl-12 font-mono tracking-widest text-center text-lg`} />
                </div>
                
                {/* PIN Strength Indicator */}
                {pin.length > 0 && (
                  <div className="px-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">PIN Strength</span>
                      <span className={`font-semibold ${strengthColors[pinStrength].replace('bg-', 'text-')}`}>{strengthLabels[pinStrength]}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex gap-1">
                      {[1,2,3].map(level => (
                        <div key={level} className={`h-full flex-1 transition-colors duration-300 ${pinStrength >= level ? strengthColors[pinStrength] : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative group">
                  <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-[#00bfa5]/50" />
                  <input required type="password" placeholder="Confirm 6-Digit PIN" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} className={`${inputClass} pl-12 font-mono tracking-widest text-center text-lg`} />
                </div>

                <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setStep("address")} className="w-1/3 bg-white/10 text-white font-bold py-3.5 rounded-2xl" disabled={isLoading}>Back</button>
                  <button disabled={isLoading || pin.length !== 6 || confirmPin.length !== 6 || pinStrength < 2} type="submit" className="w-2/3 bg-gradient-to-r from-[#00bfa5] to-[#00897b] text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(0,191,165,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finish Registration <CheckCircle2 className="w-4 h-4" /></>}
                  </button>
                </div>
              </motion.form>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }} transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }} className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
                <p className="text-white/60">Taking you to your dashboard...</p>
                <Loader2 className="w-6 h-6 animate-spin text-[#00bfa5] mt-8" />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {step === "mobile" && (
          <div className="text-center mt-6 pt-4 border-t border-white/5">
            <span className="text-white/40 text-xs font-medium">Already have an account? </span>
            <Link href="/customer-auth-v2/login" className="text-white hover:text-[#00bfa5] font-semibold text-xs transition-colors">
              Sign In
            </Link>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}} />
    </motion.div>
  );
}
