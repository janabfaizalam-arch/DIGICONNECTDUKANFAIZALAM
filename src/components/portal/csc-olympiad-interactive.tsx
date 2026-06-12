"use client";

import { useState, useEffect, useMemo, ComponentType, useTransition, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, Beaker, BookOpen, Laptop, Globe, Lightbulb, 
  ShieldAlert, Atom, FlaskConical, Activity, Hourglass, 
  Compass, LineChart, Briefcase, BarChart3, Brain, 
  HelpCircle, ChevronDown, User, Star, Quote, ArrowRight, Check,
  Download, Award, Calendar, Phone, MessageCircle,
  Filter, Grid, Sliders, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const subjectIcons: Record<string, ComponentType<{ className?: string }>> = {
  Calculator, Beaker, BookOpen, Laptop, Globe, Lightbulb, 
  ShieldAlert, Atom, FlaskConical, Activity, Hourglass, 
  Compass, LineChart, Briefcase, BarChart3, Brain
};

type Subject = {
  id: string;
  name: string;
  icon: string;
  classes: number[];
};

type Testimonial = {
  name: string;
  role: string;
  text: string;
};

type FAQ = {
  question: string;
  answer: string;
};

type ExamCalendarEvent = {
  subject: string;
  phase1: string;
  phase2: string;
  timeWindow: string;
  notes: string;
};

type WinnerRecord = {
  id: string;
  photo: string;
  name: string;
  class: string;
  subject: string;
  rank: string;
  state: string;
  year: string;
};

type GalleryItem = {
  url: string;
  title: string;
  category: string;
  year: string;
  sortOrder: number;
  active: boolean;
};

type StatsConfig = {
  classes: string;
  subjects: string;
  mediums: string;
  priceLabel: string;
  registrations: string;
  participation: string;
  states: string;
};

type RewardsConfig = {
  topper1st: string;
  topper2nd: string;
  topper3rd: string;
  school1st: string;
  school2nd: string;
  school3rd: string;
  notes: string;
};

type TogglesConfig = {
  hero: boolean;
  stats: boolean;
  whyChoose: boolean;
  explorer: boolean;
  mediumChart: boolean;
  preparation: boolean;
  examMode: boolean;
  calendar: boolean;
  rewards: boolean;
  winners: boolean;
  gallery: boolean;
  timeline: boolean;
  blogs: boolean;
  contact: boolean;
};

type CscOlympiadConfig = {
  session: string;
  lastDate: string;
  countdownDate: string;
  pricePerSubject: number;
  oldPricePerSubject: number;
  offerText: string;
  heroTitle: string;
  heroSubtitle: string;
  brochureUrl: string;
  dateSheetUrl: string;
  notifications: string[];
  stats: StatsConfig;
  subjects: Subject[];
  faqs: FAQ[];
  testimonials: Testimonial[];
  examCalendar: ExamCalendarEvent[];
  rewards: RewardsConfig;
  winners: WinnerRecord[];
  gallery: GalleryItem[];
  toggles: TogglesConfig;
  dbServiceId: string;
  dbCategoryId: string;
};

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  category: string | null;
  created_at: string;
};

type DbGalleryImage = {
  id: string;
  title: string | null;
  description?: string | null;
  category?: string | null;
  image_url: string;
  active: boolean;
};

type InteractiveProps = {
  config: CscOlympiadConfig;
  articles: Article[];
  dbGallery: DbGalleryImage[];
  applyPath: string;
  applyCtaLabel: string;
};

export function CscOlympiadInteractive({
  config,
  articles,
  dbGallery,
  applyPath,
  applyCtaLabel,
}: InteractiveProps) {
  const { success, error: toastError } = useToast();

  // Selected class for curriculum explorer
  const [selectedClass, setSelectedClass] = useState<number>(3);
  
  // FAQs accordion states
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Testimonials slider
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Live calculator items
  const [selectedCalcSubjects, setSelectedCalcSubjects] = useState<string[]>([]);
  const toggleCalcSubject = (id: string) => {
    if (selectedCalcSubjects.includes(id)) {
      setSelectedCalcSubjects(selectedCalcSubjects.filter(x => x !== id));
    } else {
      setSelectedCalcSubjects([...selectedCalcSubjects, id]);
    }
  };

  const calculatedTotal = selectedCalcSubjects.length * config.pricePerSubject;
  const calculatedOldTotal = selectedCalcSubjects.length * config.oldPricePerSubject;
  const calculatedSavings = calculatedOldTotal - calculatedTotal;

  // Filter subjects based on selected class
  const filteredSubjects = useMemo(() => {
    return config.subjects.filter(subject => 
      subject.classes.includes(selectedClass)
    );
  }, [config.subjects, selectedClass]);

  // Gallery combination
  const finalGallery = useMemo(() => {
    const dbItems = dbGallery
      .filter((img) => img.active)
      .map((img) => ({
        url: img.image_url,
        title: img.title ?? "Olympiad Activities",
        category: img.category ?? "School Participation",
        year: "2026",
        sortOrder: 10,
        active: true,
      }));
    const configItems = config.gallery.filter((g) => g.active);
    return [...dbItems, ...configItems].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dbGallery, config.gallery]);

  // Gallery Lightbox modal state
  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string; category: string } | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<string>("All");

  // Filtered gallery items
  const filteredGallery = useMemo(() => {
    if (galleryFilter === "All") return finalGallery;
    return finalGallery.filter(item => item.category === galleryFilter);
  }, [finalGallery, galleryFilter]);

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownActive, setCountdownActive] = useState(false);

  useEffect(() => {
    const target = new Date(config.countdownDate).getTime();
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
        setCountdownActive(false);
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
        setCountdownActive(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.countdownDate]);

  // Winners Filtering State
  const [winFilterYear, setWinFilterYear] = useState("All");
  const [winFilterClass, setWinFilterClass] = useState("All");
  const [winFilterSubject, setWinFilterSubject] = useState("All");
  const [winFilterRank, setWinFilterRank] = useState("All");
  const [winnersViewMode, setWinnersViewMode] = useState<"grid" | "carousel">("grid");
  const [winnersCarouselIndex, setWinnersCarouselIndex] = useState(0);

  // Filtered Winners List
  const filteredWinners = useMemo(() => {
    return config.winners.filter(win => {
      const matchYear = winFilterYear === "All" || win.year === winFilterYear;
      const matchClass = winFilterClass === "All" || win.class.toLowerCase().includes(winFilterClass.toLowerCase());
      const matchSub = winFilterSubject === "All" || win.subject.toLowerCase().includes(winFilterSubject.toLowerCase());
      const matchRank = winFilterRank === "All" || win.rank.toLowerCase().includes(winFilterRank.toLowerCase());
      return matchYear && matchClass && matchSub && matchRank;
    });
  }, [config.winners, winFilterYear, winFilterClass, winFilterSubject, winFilterRank]);

  // Winner dropdown unique values
  const winnerDropdowns = useMemo(() => {
    const years = Array.from(new Set(config.winners.map(w => w.year))).sort();
    const classes = Array.from(new Set(config.winners.map(w => w.class))).sort();
    const subjects = Array.from(new Set(config.winners.map(w => w.subject))).sort();
    const ranks = Array.from(new Set(config.winners.map(w => w.rank))).sort();
    return { years, classes, subjects, ranks };
  }, [config.winners]);

  // Contact form submission state
  const [contactForm, setContactForm] = useState({ name: "", mobile: "", email: "", queryType: "Registration Help", message: "" });
  const [contactPending, startContactTransition] = useTransition();

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (contactPending) return;

    if (!/^[6-9]\d{9}$/.test(contactForm.mobile)) {
      toastError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    startContactTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", contactForm.name);
        formData.set("mobile", contactForm.mobile);
        formData.set("service", "CSC Olympiad Portal Lead");
        formData.set("message", `Query: ${contactForm.queryType}\nEmail: ${contactForm.email}\nMessage: ${contactForm.message}`);

        const response = await fetch("/api/lead", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || result.message || "Failed to submit query.");
        }

        success("Your query has been saved. A coordinator will call you shortly.");
        setContactForm({ name: "", mobile: "", email: "", queryType: "Registration Help", message: "" });
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Submission failed.");
      }
    });
  };

  // WhatsApp Url
  const whatsappHref = `https://api.whatsapp.com/send?phone=919000000000&text=${encodeURIComponent(
    `Hi, I want assistance with CSC Olympiad Registration ${config.session} facilitator.`
  )}`;

  return (
    <div className="space-y-24 pb-20">
      
      {/* 1. HERO SECTION */}
      {config.toggles.hero && (
        <section className="relative overflow-hidden pt-12 pb-16 px-4 md:px-8 max-w-7xl mx-auto z-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            
            <div className="space-y-6 text-left">
              {/* Logo with clean white glass borders for readability */}
              <div className="inline-flex items-center gap-3 bg-white/95 border border-slate-200 rounded-2xl p-2 px-4 shadow-sm">
                <Image 
                  src="/images/services/csc-olympiad/logo.png" 
                  alt="CSC Olympiad Official Logo" 
                  width={110} 
                  height={55}
                  priority
                  className="object-contain"
                />
                <div className="h-6 w-px bg-slate-200" />
                <span className="text-[10px] font-black text-blue-600 tracking-wider uppercase">Facilitator Portal</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                {config.heroTitle}
              </h1>

              <p className="text-base md:text-lg leading-relaxed text-slate-600 font-medium">
                {config.heroSubtitle} Enroll for the competitive testing audit and unlock scholarships and certificates.
              </p>

              {/* Countdown Timer with clear glass boxes */}
              {countdownActive && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 backdrop-blur-md inline-block shadow-sm">
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-2">Registration Closes In</span>
                  <div className="flex gap-3 text-center">
                    {[
                      { val: timeLeft.days, label: "Days" },
                      { val: timeLeft.hours, label: "Hrs" },
                      { val: timeLeft.minutes, label: "Mins" },
                      { val: timeLeft.seconds, label: "Secs" }
                    ].map((time, idx) => (
                      <div key={idx} className="min-w-[56px]">
                        <div className="h-11 flex items-center justify-center rounded-xl bg-white border border-blue-150 text-xl font-black text-blue-600 shadow-sm">
                          {String(time.val).padStart(2, "0")}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold block mt-1">{time.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hero Action CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                <Link href={applyPath} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-sm px-8 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer">
                  {applyCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#explorer" className="inline-flex h-12 items-center justify-center rounded-xl bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-750 text-sm px-6 shadow-sm transition-all cursor-pointer">
                  View Subjects
                </a>
                <a href={config.brochureUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-750 text-sm px-6 shadow-sm transition-all cursor-pointer">
                  <Download className="h-4 w-4" /> Brochure
                </a>
              </div>
            </div>

            {/* Visual Glass Box holding Floating WWDC elements */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-[2rem] border border-slate-200 bg-white/70 backdrop-blur-md p-6 shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center">
                
                {/* Embedded SVG graphics simulating WWDC interactive glass medal/trophy */}
                <div className="relative w-48 h-48 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-100 to-blue-50 border border-slate-200 shadow-inner animate-pulse">
                  <Award className="h-24 w-24 text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]" />
                  
                  {/* Outer floating orbit particles */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-dashed border-slate-200 scale-110 pointer-events-none"
                  />
                </div>

                <h3 className="text-xl font-bold mt-8 text-slate-900">National Toppers Scholars</h3>
                <p className="text-xs text-slate-550 mt-2 max-w-sm">NEP-aligned evaluation platform verifying IQ metrics, competitive stands, and excellence honors online.</p>

                {/* Floating Clear badges */}
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/90 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm">
                  <Laptop className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Remote Proctor</span>
                </div>

                <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/90 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm">
                  <Calendar className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Session {config.session}</span>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* 2. TRUST/STATS STRIP */}
      {config.toggles.stats && (
        <section className="relative px-4 max-w-7xl mx-auto z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { val: config.stats.classes, label: "Eligibility" },
              { val: config.stats.subjects, label: "Subjects" },
              { val: config.stats.mediums, label: "Mediums" },
              { val: config.stats.priceLabel, label: "Fee / Subject" },
              { val: config.stats.registrations, label: "Registrations" },
              { val: config.stats.participation, label: "School Stands" },
              { val: config.stats.states, label: "State Reach" }
            ].map((stat, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm flex flex-col justify-center items-center text-center">
                <span className="text-sm font-black text-slate-900 leading-none block">{stat.val}</span>
                <span className="text-[10px] text-slate-500 font-bold block mt-1 uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. WHY CSC OLYMPIAD */}
      {config.toggles.whyChoose && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Benefits</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Why Choose CSC Olympiad</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">NEP aligned platform validating cognitive aptitude and computational thinking early.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 text-left">
            {[
              { title: "NEP Assessment", desc: "Formulated in alignment with NEP objectives auditing conceptual depth.", icon: Star, color: "text-amber-500 bg-amber-50" },
              { title: "Practice Learning", desc: "Rigorous exercise using mock papers to reinforce school curriculum.", icon: Laptop, color: "text-blue-500 bg-blue-50" },
              { title: "Digital Literacy", desc: "Introduces online examination proctor systems to candidates early.", icon: ShieldAlert, color: "text-cyan-600 bg-cyan-50" },
              { title: "Conceptual Aptitude", desc: "Strengthens logical deduction capabilities beyond standard textbooks.", icon: Lightbulb, color: "text-emerald-600 bg-emerald-50" },
              { title: "National Recognition", desc: "Establishes benchmarks and state standing audits across India.", icon: Award, color: "text-purple-600 bg-purple-50" },
              { title: "Performance Track", desc: "Detailed metric reports identifying conceptual learning gaps.", icon: LineChart, color: "text-rose-600 bg-rose-50" }
            ].map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-300">
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center border border-slate-150 shadow-sm", card.color)}>
                    <IconComp className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-4">{card.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. CLASS & SUBJECT EXPLORER */}
      {config.toggles.explorer && (
        <section id="explorer" className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Subject Mappings</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Class & Subject Explorer</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Select a class to audit the available subjects for registration.</p>
          </div>

          {/* Dynamic Class pills selection */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-8 border-b border-slate-100 pb-4 overflow-x-auto no-scrollbar">
            {[3,4,5,6,7,8,9,10,11,12].map((cls) => (
              <button
                key={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  setSelectedCalcSubjects([]); // reset calculator selection
                }}
                className={cn(
                  "px-4.5 py-2 rounded-xl text-xs font-black transition-all duration-200 outline-none cursor-pointer border select-none",
                  selectedClass === cls
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/15"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-605"
                )}
              >
                Class {cls}
              </button>
            ))}
          </div>

          {/* Subjects Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-left">
            {filteredSubjects.map((sub) => {
              const IconComp = subjectIcons[sub.icon] || BookOpen;
              const isSelected = selectedCalcSubjects.includes(sub.id);
              
              return (
                <div
                  key={sub.id}
                  onClick={() => toggleCalcSubject(sub.id)}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer select-none transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-36 group shadow-sm",
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5"
                      : "border-slate-200/80 bg-white hover:bg-slate-50/50 hover:border-slate-350"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "h-10 w-10 rounded-xl border flex items-center justify-center transition-all shadow-sm",
                      isSelected ? "text-blue-600 border-blue-200 bg-blue-100/50" : "text-slate-500 border-slate-200 bg-slate-50 group-hover:text-slate-800"
                    )}>
                      <IconComp className="h-4.5 w-4.5" />
                    </div>
                    <div className={cn(
                      "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200",
                      isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-transparent"
                    )}>
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">{sub.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      Available in 10 languages
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live calculator widget */}
          <AnimatePresence>
            {selectedCalcSubjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-8 p-5 rounded-2xl border border-blue-250 bg-blue-50/40 backdrop-blur-md text-left flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-md"
              >
                <div>
                  <span className="text-[9px] uppercase font-black text-blue-600 tracking-wider">Fee Calculator</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Selected {selectedCalcSubjects.length} subject{selectedCalcSubjects.length > 1 ? "s" : ""}
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    {selectedCalcSubjects.map(id => config.subjects.find(s => s.id === id)?.name).join(", ")}
                  </p>
                </div>

                <div className="flex items-center gap-5 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 line-through font-bold">₹{calculatedOldTotal}</span>
                    <div className="text-lg font-black text-slate-900 flex items-center gap-1.5 leading-none mt-1">
                      ₹{calculatedTotal}
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded">
                        Save ₹{calculatedSavings}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`${applyPath}?subjects=${selectedCalcSubjects.join(",")}`}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all"
                  >
                    Register Now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 5. LANGUAGE MEDIUM CHART */}
      {config.toggles.mediumChart && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Accessibility</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Language Mediums Chart</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Exam question papers are available in multiple languages to facilitate regional accessibility.</p>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6 text-left">
            {[
              { code: "EN", name: "English", desc: "Standard medium" },
              { code: "HI", name: "Hindi", desc: "Standard national medium" },
              { code: "BN", name: "Bengali", desc: "Regional medium" },
              { code: "GJ", name: "Gujarati", desc: "Regional medium" },
              { code: "KA", name: "Kannada", desc: "Regional medium" },
              { code: "MR", name: "Marathi", desc: "Regional medium" },
              { code: "OR", name: "Odia", desc: "Regional medium" },
              { code: "TA", name: "Tamil", desc: "Regional medium" },
              { code: "TE", name: "Telugu", desc: "Regional medium" },
              { code: "PB", name: "Punjabi", desc: "Regional medium" },
              { code: "ML", name: "Malayalam", desc: "Regional medium" },
              { code: "AS", name: "Assamese", desc: "Regional medium" }
            ].map((lang, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-350 transition-all shadow-sm">
                <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200/60 p-1 px-2.5 rounded-lg inline-block">{lang.code}</span>
                <h3 className="text-xs font-extrabold text-slate-900 mt-3">{lang.name}</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{lang.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. PREPARATION SECTION */}
      {config.toggles.preparation && (
        <section className="relative px-4 max-w-7xl mx-auto z-10">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-6 text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Preparation Kit</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Exam Preparation Materials</h2>
              <p className="text-slate-550 text-sm font-medium leading-relaxed">
                Registered students receive dashboard access loaded with mocks and syllabus books to practice anytime.
              </p>

              <div className="grid gap-3.5">
                {[
                  { label: "5 Sets of Mock Tests", desc: "Simulated question environments loaded for subject prep." },
                  { label: "3 Examination Attempts Allowed", desc: "Practice attempts to identify candidate pacing mistakes." },
                  { label: "Detailed Study PDF Material", desc: "Curated chapter references mapping complete syllabi." },
                  { label: "Cognitive Strengths Identifier", desc: "Performance report tracking conceptual weak fields." }
                ].map((prep, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{prep.label}</h4>
                      <p className="text-[10px] text-slate-550 font-medium mt-0.5">{prep.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Preview mock screen */}
            <div className="p-6 rounded-[2rem] border border-slate-200 bg-white backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="bg-slate-50 rounded-[1.5rem] border border-slate-200 p-4.5 text-left text-xs text-slate-600 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Mock Assessment Console</span>
                  <span className="text-[9px] font-bold text-red-650 bg-red-50 border border-red-200 p-0.5 px-2 rounded">Timer: 59:45</span>
                </div>
                <p className="text-slate-950 font-extrabold text-[11px]">Q1: A vehicle travels 60 km/h for 2 hours and 80 km/h for next 3 hours. What is the average velocity of travel?</p>
                <div className="grid gap-2">
                  {["A. 70 km/h", "B. 72 km/h (Recommended)", "C. 75 km/h", "D. 68 km/h"].map((opt, oIdx) => (
                    <div key={oIdx} className="p-2.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center">
                      <span>{opt}</span>
                      <span className="h-4.5 w-4.5 rounded-full border border-slate-300" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-[10px] text-slate-500 font-bold">Question 1 of 50</span>
                  <button type="button" className="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-[10px] text-white">Next Question</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. EXAM MODE SECTION */}
      {config.toggles.examMode && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Protocol</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Online Proctor Guidelines</h2>
            <p className="text-slate-555 text-sm mt-2 font-medium">Exam integrity audits are strictly monitored remotely using webcams.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-left">
            {[
              { label: "Proctored Exam", desc: "Online monitoring detects eye movements and tabs switching." },
              { label: "Devices Approved", desc: "Requires a desktop/laptop or a webcam integrated mobile device." },
              { label: "Hardware Camera", desc: "Mandatory webcam focus verifying the registered student candidate." },
              { label: "Appearing Centers", desc: "Can take from home, school lab, cybercafe or local CSC Academy." }
            ].map((mode, idx) => (
              <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900">{mode.label}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">{mode.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a href={config.dateSheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10.5 items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold text-xs text-blue-700 px-6 tracking-wide transition-all cursor-pointer">
              <Download className="h-4 w-4" /> Download Official Date Sheet (PDF)
            </a>
          </div>
        </section>
      )}

      {/* 8. EXAM CALENDAR */}
      {config.toggles.calendar && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Schedules</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Exam Time Tables & Slots</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Verify exam phases details. Candidates receive slot credentials over SMS.</p>
          </div>

          {/* Table / Cards responsive layout */}
          <div className="rounded-2xl border border-slate-200 bg-white backdrop-blur-md overflow-hidden text-left shadow-md">
            {/* Desktop Table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-slate-500">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 px-5">Subjects Group</th>
                    <th className="p-4">Phase 1 (Mock/Prep)</th>
                    <th className="p-4">Phase 2 (Final Test)</th>
                    <th className="p-4">Time Slots Windows</th>
                    <th className="p-4">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {config.examCalendar.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 px-5 font-black text-slate-900 max-w-xs">{item.subject}</td>
                      <td className="p-4 text-blue-600">{item.phase1}</td>
                      <td className="p-4 text-emerald-600">{item.phase2}</td>
                      <td className="p-4">{item.timeWindow}</td>
                      <td className="p-4 text-[10px] text-slate-450 leading-normal">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards view */}
            <div className="block md:hidden divide-y divide-slate-100">
              {config.examCalendar.map((item, idx) => (
                <div key={idx} className="p-4 space-y-2 text-xs font-semibold">
                  <h4 className="font-black text-slate-900 text-sm">{item.subject}</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-450 block">Phase 1</span>
                      <span className="text-blue-600">{item.phase1}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-450 block">Phase 2</span>
                      <span className="text-emerald-600">{item.phase2}</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-[9px] font-black uppercase text-slate-450 block">Time Window</span>
                    <span className="text-slate-700">{item.timeWindow}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal pt-1">{item.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. REWARDS & RECOGNITION */}
      {config.toggles.rewards && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">Rewards</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Scholarships & Honors</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Toppers receive certificates and cash support incentives directly.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 text-left">
            {/* Box 1: National Toppers Scholarship */}
            <div className="p-6 rounded-[2rem] border border-amber-250 bg-gradient-to-br from-amber-50/40 to-white text-xs text-slate-600 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                <Award className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">National Topper Scholarships</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { pos: "1st Position Rank Holder", prize: config.rewards.topper1st },
                  { pos: "2nd Position Rank Holder", prize: config.rewards.topper2nd },
                  { pos: "3rd Position Rank Holder", prize: config.rewards.topper3rd }
                ].map((prize, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 font-bold">
                    <span>{prize.pos}</span>
                    <span className="text-sm font-black text-amber-700">{prize.prize}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                * Scholarship winners receive laminated merit badges and verification profiles online.
              </p>
            </div>

            {/* Box 2: National School Representative Awards */}
            <div className="p-6 rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-50/40 to-white text-xs text-slate-655 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                <Award className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">National School Awards</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { pos: "1st Best Participating Representative School", prize: config.rewards.school1st },
                  { pos: "2nd Best Participating Representative School", prize: config.rewards.school2nd },
                  { pos: "3rd Best Participating Representative School", prize: config.rewards.school3rd }
                ].map((prize, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 font-bold">
                    <span>{prize.pos}</span>
                    <span className="text-sm font-black text-blue-750">{prize.prize}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                {config.rewards.notes}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 10. WINNERS SECTION */}
      {config.toggles.winners && config.winners.length > 0 && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Hall of Fame</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">National Olympiad Toppers</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Verify previous session top position holders.</p>
          </div>

          {/* Filters strip */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white backdrop-blur-md mb-6 flex flex-wrap gap-3 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <Filter className="h-4 w-4 text-slate-500" />
              
              <select value={winFilterYear} onChange={e => setWinFilterYear(e.target.value)} className="h-8.5 rounded-lg border border-slate-200 bg-white text-slate-705 font-bold px-2.5 outline-none text-[11px] cursor-pointer">
                <option value="All">All Years</option>
                {winnerDropdowns.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <select value={winFilterClass} onChange={e => setWinFilterClass(e.target.value)} className="h-8.5 rounded-lg border border-slate-200 bg-white text-slate-705 font-bold px-2.5 outline-none text-[11px] cursor-pointer">
                <option value="All">All Classes</option>
                {winnerDropdowns.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={winFilterSubject} onChange={e => setWinFilterSubject(e.target.value)} className="h-8.5 rounded-lg border border-slate-200 bg-white text-slate-705 font-bold px-2.5 outline-none text-[11px] cursor-pointer">
                <option value="All">All Subjects</option>
                {winnerDropdowns.subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select value={winFilterRank} onChange={e => setWinFilterRank(e.target.value)} className="h-8.5 rounded-lg border border-slate-200 bg-white text-slate-705 font-bold px-2.5 outline-none text-[11px] cursor-pointer">
                <option value="All">All Ranks</option>
                {winnerDropdowns.ranks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex gap-1.5 border border-slate-200 rounded-lg p-1">
              <button onClick={() => setWinnersViewMode("grid")} className={cn("p-1 rounded cursor-pointer", winnersViewMode === "grid" ? "bg-slate-100 text-slate-800" : "text-slate-500")}>
                <Grid className="h-4 w-4" />
              </button>
              <button onClick={() => { setWinnersViewMode("carousel"); setWinnersCarouselIndex(0); }} className={cn("p-1 rounded cursor-pointer", winnersViewMode === "carousel" ? "bg-slate-100 text-slate-800" : "text-slate-500")}>
                <Sliders className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Winners view layout */}
          {filteredWinners.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 py-12">No winners matching current filter selection.</p>
          ) : winnersViewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 text-left">
              {filteredWinners.map((win) => (
                <div key={win.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between items-center text-center shadow-sm">
                  <div className="h-16 w-16 rounded-full border-2 border-slate-200 bg-slate-50 overflow-hidden relative mb-3">
                    {win.photo ? (
                      <Image src={win.photo} alt={win.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-black text-blue-600 bg-blue-50">
                        {win.name.split(" ").map(x => x[0]).join("")}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">{win.name}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{win.class} | {win.subject}</p>
                    <span className="inline-block mt-2 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 p-0.5 px-2 rounded-full uppercase tracking-wider">
                      {win.rank} ({win.year})
                    </span>
                    <p className="text-[9.5px] text-slate-600 font-bold block mt-1">{win.state}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-xl mx-auto relative px-12">
              <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-md text-center">
                <div className="h-20 w-20 rounded-full border-2 border-slate-205 bg-slate-50 overflow-hidden relative mx-auto mb-4">
                  {filteredWinners[winnersCarouselIndex].photo ? (
                    <Image src={filteredWinners[winnersCarouselIndex].photo} alt={filteredWinners[winnersCarouselIndex].name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-black text-blue-600 bg-blue-50">
                      {filteredWinners[winnersCarouselIndex].name.split(" ").map(x => x[0]).join("")}
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900">{filteredWinners[winnersCarouselIndex].name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{filteredWinners[winnersCarouselIndex].class} | {filteredWinners[winnersCarouselIndex].subject}</p>
                <div className="my-3 inline-block text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 p-1 px-3 rounded-full uppercase">
                  {filteredWinners[winnersCarouselIndex].rank} ({filteredWinners[winnersCarouselIndex].year})
                </div>
                <p className="text-xs text-slate-600 font-bold">{filteredWinners[winnersCarouselIndex].state}</p>
              </div>

              {/* Slider indicators */}
              <div className="flex justify-center gap-1.5 mt-4">
                {filteredWinners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setWinnersCarouselIndex(idx)}
                    className={cn("h-1.5 rounded-full cursor-pointer outline-none", winnersCarouselIndex === idx ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200")}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 11. GALLERY SECTION */}
      {config.toggles.gallery && finalGallery.length > 0 && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Gallery</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">National Event Gallery</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Memorable instances from national award ceremonies and online proctored exam groups.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 border-b border-slate-100 pb-4">
            {["All", "Winners", "Award Ceremony", "School Participation", "Online Exam", "Students", "Events"].map((cat) => (
              <button
                key={cat}
                onClick={() => setGalleryFilter(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer select-none border",
                  galleryFilter === cat
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery masonry columns */}
          {filteredGallery.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 py-12">No media uploads found in this category.</p>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-left">
              {filteredGallery.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImg({ url: item.url, title: item.title, category: item.category })}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden aspect-video relative group cursor-pointer shadow-sm"
                >
                  <Image src={item.url} alt={item.title} fill className="object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
                    <span className="text-[8px] font-black uppercase text-cyan-300 tracking-wider leading-none">{item.category} ({item.year})</span>
                    <h4 className="text-xs font-extrabold text-white mt-1 leading-tight">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lightbox Modal */}
          <AnimatePresence>
            {lightboxImg && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setLightboxImg(null)} />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative max-w-3xl w-full bg-white border border-slate-200 p-2 rounded-2xl overflow-hidden shadow-2xl z-10"
                >
                  <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 h-7 w-7 rounded-full bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200 cursor-pointer select-none">✕</button>
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-50">
                    <Image src={lightboxImg.url} alt={lightboxImg.title} fill className="object-contain" />
                  </div>
                  <div className="p-3.5 text-left text-xs font-bold text-slate-700">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{lightboxImg.category}</span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">{lightboxImg.title}</h4>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 12. REGISTRATION PROCESS */}
      {config.toggles.timeline && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Roadmap</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">10 Core Roadmap Milestones</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Simple steps to register, audit eligibility and receive certificate standings.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-5 text-left">
            {[
              { num: "01", title: "Select Class Grade", desc: "Eligibility matches Classes 3–12." },
              { num: "02", title: "Choose Subjects", desc: "Register single or multiple targets." },
              { num: "03", title: "Fill Details", desc: "Complete candidate and board fields." },
              { num: "04", title: "Verify Contacts", desc: "Enter mobile and email credentials." },
              { num: "05", title: "Upload Files", desc: "Attach photo and enrollment validations." },
              { num: "06", title: "Submit Fee", desc: "Secure Razorpay wallet payment checkout." },
              { num: "07", title: "Receive Login", desc: "Receive SMS exam keys on mobile." },
              { num: "08", title: "Practice Mocks", desc: "Attempt mock modules before test." },
              { num: "09", title: "Appear Exam", desc: "Complete remote webcam proctor exam." },
              { num: "10", title: "Get Standing", desc: "Download percentile and awards certificates." }
            ].map((step, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white flex gap-3 relative shadow-sm">
                <span className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-150 h-7 w-7 rounded-full flex items-center justify-center shrink-0">{step.num}</span>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{step.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 13. BLOG SECTION */}
      {config.toggles.blogs && (
        <section className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <div className="max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Updates</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Latest Announcements & Blogs</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Keep updated with exam slot dates and instructions.</p>
          </div>

          {articles.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-left">
              {[
                { title: "National Olympiad Phase 1 Mock Mock Tests Open", cat: "Announcements", excerpt: "Mock test slots are loaded inside the student dashboard. Practice mock papers now.", date: "June 2026" },
                { title: "How Remote Proctoring Works in Olympiad", cat: "Guides", excerpt: "Check detailed webcam focus restrictions, browser guidelines and exam code rules.", date: "May 2026" },
                { title: "NEP Aligned Curriculum Subject Mapping Guide", cat: "Curriculum", excerpt: "Detailed class-wise mapping guides explaining core cognitive logic sections.", date: "April 2026" }
              ].map((mockArt, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-350 transition-all flex flex-col justify-between h-44 shadow-sm">
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-605">{mockArt.cat}</span>
                    <h3 className="text-xs font-extrabold text-slate-900 mt-2 leading-tight">{mockArt.title}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold mt-1.5 line-clamp-2">{mockArt.excerpt}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-2">{mockArt.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-left">
              {articles.map((art) => (
                <Link
                  key={art.id}
                  href={`/blog/${art.slug}`}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-350 transition-all flex flex-col justify-between h-44 shadow-sm"
                >
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-605">{art.category ?? "Notice"}</span>
                    <h3 className="text-xs font-extrabold text-slate-900 mt-2 leading-tight">{art.title}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold mt-1.5 line-clamp-2">{art.excerpt}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-2">
                    {new Date(art.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 14. CONTACT SECTION */}
      {config.toggles.contact && (
        <section className="relative px-4 max-w-4xl mx-auto z-10 text-center">
          <div className="mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Enquiry Desk</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Submit Inquiry / Query</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Have questions? Fill out the inquiry form below.</p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 bg-white backdrop-blur-md shadow-md text-left">
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <Input
                    value={contactForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Enter name"
                    className="bg-white border-slate-200 text-slate-800 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={contactForm.mobile}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm({ ...contactForm, mobile: e.target.value.replace(/\D/g, "") })}
                    placeholder="10 digit contact"
                    className="bg-white border-slate-200 text-slate-800 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm({ ...contactForm, email: e.target.value.trim() })}
                    placeholder="name@domain.com"
                    className="bg-white border-slate-200 text-slate-800 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Query Category *</label>
                  <select
                    value={contactForm.queryType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactForm({ ...contactForm, queryType: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none bg-white text-slate-700"
                  >
                    <option value="Registration Help">Registration Help</option>
                    <option value="Subject Choice mapping">Subject Choice mapping</option>
                    <option value="Payment verification help">Payment verification help</option>
                    <option value="Exams schedule dates">Exams schedule dates</option>
                    <option value="Result standing metrics">Result standing metrics</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Detailed Message *</label>
                <Textarea
                  value={contactForm.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Query details..."
                  className="bg-white border-slate-200 text-slate-800 rounded-lg text-xs min-h-20"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-bold">
                  * Submission sends details to dedicated RNoS verification coordinators.
                </span>
                
                <Button type="submit" disabled={contactPending} className="h-10.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-xs cursor-pointer select-none">
                  {contactPending ? "Submitting Inquiry..." : "Submit Inquiry Details"}
                </Button>
              </div>
            </form>
            
            {/* Helplines widget */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid gap-3 sm:grid-cols-2 text-xs font-bold text-slate-700">
              <a href="tel:+919000000000" className="flex items-center gap-2 bg-blue-50/55 hover:bg-blue-50 border border-blue-200/60 p-2.5 rounded-xl transition text-blue-700">
                <Phone className="h-4 w-4" />
                <span> Helplines Call Coordinator</span>
              </a>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-50 border border-emerald-250/60 p-2.5 rounded-xl transition text-emerald-800">
                <MessageCircle className="h-4 w-4" />
                <span> WhatsApp Registration Help</span>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 15. FAQ ACCORDION SECTION */}
      {config.faqs.length > 0 && (
        <section className="relative px-4 max-w-4xl mx-auto z-10 text-center">
          <div className="mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Questions</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Frequently Asked Questions</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Review query answers regarding exam modes and fees.</p>
          </div>

          <div className="space-y-3.5 text-left">
            {config.faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className={cn(
                    "rounded-2xl border transition-all duration-300 overflow-hidden bg-white shadow-sm",
                    isOpen 
                      ? "border-blue-300 bg-blue-50/40" 
                      : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/50"
                  )}
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-extrabold text-slate-800 hover:text-blue-700 transition duration-200 cursor-pointer outline-none select-none"
                  >
                    <span className="flex items-center gap-3">
                      <HelpCircle className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                      {faq.question}
                    </span>
                    <ChevronDown className={cn("h-4.5 w-4.5 shrink-0 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-blue-600")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-600 border-t border-slate-150 pl-11 font-medium">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 16. TESTIMONIALS SLIDER SECTION */}
      {config.testimonials.length > 0 && (
        <section className="relative px-4 max-w-4xl mx-auto z-10 text-center">
          <div className="mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4 leading-tight">Trust & Reviews</h2>
            <p className="text-slate-550 text-sm mt-2 font-medium">Audits from participating students and school principals.</p>
          </div>

          <div className="relative overflow-hidden py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl p-8 md:p-12 border border-slate-200 bg-white relative overflow-hidden text-left shadow-md"
              >
                <Quote className="absolute -right-4 -top-4 h-36 w-36 text-slate-100 opacity-80 pointer-events-none" />
                <div className="flex items-center gap-1 text-yellow-500 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>
                
                <p className="text-base md:text-lg font-medium leading-relaxed text-slate-700 italic relative z-10">
                  &quot;{config.testimonials[currentTestimonial].text}&quot;
                </p>
                
                <div className="mt-8 flex items-center gap-3.5 relative z-10">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-150">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{config.testimonials[currentTestimonial].name}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{config.testimonials[currentTestimonial].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slider navigation triggers */}
          <div className="flex justify-center gap-1.5 mt-4">
            {config.testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={cn("h-1.5 rounded-full cursor-pointer outline-none", currentTestimonial === idx ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200")}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
