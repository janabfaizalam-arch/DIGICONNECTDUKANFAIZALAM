"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, MapPin, KeyRound, Loader2, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CustomerSetPinV2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobile, setMobile] = useState("");
  
  useEffect(() => {
    const m = searchParams.get("m");
    if (!m) {
      router.replace("/customer-auth-v2/signup");
    } else {
      setMobile(m);
    }
  }, [searchParams, router]);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [referral, setReferral] = useState("");
  const [pin, setPin] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
    const val = e.target.value.replace(/\\D/g, "").slice(0, 6);
    setPincode(val);
    if (val.length === 6) fetchPincodeDetails(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/customer-auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, name, address, pincode, city, district, state, referral_code: referral, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");
      
      window.location.href = "/customer/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50 focus:border-[#00bfa5] transition-all backdrop-blur-sm";

  if (!mobile) return null;

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
          >
            Complete Profile
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/50 mt-2 text-sm font-medium"
          >
            Create your secure PIN and finalize your account
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

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="relative group">
            <User className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
            <input required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className={`${inputClass} pl-12`} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-[#00bfa5] transition-colors" />
              <input required placeholder="Pincode" maxLength={6} value={pincode} onChange={handlePincodeChange} className={`${inputClass} pl-12`} />
            </div>
            <input required placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} />
            <input required placeholder="State" value={state} onChange={e => setState(e.target.value)} className={inputClass} />
          </div>
          
          <input required placeholder="Full Address" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
          <input placeholder="Referral Code (Optional)" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())} className={inputClass} />
          
          <div className="relative group mt-6 pt-6 border-t border-white/10">
            <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-[#00bfa5]" />
            <input required type="password" placeholder="Create 6-Digit PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\\D/g, ''))} className={`${inputClass} pl-12 font-mono tracking-widest text-lg`} />
          </div>
          
          <button 
            disabled={isLoading || pin.length !== 6 || name.length < 2} 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#00bfa5] to-[#00897b] text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(0,191,165,0.2)] hover:shadow-[0_0_30px_rgba(0,191,165,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 group"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finish Registration <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}} />
    </motion.div>
  );
}
