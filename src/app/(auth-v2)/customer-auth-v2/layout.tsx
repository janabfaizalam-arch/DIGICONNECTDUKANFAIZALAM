import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DigiConnect | Authentic Access",
  description: "Secure, reliable, and premium authentication.",
};

export default function CustomerAuthV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Premium Glassmorphism Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#00bfa5] blur-[150px] opacity-20 rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00e5ff] blur-[150px] opacity-15 rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-indigo-500 blur-[120px] opacity-10 rounded-full mix-blend-screen pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none" />

      {/* Main Content Area */}
      <main className="w-full max-w-md relative z-10 perspective-1000">
        {children}
      </main>
    </div>
  );
}
