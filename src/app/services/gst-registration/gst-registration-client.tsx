"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Check,
  X,
  Star,
  Shield,
  Clock,
  ArrowRight,
  ChevronDown,
  Building,
  UserCheck,
  FileText,
  BadgePercent,
  CheckCircle,
  HelpCircle,
  Users,
  Award,
  Zap,
  Phone,
  Lock,
  Percent,
  Briefcase,
  AlertCircle,
  Compass,
  ArrowUpRight,
  HeartHandshake
} from "lucide-react";
import { OfferCountdown } from "./offer-countdown";

// Custom SVG WhatsApp icon
const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Dynamic Count-Up Component
function Counter({ value, suffix = "", duration = 1500 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const totalSteps = 60;
    const stepTime = duration / totalSteps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      // Ease out quad
      const currentCount = Math.floor(end * (progress * (2 - progress)));
      setCount(currentCount);

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setCount(end);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className="font-heading font-bold tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

interface GSTClientProps {
  isLoggedIn: boolean;
}

export default function GSTRegistrationClient({ isLoggedIn }: GSTClientProps) {
  // States
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Auto scroll logic for testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Track window scroll for header CTA visibility
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const whatsappNumber = "917007595931";
  const supportPhoneNumber = "+917007595931";
  const businessWhatsAppUrl = `https://wa.me/${whatsappNumber}?text=Hi,%20I%20am%20interested%20in%20GST%20Registration%20services.%20Please%20guide%20me.`;
  const defaultApplyUrl = isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`;

  return (
    <div className="relative min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* 1. Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 bg-gradient-to-b from-slate-50/50 to-white overflow-hidden">
        {/* Floating Ambient Background Shapes */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-blue-100/30 rounded-full filter blur-3xl -translate-y-1/2 animate-pulse" />
        <div className="absolute top-1/3 right-1/10 w-96 h-96 bg-indigo-100/20 rounded-full filter blur-3xl translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              >
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-medium text-slate-600 tracking-wide">
                  Trusted by Thousands of Businesses across India
                </span>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-4"
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-slate-900 tracking-tight leading-[1.1]">
                  Register Your GST <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600">
                    in Just a Few Days
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-2xl">
                  Professional GST Registration with Expert Assistance, Fast Processing and End-to-End Support. Get fully compliant without the administrative headache.
                </p>
              </motion.div>

              {/* Pricing Callout & Urgency Badge */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-wrap items-center gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 max-w-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-heading font-bold text-slate-900">₹2,499</span>
                    <span className="text-slate-400 line-through text-sm">₹4,999</span>
                    <span className="text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                      Save ₹2,500
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">All government and professional consultation fees included</p>
                </div>
                <div className="ml-auto">
                  <OfferCountdown />
                </div>
              </motion.div>

              {/* Hero Call to Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href={defaultApplyUrl}
                  className="inline-flex h-12 items-center justify-center gap-2 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-[15px]"
                >
                  Apply Now
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
                <a
                  href={businessWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-200 text-[15px]"
                >
                  <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                  Talk to Expert
                </a>
              </motion.div>
            </div>

            {/* Right Hero Visuals */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative w-full max-w-[420px] aspect-[4/5] bg-gradient-to-tr from-slate-50 to-white rounded-[32px] border border-slate-100 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden"
              >
                {/* Government Inspired Abstract Visual Background */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-100/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-100/20 rounded-full blur-2xl" />
                
                {/* Top visual accent representing Indian Tri-color soft aura */}
                <div className="flex justify-between items-center border-b border-slate-100/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      IN
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Government Portal</p>
                      <p className="text-xs font-bold text-slate-700">GSTIN Network Assistance</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100">
                    Active Integrations
                  </span>
                </div>

                {/* Floating Cards simulating workflow steps */}
                <div className="my-auto space-y-4.5 relative z-10">
                  {/* Card 1: PAN */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100/50">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Business PAN verified</p>
                        <p className="text-[10px] text-slate-400">ABCDE1234F • Active</p>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                  </motion.div>

                  {/* Card 2: Document Verification */}
                  <motion.div
                    animate={{ y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                    className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                        <UserCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Document Audit</p>
                        <p className="text-[10px] text-slate-400">Verified by CA Expert</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50">
                      Completed
                    </span>
                  </motion.div>

                  {/* Card 3: GSTIN Approval */}
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                    className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">GST Certificate Generated</p>
                        <p className="text-[10px] text-slate-400">27AAPCS1234F1Z5 • Active</p>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                  </motion.div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-100/80 pt-4">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Secure 256-bit encryption
                  </span>
                  <span className="font-semibold text-slate-600">DigiConnect Dukan</span>
                </div>
              </motion.div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Instant Trust Bar */}
      <section className="py-6 border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-y-6 gap-x-8">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Building className="h-4 w-4 text-blue-600" />
              <span>Government Assistance Assured</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Experienced Legal Experts</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>100% Secure Document Handling</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Super Fast End-to-End Processing</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <BadgePercent className="h-4 w-4 text-blue-600" />
              <span>Transparent & Affordable Pricing</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <HeartHandshake className="h-4 w-4 text-blue-600" />
              <span>Dedicated Help Desk Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Register GST Section */}
      <section className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 text-center space-y-12">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Why Should You Register for GST?
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Unlock scaling opportunities, ensure legal compliance, and build strong commercial partnerships.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyRegisterList.map((benefit, idx) => (
              <div
                key={idx}
                className="group p-6 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] transition-all duration-300 hover:scale-[1.01]"
              >
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5 group-hover:scale-105 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-base font-bold text-slate-800 text-left mb-2">{benefit.title}</h3>
                <p className="text-xs text-slate-400 text-left leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. GST Benefits Comparison (12+ Points) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              The Power of Having a GSTIN
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Compare how your business functions with vs. without GST registration.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-slate-100 shadow-sm bg-slate-50/20">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-5 text-sm font-bold text-slate-700 w-1/3">Business Attribute</th>
                  <th className="p-5 text-sm font-bold text-rose-700 bg-rose-50/20 w-1/3">Without GST Registration</th>
                  <th className="p-5 text-sm font-bold text-emerald-700 bg-emerald-50/20 w-1/3">With GST Registration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {comparisonPoints.map((point, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-5 text-xs font-bold text-slate-800">{point.attribute}</td>
                    <td className="p-5 text-xs text-slate-500 bg-rose-50/10">
                      <div className="flex items-start gap-2">
                        <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{point.without}</span>
                      </div>
                    </td>
                    <td className="p-5 text-xs text-slate-800 bg-emerald-50/10">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-emerald-950">{point.with}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. Pricing Section (Packages) */}
      <section className="py-20 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Simple, Transparent Pricing Packages
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              No hidden charges. Choose the plan that aligns with your business goals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {/* Package 1 */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">GST Registration</h3>
                  <p className="text-xs text-slate-400 mt-1">Complete online registration file with expert support</p>
                </div>
                
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-heading font-bold text-slate-900">₹2,499</span>
                    <span className="text-slate-400 line-through text-sm">₹4,999</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-bold mt-1">Save ₹2,500 on basic registration</p>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-3.5">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Features included:</p>
                  <ul className="space-y-2.5">
                    {['GST Registration', 'ARN Tracking', 'Expert Support', 'Document Review', 'Application Filing', 'GST Certificate'].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs text-slate-600">
                        <Check className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={defaultApplyUrl}
                  className="flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                >
                  Apply Now
                </Link>
              </div>
            </div>

            {/* Package 2 - Recommended */}
            <div className="bg-white rounded-[24px] border-2 border-blue-600 p-8 shadow-md flex flex-col justify-between relative hover:scale-[1.01] transition-transform">
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">
                Best Value / Recommended
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">GST + MSME</h3>
                  <p className="text-xs text-slate-400 mt-1">Bundle registration with Udyam Certificate for extra credit eligibility</p>
                </div>
                
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-heading font-bold text-slate-900">₹2,799</span>
                    <span className="text-slate-400 line-through text-sm">₹6,999</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-bold mt-1">Save ₹4,200 (Best professional deal)</p>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-3.5">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Everything in Basic, plus:</p>
                  <ul className="space-y-2.5">
                    {['MSME Certificate', 'Business Recognition', 'Govt. Loan Eligibility', 'Electricity Bill Subsidies', 'Priority Desk Support'].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={`${defaultApplyUrl}?services=msme-certificate`}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Apply Now
                </Link>
              </div>
            </div>

            {/* Package 3 - Premium Launch Kit */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-[24px] border border-slate-850 p-8 shadow-sm flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">Business Launch Kit</h3>
                    <p className="text-xs text-slate-400 mt-1">Complete startup bundle to build and maintain business online</p>
                  </div>
                  <span className="bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[9px] font-bold uppercase px-2 py-0.5 rounded">
                    Best Deal
                  </span>
                </div>
                
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-heading font-bold text-white">₹3,899</span>
                    <span className="text-slate-500 line-through text-sm">₹18,499</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-bold mt-1">Save ₹14,600 (Launch discount)</p>
                </div>

                <div className="border-t border-slate-800 pt-6 space-y-3.5">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Premium Inclusions:</p>
                  <ul className="space-y-2.5">
                    {['GST Registration', 'MSME Certificate', 'FSSAI (Food) Registration', 'Professional Web Landing Page', '6 Months Website Maintenance', 'Premium Domain + Hosting Assit.'].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <Check className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={`${defaultApplyUrl}?services=msme-certificate,food-license`}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Package Comparison Table */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Compare Features Side-by-Side
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Detailed breakdown of features across different pricing tiers.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-slate-100 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-5 text-sm font-bold text-slate-700 w-1/4">Key Features</th>
                  <th className="p-5 text-sm font-bold text-slate-700 w-1/4">GST Registration</th>
                  <th className="p-5 text-sm font-bold text-blue-700 bg-blue-50/10 w-1/4">GST + MSME</th>
                  <th className="p-5 text-sm font-bold text-amber-700 w-1/4">Business Launch Kit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {packageFeatures.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-5 text-xs font-bold text-slate-800">{row.feature}</td>
                    <td className="p-5 text-xs text-slate-500">
                      {typeof row.basic === "boolean" ? (row.basic ? <Check className="h-4 w-4 text-blue-600" /> : <X className="h-4 w-4 text-slate-300" />) : row.basic}
                    </td>
                    <td className="p-5 text-xs text-slate-800 bg-blue-50/5">
                      {typeof row.msme === "boolean" ? (row.msme ? <Check className="h-4 w-4 text-blue-600 font-bold" /> : <X className="h-4 w-4 text-slate-300" />) : row.msme}
                    </td>
                    <td className="p-5 text-xs text-slate-800">
                      {typeof row.starter === "boolean" ? (row.starter ? <Check className="h-4 w-4 text-amber-500 font-bold" /> : <X className="h-4 w-4 text-slate-300" />) : row.starter}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="p-5 text-xs font-bold text-slate-800">Total Price</td>
                  <td className="p-5 text-base font-bold text-slate-900">₹2,499</td>
                  <td className="p-5 text-base font-bold text-blue-700 bg-blue-50/10">₹2,799</td>
                  <td className="p-5 text-base font-bold text-amber-600">₹3,899</td>
                </tr>
                <tr>
                  <td className="p-5 text-xs font-bold text-slate-800"></td>
                  <td className="p-5">
                    <Link href={defaultApplyUrl} className="inline-flex h-9 items-center justify-center px-4 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800">
                      Apply Basic
                    </Link>
                  </td>
                  <td className="p-5 bg-blue-50/10">
                    <Link href={`${defaultApplyUrl}?services=msme-certificate`} className="inline-flex h-9 items-center justify-center px-4 rounded-full bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700">
                      Apply Combo
                    </Link>
                  </td>
                  <td className="p-5">
                    <Link href={`${defaultApplyUrl}?services=msme-certificate,food-license`} className="inline-flex h-9 items-center justify-center px-4 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold hover:bg-amber-600">
                      Apply Starter
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. Process Timeline Section */}
      <section className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Our Streamlined Registration Process
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Go from form submission to active GSTIN certificate in 5 simple steps.
            </p>
          </div>

          {/* Horizontal Timeline (Desktop) & Vertical Timeline (Mobile) */}
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 -translate-y-1/2 hidden md:block" />

            <div className="grid md:grid-cols-5 gap-8 relative z-10">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 font-heading font-bold shadow-sm relative">
                    {/* Floating step number */}
                    <span className="text-[14px]">{idx + 1}</span>
                    {/* Success tick on complete steps */}
                    <div className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{step.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Required Documents Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Documents Required for GST Registration
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Simple digital uploads. You do not need physical hardcopies to apply.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {requiredDocuments.map((doc, idx) => (
              <div key={idx} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100/50">
                  {doc.icon}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">{doc.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{doc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Eligibility Section */}
      <section className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Who is Eligible to Register?
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              We process applications for all kinds of taxpayers and legal business structures.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {eligibilityEntities.map((entity, idx) => (
              <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 text-center shadow-xs">
                <div className="inline-flex h-8 w-8 rounded-lg bg-blue-50 text-blue-600 items-center justify-center font-semibold text-xs mb-3">
                  {idx + 1}
                </div>
                <h3 className="text-xs font-bold text-slate-800">{entity}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Industries We Serve */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Industries We Serve
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Helping businesses file correctly across a massive spectrum of business types.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {industries.map((ind, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/30 rounded-2xl border border-slate-100 flex items-center gap-3"
              >
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-xs font-bold text-slate-700">{ind}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Why Choose DigiConnect Dukan */}
      <section className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Why DigiConnect Dukan?
            </h2>
            <p className="text-slate-500 text-base md:text-lg">
              Experience the standard of corporate legal processing at direct-to-retail prices.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChoosePoints.map((point, idx) => (
              <div key={idx} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  {point.icon}
                </div>
                <h3 className="text-xs font-bold text-slate-800 mb-1">{point.title}</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Statistics (Counter Section) */}
      <section className="py-16 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.08),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-heading font-extrabold text-blue-400">
                <Counter value={5000} suffix="+" />
              </p>
              <p className="text-xs text-slate-400">Businesses Registered</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-heading font-extrabold text-blue-400">
                <Counter value={99} suffix="%" />
              </p>
              <p className="text-xs text-slate-400">Application Approval Rate</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-heading font-extrabold text-blue-400">
                <Counter value={4} suffix=".9★" />
              </p>
              <p className="text-xs text-slate-400">Customer Star Rating</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-heading font-extrabold text-blue-400">
                24×7
              </p>
              <p className="text-xs text-slate-400">Dedicated Expert Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. Customer Testimonials & Google Reviews */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Google review details */}
            <div className="lg:col-span-4 space-y-6">
              <h2 className="text-3xl font-heading font-bold text-slate-900 tracking-tight leading-tight">
                What Our Customers Say About Us
              </h2>
              <p className="text-slate-500 text-sm">
                Real feedback from real businesses across India. Transparent, unedited reviews sourced from Google Profile updates.
              </p>

              {/* Google Reviews Card */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-xs">
                    {/* Mock Google Logo Icon */}
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Google Rating</p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-slate-900">4.9 / 5</span>
                      <div className="flex text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Based on 1,248 verified customer submissions</p>
              </div>
            </div>

            {/* Testimonials Slider */}
            <div className="lg:col-span-8 relative">
              <div className="overflow-hidden rounded-[24px] bg-slate-50/50 border border-slate-100 p-8 md:p-10 relative min-h-[220px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="flex text-amber-500 gap-0.5">
                      {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                    <p className="text-sm md:text-base text-slate-600 italic font-medium leading-relaxed">
                      &ldquo;{testimonials[currentTestimonial].review}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100/80">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {testimonials[currentTestimonial].name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{testimonials[currentTestimonial].name}</p>
                        <p className="text-[10px] text-slate-400">
                          {testimonials[currentTestimonial].business} • {testimonials[currentTestimonial].location}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Slider Dots */}
                <div className="flex justify-start gap-2 mt-6">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTestimonial(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentTestimonial ? "w-6 bg-blue-600" : "w-2 bg-slate-200 hover:bg-slate-350"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 14. FAQ Section */}
      <section className="py-20 bg-slate-50/50" id="faqs">
        <div className="max-w-4xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Learn about the compliance procedures, government regulations, and operational constraints.
            </p>
          </div>

          <div className="space-y-4">
            {faqsList.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 text-xs sm:text-sm transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4.5 w-4.5 text-slate-400 transition-transform duration-300 ${
                      activeFaq === idx ? "transform rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-50">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 15. Final CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Apple style ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center relative z-10 space-y-8">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-slate-900 tracking-tight leading-tight">
            Start Your GST Registration Today
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto">
            Avoid penalties, claim Input Tax Credit, and legitimise your operations. Join thousands of growth-focused businesses who chose DigiConnect Dukan.
          </p>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-heading font-black text-slate-900">₹2,499</span>
              <span className="text-slate-400 line-through text-sm">₹4,999</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                All-Inclusive Fee
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Zero hidden registration fees • Money-back assurance if filing is rejected</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={defaultApplyUrl}
              className="inline-flex h-12 items-center justify-center gap-2 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/10 transition-all text-[15px]"
            >
              Apply Now
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <a
              href={businessWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all text-[15px]"
            >
              <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
              Talk on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* 16. Sticky Mobile Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] px-4 py-3 z-50 flex items-center justify-between gap-3 md:hidden backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">GST Filing</span>
          <span className="text-base font-bold text-slate-900">₹2,499</span>
        </div>
        <div className="flex items-center gap-2 grow max-w-[240px]">
          <a
            href={`tel:${supportPhoneNumber}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            aria-label="Call Support"
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={businessWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600"
            aria-label="WhatsApp Support"
          >
            <WhatsAppIcon className="h-4.5 w-4.5" />
          </a>
          <Link
            href={defaultApplyUrl}
            className="flex h-10 grow items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-transform"
          >
            Apply Now
          </Link>
        </div>
      </div>

      {/* 17. Floating Premium WhatsApp button (Desktop-only/Sticky) */}
      <a
        href={businessWhatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 hidden md:flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all z-50 group"
        aria-label="Contact support on WhatsApp"
      >
        <WhatsAppIcon className="h-6 w-6" />
        <span className="absolute right-16 scale-0 group-hover:scale-100 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200 shadow-md whitespace-nowrap origin-right">
          Need Help? Chat on WhatsApp
        </span>
      </a>

    </div>
  );
}

// ================= CONSTANTS & STATIC DATA =================

const whyRegisterList = [
  {
    icon: <Percent className="h-5 w-5" />,
    title: "Input Tax Credit (ITC)",
    description: "Claim taxes paid on business purchases (raw materials, services, capitals) and reduce final tax output by up to 18%."
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Legal Business Setup",
    description: "Operate as a legally recognized business entity in India, enabling easier partnerships and compliant billing."
  },
  {
    icon: <Compass className="h-5 w-5" />,
    title: "Sell Online (E-commerce)",
    description: "Required by Amazon, Flipkart, Shopify, and local aggregators to sell goods and service across state lines online."
  },
  {
    icon: <Building className="h-5 w-5" />,
    title: "Open Current Account",
    description: "Banks mandate GST registration certificates to open premium interest-bearing business current accounts."
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Government Tenders",
    description: "Qualify for state and federal government contracts and public sector tenders requiring clean tax compliance."
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Business Growth",
    description: "Expand customer base by trading with large corporate clients who only purchase from GST-registered vendors."
  },
  {
    icon: <Award className="h-5 w-5" />,
    title: "Brand Trust",
    description: "A valid GSTIN increases customer confidence and boosts credibility with suppliers, lenders, and investors."
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Easy Compliance",
    description: "Consolidates multiple taxes (VAT, Service Tax, Excise, Octroi) into a single, unified tax compliance umbrella."
  }
];

const comparisonPoints = [
  {
    attribute: "Inter-state Sales",
    without: "Restricted. Cannot trade goods outside your home state.",
    with: "Allowed. Full legal authority to sell goods anywhere in India."
  },
  {
    attribute: "Online Selling (Amazon/Flipkart)",
    without: "Blocked. E-commerce platforms mandate GST for registration.",
    with: "Unrestricted. Start selling online to millions of buyers instantly."
  },
  {
    attribute: "Input Tax Credit (ITC)",
    without: "Cannot claim. Tax paid on business inputs becomes an expense.",
    with: "Fully claimable. Set off input taxes against final liability."
  },
  {
    attribute: "B2B Sales & Billing",
    without: "Corporate clients avoid buying since they can't claim tax credits.",
    with: "Preferred supplier. Provide GST invoices so clients save tax."
  },
  {
    attribute: "Business Verification",
    without: "Limited proof. Harder to establish commercial legal validity.",
    with: "Verified. Government-signed certificate serves as primary KYC."
  },
  {
    attribute: "Banking and Current Account",
    without: "Challenging. Banks require extensive alternative proofs.",
    with: "Fast track. Instant verification and opening of current accounts."
  },
  {
    attribute: "Government Tenders",
    without: "Ineligible. GST is a prerequisite for tender submissions.",
    with: "Eligible. Participate in highly lucrative PSU and Govt contracts."
  },
  {
    attribute: "Tax Compliance Safety",
    without: "Prone to tax scrutiny if crossing thresholds without registration.",
    with: "Fully compliant. Transparent system keeps audits and fines at bay."
  },
  {
    attribute: "Supplier Relationships",
    without: "Suppliers may charge higher unadjusted rates or refuse trade.",
    with: "Smooth logistics. Registered trade ensures reliable pricing."
  },
  {
    attribute: "Business Credit/Loans",
    without: "Lenders lack formal transaction data, leading to higher interest.",
    with: "Easier credit. GST invoices prove steady revenue to bank systems."
  },
  {
    attribute: "Unified Tax System",
    without: "Confusing records, tracking scattered service or municipal duties.",
    with: "One consolidated tax structure replacing VAT, Service, Excise."
  },
  {
    attribute: "Overall Market Value",
    without: "Perceived as local or informal operation.",
    with: "Perceived as formal enterprise. Ready for investment."
  }
];

const packageFeatures = [
  { feature: "GST Registration Filing", basic: true, msme: true, starter: true },
  { feature: "Expert CA Document Review", basic: true, msme: true, starter: true },
  { feature: "ARN Tracking & Updates", basic: true, msme: true, starter: true },
  { feature: "GST Certificate Delivery", basic: true, msme: true, starter: true },
  { feature: "Udyam MSME Certificate", basic: false, msme: true, starter: true },
  { feature: "Business Loan Support", basic: false, msme: true, starter: true },
  { feature: "Priority Support Desk", basic: false, msme: true, starter: true },
  { feature: "FSSAI Food Licence Registration", basic: false, msme: false, starter: true },
  { feature: "Premium Business Landing Page", basic: false, msme: false, starter: true },
  { feature: "6 Months Web Maintenance", basic: false, msme: false, starter: true },
  { feature: "Dedicated Relationship Manager", basic: "Email Support", msme: "WhatsApp + Call", starter: "24/7 VIP Dedicated" },
  { feature: "Average Processing Speed", basic: "5-7 Days", msme: "3-5 Days", starter: "2-3 Days" }
];

const timelineSteps = [
  { title: "Submit Details", desc: "Fill our secure form with basic details and upload files in under 3 minutes." },
  { title: "Doc Verification", desc: "Our experienced CA expert reviews the files for zero rejection rate." },
  { title: "Application Filing", desc: "We prepare and submit the formal application dossiers onto the GSTN Portal." },
  { title: "Government Processing", desc: "The government GST inspector reviews the application and validates credentials." },
  { title: "Certificate Delivered", desc: "Your official GSTIN registration certificate is delivered directly to your inbox." }
];

const requiredDocuments = [
  {
    icon: <FileText className="h-5.5 w-5.5" />,
    name: "PAN Card",
    desc: "PAN Card of the proprietor/business entity is mandatory for tax ID generation."
  },
  {
    icon: <UserCheck className="h-5.5 w-5.5" />,
    name: "Aadhaar Card",
    desc: "Aadhaar Card of the applicant for instant e-KYC and digital verification."
  },
  {
    icon: <Users className="h-5.5 w-5.5" />,
    name: "Passport Photo",
    desc: "Clear passport size photograph of the primary applicant/proprietor."
  },
  {
    icon: <Shield className="h-5.5 w-5.5" />,
    name: "Address Proof",
    desc: "Electricity bill, water bill, or municipal tax receipt for registered place of business."
  },
  {
    icon: <Building className="h-5.5 w-5.5" />,
    name: "Business Address (Rented)",
    desc: "Rent agreement and No Objection Certificate (NOC) from the landlord (if applicable)."
  },
  {
    icon: <Compass className="h-5.5 w-5.5" />,
    name: "Bank Details",
    desc: "Cancel cheque, passbook front page, or latest bank statement showing address."
  },
  {
    icon: <Phone className="h-5.5 w-5.5" />,
    name: "Active Email & Mobile",
    desc: "Required to receive registration alerts and OTPs from the GST portal."
  },
  {
    icon: <AlertCircle className="h-5.5 w-5.5" />,
    name: "Business Proof",
    desc: "Partnership deed, COI, Board Resolution (only for LLP/Companies)."
  }
];

const eligibilityEntities = [
  "Proprietorships",
  "Partnership Firms",
  "Limited Liability (LLP)",
  "Private Limited",
  "One Person Company",
  "Startups",
  "Freelancers",
  "Independent Consultants",
  "E-commerce Sellers",
  "Manufacturers",
  "Service Providers",
  "Wholesalers"
];

const industries = [
  "Retail & Trade",
  "Restaurants & Cafes",
  "Medical & Pharmacy",
  "Education & Coaching",
  "Transport & Logistics",
  "Manufacturing Units",
  "IT & Software Companies",
  "Consulting Firms",
  "Construction & Building",
  "Fashion & Apparel",
  "Electronics & Hardware",
  "Food Businesses (FSSAI)",
  "Healthcare & Clinics",
  "Real Estate Agents",
  "Export Import Traders",
  "Digital Agencies"
];

const whyChoosePoints = [
  {
    icon: <UserCheck className="h-5.5 w-5.5" />,
    title: "Dedicated Expert Team",
    desc: "Experienced CAs and tax professionals manage your application, ensuring zero filing errors."
  },
  {
    icon: <Lock className="h-5.5 w-5.5" />,
    title: "100% Secure Process",
    desc: "Your business documents are encrypted and only shared with verified GST portal assessors."
  },
  {
    icon: <Zap className="h-5.5 w-5.5" />,
    title: "Fast Approvals",
    desc: "We file documents daily to minimize processing delays and resolve officer queries instantly."
  },
  {
    icon: <BadgePercent className="h-5.5 w-5.5" />,
    title: "Transparent Pricing",
    desc: "Zero hidden charges. No file opening fees or surprise consultation additions."
  },
  {
    icon: <Phone className="h-5.5 w-5.5" />,
    title: "Dedicated Help Support",
    desc: "Direct support available via call or WhatsApp whenever you need status updates."
  },
  {
    icon: <CheckCircle className="h-5.5 w-5.5" />,
    title: "WhatsApp Alerts",
    desc: "Get instant milestone updates via automated WhatsApp messages."
  }
];

const testimonials = [
  {
    name: "Amit Sharma",
    business: "Sharma Electronics",
    rating: 5,
    review: "We registered our GST through DigiConnect Dukan. The process was super fast. The CA verified our rent agreement and within 4 days we got our GST certificate. Highly recommended!",
    location: "New Delhi"
  },
  {
    name: "Sneha Patel",
    business: "Vibrant Designs E-commerce",
    rating: 5,
    review: "As an online seller on Amazon, I needed a GSTIN quickly. They not only registered my GST but also guided me on how to claim ITC on courier charges. Incredible service!",
    location: "Ahmedabad"
  },
  {
    name: "Rohan Das",
    business: "Das Logistics Solutions",
    rating: 5,
    review: "I took the GST + MSME combo. The Udyam certificate helps us get loans easily, and they set it up in just 3 days. Extremely professional team.",
    location: "Kolkata"
  },
  {
    name: "Dr. K. Raghavan",
    business: "Raghav Diagnostics",
    rating: 5,
    review: "Clean user interface and expert compliance. There was a query from the officer on our clinic's tax receipt, and the DigiConnect team resolved it immediately without extra charges.",
    location: "Chennai"
  }
];

const faqsList = [
  {
    question: "What is GST Registration?",
    answer: "Goods and Services Tax (GST) registration is a process by which a business is registered under the GST law in India. A unique 15-digit GSTIN (Goods and Services Tax Identification Number) is issued by the government, which allows you to collect tax from customers and claim tax credits on inputs."
  },
  {
    question: "Who is mandatorily required to register for GST?",
    answer: "Any business with an annual turnover exceeding ₹40 Lakhs for goods (₹20 Lakhs for North-Eastern states) or ₹20 Lakhs for services (₹10 Lakhs for North-Eastern states) must register for GST. Additionally, e-commerce sellers, interstate traders, and casual taxable persons must register regardless of turnover."
  },
  {
    question: "What are the threshold limits for GST Registration in India?",
    answer: "For Service Providers, the threshold limit is ₹20 Lakhs per annum (₹10 Lakhs in special states). For Goods Suppliers/Manufacturers, the limit is ₹40 Lakhs per annum (₹20 Lakhs in special states)."
  },
  {
    question: "Can I get a voluntary GST registration?",
    answer: "Yes. Any business with a turnover below the threshold limit can voluntarily apply for GST registration. This is highly recommended to claim Input Tax Credit (ITC), open current accounts, and sell products on online platforms."
  },
  {
    question: "What documents are required for GST Registration?",
    answer: "You will need: 1. PAN Card of the applicant or business, 2. Aadhaar Card, 3. Passport size photo, 4. Registered business address proof (Utility bill or property tax receipt), 5. Rent agreement and landlord NOC (if rented), 6. Bank account proof (cancelled cheque or passbook page)."
  },
  {
    question: "How long does it take to get a GSTIN?",
    answer: "Normally, once we submit your application, the government processes it and issues the GST certificate within 3 to 7 working days. However, this is subject to government portal response times and any officer clarifications (clarifications are resolved by our team)."
  },
  {
    question: "What is Udyam Registration (MSME), and why is it bundled?",
    answer: "Udyam Registration is the official certificate proving that your business is registered under the MSME ministry. We bundle it with GST because it unlocks government benefits, collateral-free business loans, lower interest rates, subsidy on electrical bills, and protection against delayed payments."
  },
  {
    question: "Do I need a physical office/commercial space to register for GST?",
    answer: "No. You can register your GST using your home address as the place of business. You only need a clean electricity bill/tax receipt in the owner's name and a signed No Objection Certificate (NOC) stating you are operating from there."
  },
  {
    question: "Can a freelancer or consultant register for GST?",
    answer: "Yes, freelancers, designers, writers, developers, and independent consultants can register for GST. In fact, if you offer services to international clients, having a GSTIN allows you to file zero-rated exports and claim refunds on taxes paid for tools/computers."
  },
  {
    question: "What is a Composition Scheme under GST?",
    answer: "The Composition Scheme is a simplified tax scheme for small taxpayers with annual turnover up to ₹1.5 Crores. It permits filing of quarterly returns and paying tax at a flat rate (1% to 6%) without the ability to claim Input Tax Credit (ITC) or issue taxable invoices."
  },
  {
    question: "Is a bank account mandatory during the registration process?",
    answer: "No. The government allows businesses to submit their bank details after the GSTIN is active (within 45 days of getting registered). You can use a personal bank account cancelled cheque initially or upload it later once your new business current account is opened."
  },
  {
    question: "What happens if I operate without GST registration when required?",
    answer: "Operating a business that crosses the statutory threshold without a GSTIN is illegal. If caught, you can face penalties up to 100% of the tax due, or a minimum fine of ₹10,000, along with confiscation of goods."
  },
  {
    question: "Can I register multiple businesses under a single PAN?",
    answer: "Yes. You can register multiple business verticals or branches under a single PAN. Each registration will have a distinct GSTIN but is tied to the same PAN configuration."
  },
  {
    question: "What are the charges if I register GST through DigiConnect Dukan?",
    answer: "Our basic GST Registration service charge is ₹2,499. The GST + MSME combo is ₹2,799, and the Business Launch Kit (GST + MSME + FSSAI + web portal setup) is ₹3,899. There are no hidden or extra filing fees."
  },
  {
    question: "What is the validity of a GST certificate?",
    answer: "Once issued, a GST registration certificate is valid for the lifetime of the business. It does not require annual renewals, provided you file regular returns. Casual taxable persons and non-resident taxpayers receive certificates with restricted validity."
  },
  {
    question: "How do I track my GST application status?",
    answer: "We provide an Application Reference Number (ARN) as soon as the files are submitted. You can track this ARN on the government GST portal or directly on your DigiConnect Dukan customer dashboard."
  },
  {
    question: "What is Input Tax Credit (ITC)?",
    answer: "Input Tax Credit (ITC) allows you to reduce the tax you owe on sales by the amount of tax you already paid on purchases. For example, if you collect ₹10,000 tax on sales and paid ₹6,000 tax on inventory purchases, you only pay the net difference of ₹4,000 to the government."
  },
  {
    question: "What is the process if my GST application gets rejected?",
    answer: "If the tax officer requests additional clarification (a show-cause notice is issued), our CAs will formulate and submit the response on your behalf. In the rare case of a final rejection, we will refile the application or provide a full refund of our professional charges."
  },
  {
    question: "Do I need to file GST returns even if I have no sales?",
    answer: "Yes. Once you receive your GSTIN, filing monthly/quarterly returns is mandatory. If you have no sales or transactions during a month, you must file a 'Nil Return' to avoid late filing fines (usually ₹20 to ₹50 per day of delay)."
  },
  {
    question: "How will I receive my GST registration certificate?",
    answer: "The GST department issues the certificate digitally. Once approved, we download the official signed PDF (Form REG-06) and upload it to your DigiConnect dashboard, which also triggers an email notification with the attachment."
  },
  {
    question: "Can I cancel my GST registration in the future?",
    answer: "Yes. If you close your business, cease operations, or falls below the threshold limits, you can easily apply for cancellation of GST online. We can support you in the formal cancellation and final return filing process."
  }
];
