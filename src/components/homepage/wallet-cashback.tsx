"use client";

import React from "react";
import Link from "next/link";
import { Wallet, Gift, ArrowRight } from "lucide-react";

export function WalletCashback() {
  return (
    <section className="bg-white py-10 px-3">
      {/* Defined Coin Floating Rotation Keyframes */}
      <style jsx global>{`
        @keyframes float-coin {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(15deg); }
        }
        .anim-coin {
          animation: float-coin 4s ease-in-out infinite;
        }
      `}</style>

      <div className="container-shell">
        <div className="rounded-[2.25rem] border border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 p-6 shadow-sm md:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center text-left">
            
            {/* Left Wallet Card Graphic */}
            <div className="relative flex justify-center items-center h-52">
              {/* Stacked cards representing wallet */}
              <div className="absolute w-[240px] h-[150px] rounded-2xl bg-indigo-950 border border-white/10 shadow-lg rotate-[-6deg] translate-x-2 -translate-y-2 opacity-50" />
              <div className="absolute w-[240px] h-[150px] rounded-2xl bg-slate-900 border border-white/15 shadow-xl rotate-[3deg] translate-x-4 translate-y-2 opacity-80" />
              
              {/* Front premium card */}
              <div className="relative w-[250px] h-[155px] rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 border border-white/20 p-5 shadow-2xl flex flex-col justify-between text-white overflow-hidden snap-center">
                {/* Sheen reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black tracking-widest uppercase text-white/80">DigiWallet</h3>
                    <p className="text-[9px] font-bold text-blue-200 mt-0.5">RNOS Customer Rewards</p>
                  </div>
                  <Wallet className="h-5 w-5 text-blue-200" />
                </div>
                
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase text-blue-200 tracking-wider">Estimated Rewards</p>
                  <p className="text-xl font-black">20% Cashback</p>
                </div>
                
                <div className="flex justify-between items-center text-[8.5px] font-black tracking-wide text-white/70 border-t border-white/10 pt-3">
                  <span>100% SECURE CHECKOUT</span>
                  <span>RNoS Pvt. Ltd.</span>
                </div>
              </div>

              {/* Pulsing floating gold reward coin overlay */}
              <div className="absolute -right-2 top-8 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xl anim-coin">
                ₹
              </div>
            </div>

            {/* Right Content details */}
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm">
                <Gift className="h-3.5 w-3.5 text-orange-500" />
                Wallet Rewards Program
              </span>
              
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl leading-tight">
                Cashback in Wallet on Every Paid Service
              </h2>
              
              <p className="text-sm font-semibold text-slate-500">
                Humare platform par check out karte hi receive karein guaranteed reward benefits. DigiWallet points ko aap future service form submissions me up to 50% discount ke liye direct use kar sakte hain.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 mt-0.5">
                    1
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 leading-tight">20% Cashback Rewards</h4>
                    <p className="text-xs font-bold text-slate-450 mt-0.5">Every paid service automatically adds 20% points back into your wallet.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 mt-0.5">
                    2
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 leading-tight">100% First Service Cashback</h4>
                    <p className="text-xs font-bold text-slate-450 mt-0.5">Naye users ke liye first service support charge 100% wallet reward me refund.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/customer/wallet"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-xs font-black text-white hover:bg-slate-900 transition active:scale-[0.98] shadow-sm"
                >
                  Go To Wallet Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
