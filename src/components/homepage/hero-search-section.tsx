import React from "react";
import Link from "next/link";
import { Sparkles, MessageCircle, LogIn, Star, Award } from "lucide-react";
import { getActiveHomepageSlides } from "@/lib/homepage-slides";
import { HomepageDynamicSliderClient } from "../homepage-dynamic-slider-client";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export async function HeroSearchSection() {
  const slides = await getActiveHomepageSlides();

  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "hero", topic: "Instant mobile assistant" })
  );

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Scoped CSS animations for the Hero Visual System */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-s {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes float-m {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes float-f {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(2deg); }
        }
        @keyframes bubble-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(15px, -20px) scale(1.1); opacity: 0.3; }
        }
        @keyframes bubble-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1.05); opacity: 0.2; }
          50% { transform: translate(-20px, -15px) scale(0.95); opacity: 0.35; }
        }
        @keyframes pulse-ring-glow {
          0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { transform: scale(1.1); opacity: 0; box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
          100% { transform: scale(0.95); opacity: 0; box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .anim-float-gst { animation: float-s 6s ease-in-out infinite; }
        .anim-float-passport { animation: float-m 7s ease-in-out infinite; }
        .anim-float-dl { animation: float-f 8s ease-in-out infinite; }
        .anim-float-cashback { animation: float-s 5s ease-in-out infinite; }
        
        .bubble-1 { animation: bubble-drift-1 10s ease-in-out infinite; }
        .bubble-2 { animation: bubble-drift-2 12s ease-in-out infinite; }
        .pulse-badge { animation: pulse-ring-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}} />

      {/* Background drifting service bubbles */}
      <div className="absolute top-10 left-[5%] w-24 h-24 rounded-full bg-blue-100/30 backdrop-blur-xs bubble-1 pointer-events-none z-10" />
      <div className="absolute top-40 right-[10%] w-16 h-16 rounded-full bg-orange-100/30 backdrop-blur-xs bubble-2 pointer-events-none z-10" />
      <div className="absolute bottom-20 left-[25%] w-12 h-12 rounded-full bg-indigo-50/40 backdrop-blur-xs bubble-1 pointer-events-none z-10" />

      {/* Full-width Slider */}
      <div className="w-full">
        <div className="relative overflow-hidden">
          <HomepageDynamicSliderClient slides={slides} />
        </div>
      </div>

      {/* Mobile-Only Conversion CTAs (Visible within first screen above the fold) */}
      <div className="block lg:hidden mx-3 mt-4 mb-2 z-30 relative">
        <div className="rounded-2xl border border-blue-100/50 bg-gradient-to-r from-blue-50/40 to-orange-50/30 backdrop-blur-md p-3 shadow-md">
          <div className="grid grid-cols-4 gap-2 text-center">
            
            {/* Apply Now */}
            <Link 
              href="/featured-services"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-xs active:scale-95 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 relative">
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <span className="mt-1.5 text-[9.5px] font-black text-slate-800 leading-none">Apply Now</span>
            </Link>

            {/* WhatsApp Support */}
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-emerald-100/85 shadow-xs active:scale-95 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="h-4.5 w-4.5" />
              </div>
              <span className="mt-1.5 text-[9.5px] font-black text-slate-800 leading-none">WhatsApp</span>
            </a>

            {/* Customer Login */}
            <Link 
              href="/login/customer"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-100 shadow-xs active:scale-95 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                <LogIn className="h-4.5 w-4.5" />
              </div>
              <span className="mt-1.5 text-[9.5px] font-black text-slate-800 leading-none">Login</span>
            </Link>

            {/* Top Picks */}
            <a 
              href="#featured-services"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-orange-100/80 shadow-xs active:scale-95 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Star className="h-4.5 w-4.5" />
              </div>
              <span className="mt-1.5 text-[9.5px] font-black text-slate-800 leading-none">Top Picks</span>
            </a>

          </div>
        </div>
      </div>

      {/* Floating Glass Cards overlay (desktop only) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-20">
        
        {/* Floating GST Certificate Card (Left Top) */}
        <div className="absolute left-[5%] top-[18%] bg-white/80 backdrop-blur-md border border-slate-200/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(15,23,42,0.04)] flex items-center gap-3 anim-float-gst max-w-[220px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M10 9H8"/>
              <path d="M16 13H8"/>
              <path d="M16 17H8"/>
            </svg>
          </span>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-md">Gov Verify</span>
            </div>
            <h4 className="text-[11px] font-black text-slate-800 mt-1 leading-none">GST Certificate</h4>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-none">Approved & Ready</p>
          </div>
        </div>

        {/* Floating Passport Card (Left Bottom) */}
        <div className="absolute left-[8%] bottom-[15%] bg-white/80 backdrop-blur-md border border-slate-200/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(15,23,42,0.04)] flex items-center gap-3 anim-float-passport max-w-[220px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-compass">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </span>
          <div className="text-left">
            <h4 className="text-[11px] font-black text-slate-800 leading-none">Passport Application</h4>
            <p className="text-[9px] font-semibold text-slate-500 mt-1 leading-none">Fast Appointment</p>
            <div className="mt-1 flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 inline-block pulse-badge" />
              <span className="text-[7.5px] font-black text-indigo-600">Slot Scheduled</span>
            </div>
          </div>
        </div>

        {/* Floating Driving Licence Card (Right Top) */}
        <div className="absolute right-[5%] top-[15%] bg-white/80 backdrop-blur-md border border-slate-200/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(15,23,42,0.04)] flex items-center gap-3 anim-float-dl max-w-[220px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Award className="h-5.5 w-5.5" />
          </span>
          <div className="text-left">
            <h4 className="text-[11px] font-black text-slate-800 leading-none">Driving Licence</h4>
            <p className="text-[9px] font-bold text-slate-400 mt-1 leading-none">RTO Registration</p>
            <p className="text-[9px] font-bold text-emerald-600 mt-0.5 leading-none">✓ DL Dispatched</p>
          </div>
        </div>

        {/* Floating Wallet Cashback Card (Right Bottom) */}
        <div className="absolute right-[8%] bottom-[20%] bg-white/80 backdrop-blur-md border border-slate-200/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(15,23,42,0.04)] flex items-center gap-3 anim-float-cashback max-w-[220px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coins">
              <circle cx="8" cy="8" r="6"/>
              <circle cx="18" cy="18" r="6"/>
              <path d="M12 18a6 6 0 0 0-6-6"/>
            </svg>
          </span>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-[7.5px] font-black text-orange-600 uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded-md">20% Cash</span>
            </div>
            <h4 className="text-[11px] font-black text-slate-800 mt-1 leading-none">DigiWallet Reward</h4>
            <p className="text-[9px] font-bold text-orange-600 mt-1 leading-none">₹200 cashback earned</p>
          </div>
        </div>

      </div>
    </section>
  );
}
