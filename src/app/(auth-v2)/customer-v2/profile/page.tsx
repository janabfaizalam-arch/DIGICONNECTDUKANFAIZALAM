"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, MapPin, Home, Navigation, Map, Loader2, Save, Camera } from "lucide-react";

export default function ProfilePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/customer-auth/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/customer-auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      setSuccessMsg("Profile updated successfully!");
      setProfile(data.profile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg" />
        <div className="h-[500px] bg-white/5 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50 focus:border-[#00bfa5] transition-all backdrop-blur-sm";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Your Profile</h1>
        <p className="text-white/50 mt-1">Manage your personal information and address.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl p-8 space-y-8">
        
        {successMsg && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{errorMsg}</div>
        )}

        {/* Photo & Basic Info */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative group cursor-pointer shrink-0">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/30" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50 pl-1">Full Name</label>
                <input required value={profile?.name || ""} onChange={e => handleInputChange("name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50 pl-1">Mobile Number</label>
                <input readOnly value={profile?.mobile || ""} className={`${inputClass} opacity-50 cursor-not-allowed`} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50 pl-1">Father/Husband Name</label>
                <input value={profile?.father_or_husband_name || ""} onChange={e => handleInputChange("father_or_husband_name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50 pl-1">Email Address</label>
                <input type="email" value={profile?.email || ""} onChange={e => handleInputChange("email", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Address */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-[#00bfa5]" /> Address Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="House No." value={profile?.house_no || ""} onChange={e => handleInputChange("house_no", e.target.value)} className={inputClass} />
              <input placeholder="Street/Area" value={profile?.street || ""} onChange={e => handleInputChange("street", e.target.value)} className={inputClass} />
            </div>
            <input placeholder="Landmark" value={profile?.landmark || ""} onChange={e => handleInputChange("landmark", e.target.value)} className={inputClass} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input placeholder="PIN Code" maxLength={6} value={profile?.pincode || ""} onChange={e => handleInputChange("pincode", e.target.value)} className={inputClass} />
              <input placeholder="City" value={profile?.city || ""} onChange={e => handleInputChange("city", e.target.value)} className={inputClass} />
              <input placeholder="District" value={profile?.district || ""} onChange={e => handleInputChange("district", e.target.value)} className={inputClass} />
              <input placeholder="State" value={profile?.state || ""} onChange={e => handleInputChange("state", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button disabled={isSaving} type="submit" className="bg-[#00bfa5] hover:bg-[#00a68f] text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Save Changes <Save className="w-4 h-4" /></>}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
