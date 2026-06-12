"use client";

import { useState, useEffect, useMemo, useRef, useCallback, ComponentType, useTransition, FormEvent } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Calculator, Beaker, BookOpen, Laptop, Globe, Lightbulb,
  ShieldAlert, Atom, FlaskConical, Activity, Hourglass,
  Compass, LineChart, Briefcase, BarChart3, Brain,
  HelpCircle, ChevronDown, User, Star, Quote, ArrowRight, Check,
  Download, Award, Calendar, Phone, MessageCircle,
  Filter, Grid, Sliders, Sparkles, Trophy,
  GraduationCap, Shield, Target, BookMarked, Clock,
  Monitor, Camera, MapPin, FileText, Send
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Lucide Icon Map ─── */
const subjectIcons: Record<string, ComponentType<{ className?: string }>> = {
  Calculator, Beaker, BookOpen, Laptop, Globe, Lightbulb,
  ShieldAlert, Atom, FlaskConical, Activity, Hourglass,
  Compass, LineChart, Briefcase, BarChart3, Brain
};

/* ─── Type Definitions (same interface as admin CMS) ─── */
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

/* ─── Scroll Reveal Section Wrapper ─── */
function RevealSection({ children, className, delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Section Heading Pattern ─── */
function SectionHeading({ eyebrow, eyebrowColor = "text-blue-700 bg-blue-50 border-blue-100", title, subtitle }: {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-2xl mx-auto mb-12 text-center">
      <span className={cn("text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full border inline-block", eyebrowColor)}>
        {eyebrow}
      </span>
      <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-5 leading-tight font-heading">
        {title}
      </h2>
      <p className="text-slate-500 text-sm mt-3 font-medium leading-relaxed max-w-lg mx-auto">
        {subtitle}
      </p>
    </div>
  );
}

/* ─── Main Component ─── */
export function CscOlympiadInteractive({
  config,
  articles,
  dbGallery,
  applyPath,
  applyCtaLabel,
}: InteractiveProps) {
  const { success, error: toastError } = useToast();

  /* ── Subject Explorer State ── */
  const [selectedClass, setSelectedClass] = useState<number>(3);
  const [selectedCalcSubjects, setSelectedCalcSubjects] = useState<string[]>([]);

  const toggleCalcSubject = useCallback((id: string) => {
    setSelectedCalcSubjects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const filteredSubjects = useMemo(() => {
    return config.subjects.filter(subject =>
      subject.classes.includes(selectedClass)
    );
  }, [config.subjects, selectedClass]);

  const calculatedTotal = selectedCalcSubjects.length * config.pricePerSubject;
  const calculatedOldTotal = selectedCalcSubjects.length * config.oldPricePerSubject;
  const calculatedSavings = calculatedOldTotal - calculatedTotal;

  /* ── FAQ Accordion State ── */
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState("");

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return config.faqs;
    const q = faqSearch.toLowerCase();
    return config.faqs.filter(f =>
      f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [config.faqs, faqSearch]);

  /* ── Testimonials Slider ── */
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    if (config.testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % config.testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [config.testimonials.length]);

  /* ── Countdown Timer ── */
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
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
        setCountdownActive(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.countdownDate]);

  /* ── Gallery State ── */
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

  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string; category: string } | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<string>("All");

  const filteredGallery = useMemo(() => {
    if (galleryFilter === "All") return finalGallery;
    return finalGallery.filter(item => item.category === galleryFilter);
  }, [finalGallery, galleryFilter]);

  /* ── Winners State ── */
  const [winFilterYear, setWinFilterYear] = useState("All");
  const [winFilterClass, setWinFilterClass] = useState("All");
  const [winFilterSubject, setWinFilterSubject] = useState("All");
  const [winFilterRank, setWinFilterRank] = useState("All");
  const [winnersViewMode, setWinnersViewMode] = useState<"grid" | "carousel">("grid");
  const [winnersCarouselIndex, setWinnersCarouselIndex] = useState(0);

  const filteredWinners = useMemo(() => {
    return config.winners.filter(win => {
      const matchYear = winFilterYear === "All" || win.year === winFilterYear;
      const matchClass = winFilterClass === "All" || win.class.toLowerCase().includes(winFilterClass.toLowerCase());
      const matchSub = winFilterSubject === "All" || win.subject.toLowerCase().includes(winFilterSubject.toLowerCase());
      const matchRank = winFilterRank === "All" || win.rank.toLowerCase().includes(winFilterRank.toLowerCase());
      return matchYear && matchClass && matchSub && matchRank;
    });
  }, [config.winners, winFilterYear, winFilterClass, winFilterSubject, winFilterRank]);

  const winnerDropdowns = useMemo(() => {
    const years = Array.from(new Set(config.winners.map(w => w.year))).sort();
    const classes = Array.from(new Set(config.winners.map(w => w.class))).sort();
    const subjects = Array.from(new Set(config.winners.map(w => w.subject))).sort();
    const ranks = Array.from(new Set(config.winners.map(w => w.rank))).sort();
    return { years, classes, subjects, ranks };
  }, [config.winners]);

  /* ── Contact Form ── */
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

  /* ── WhatsApp ── */
  const whatsappHref = `https://api.whatsapp.com/send?phone=919000000000&text=${encodeURIComponent(
    `Hi, I want assistance with CSC Olympiad Registration ${config.session} facilitator.`
  )}`;

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-20 md:space-y-28 pb-24">

      {/* ═══════════════════════════════════════════
          1. HERO SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.hero && (
        <section className="relative overflow-hidden pt-10 pb-16 px-4 md:px-8 max-w-7xl mx-auto z-10">
          <div className="grid gap-10 lg:gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-7 text-left"
            >
              {/* Logo Badge */}
              <div className="olympiad-glass-badge inline-flex items-center gap-3 rounded-2xl p-2.5 px-5">
                <Image
                  src="/images/services/csc-olympiad/logo.png"
                  alt="CSC Olympiad Official Logo"
                  width={100}
                  height={50}
                  priority
                  className="object-contain"
                />
                <div className="h-7 w-px bg-slate-200" />
                <div className="text-left">
                  <span className="text-[9px] font-black text-blue-600 tracking-wider uppercase block">Facilitator</span>
                  <span className="text-[9px] font-bold text-slate-500 tracking-wide uppercase block">DigiConnect Dukan</span>
                </div>
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-black tracking-tight text-slate-900 leading-[1.1] font-heading">
                  {config.heroTitle}
                </h1>
                <p className="text-base md:text-lg leading-relaxed text-slate-600 font-medium mt-5 max-w-xl">
                  {config.heroSubtitle}
                </p>
              </div>

              {/* Pricing Badge */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="glass-liquid-premium rounded-2xl p-4 px-5 inline-flex items-center gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Per Subject</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-900">&#8377;{config.pricePerSubject}</span>
                      <span className="text-sm text-slate-400 line-through font-bold">&#8377;{config.oldPricePerSubject}</span>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-slate-200/60" />
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg leading-tight">
                    Save &#8377;{config.oldPricePerSubject - config.pricePerSubject}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-500 max-w-[180px] leading-tight">
                  {config.offerText}
                </span>
              </div>

              {/* Countdown Timer */}
              {countdownActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-liquid-premium rounded-2xl p-5 inline-block"
                >
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-3 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    Registration Closes In
                  </span>
                  <div className="flex gap-3 text-center">
                    {[
                      { val: timeLeft.days, label: "Days" },
                      { val: timeLeft.hours, label: "Hrs" },
                      { val: timeLeft.minutes, label: "Mins" },
                      { val: timeLeft.seconds, label: "Secs" }
                    ].map((time, idx) => (
                      <div key={idx} className="min-w-[52px]">
                        <div className="h-12 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-xl font-black text-blue-600 shadow-sm font-mono tabular-nums">
                          {String(time.val).padStart(2, "0")}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold block mt-1.5">{time.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  href={applyPath}
                  className="inline-flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-sm px-8 shadow-lg shadow-blue-500/20 active:scale-[0.97] transition-all cursor-pointer olympiad-glow-cta"
                >
                  {applyCtaLabel}
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
                <a
                  href="#explorer"
                  className="inline-flex h-13 items-center justify-center rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-700 text-sm px-7 shadow-sm transition-all cursor-pointer"
                >
                  Explore Subjects
                </a>
                {config.brochureUrl && (
                  <a
                    href={config.brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-700 text-sm px-6 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Brochure
                  </a>
                )}
              </div>
            </motion.div>

            {/* Right Column — Visual Scene */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-[2.5rem] glass-liquid-premium p-8 relative overflow-hidden flex flex-col justify-center items-center text-center">
                {/* Ambient Glow */}
                <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-gradient-to-br from-blue-200/20 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-cyan-200/15 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

                {/* Central Medal */}
                <div className="relative z-10">
                  <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center rounded-full bg-gradient-to-tr from-blue-100/80 to-cyan-50/60 border border-blue-200/40 shadow-inner">
                    <Award className="h-20 w-20 md:h-24 md:w-24 text-blue-600 drop-shadow-lg" />

                    {/* Orbiting Ring */}
                    <div className="absolute inset-[-12px] rounded-full border border-dashed border-blue-200/50 olympiad-orbit-ring pointer-events-none" />
                    <div className="absolute inset-[-28px] rounded-full border border-dashed border-slate-200/30 olympiad-orbit-ring pointer-events-none" style={{ animationDuration: "30s", animationDirection: "reverse" }} />
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-black text-slate-900 mt-6 relative z-10 font-heading">National Scholars Program</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-xs relative z-10 font-medium">
                  NEP-aligned competitive evaluation platform for Classes 3&#8211;12 across India
                </p>

                {/* Floating Badges */}
                <motion.div
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-6 left-5 md:top-8 md:left-8 olympiad-glass-badge flex items-center gap-2 px-3.5 py-2 rounded-xl z-10"
                >
                  <Monitor className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Remote Proctor</span>
                </motion.div>

                <motion.div
                  animate={{ y: [3, -5, 3] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-6 right-5 md:bottom-8 md:right-8 olympiad-glass-badge flex items-center gap-2 px-3.5 py-2 rounded-xl z-10"
                >
                  <Calendar className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Session {config.session}</span>
                </motion.div>

                <motion.div
                  animate={{ y: [-3, 5, -3] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-6 right-5 md:top-8 md:right-8 olympiad-glass-badge flex items-center gap-2 px-3.5 py-2 rounded-xl z-10"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Scholarships</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          2. TRUST STATS STRIP
      ═══════════════════════════════════════════ */}
      {config.toggles.stats && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { val: config.stats.classes, label: "Eligibility", icon: GraduationCap },
              { val: config.stats.subjects, label: "Subjects", icon: BookOpen },
              { val: config.stats.mediums, label: "Mediums", icon: Globe },
              { val: config.stats.priceLabel, label: "Fee / Subject", icon: Sparkles },
              { val: config.stats.registrations, label: "Registrations", icon: Target },
              { val: config.stats.participation, label: "School Stands", icon: Shield },
              { val: config.stats.states, label: "State Reach", icon: MapPin }
            ].map((stat, idx) => {
              const StatIcon = stat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="p-4 rounded-2xl glass-liquid-premium flex flex-col justify-center items-center text-center gap-2"
                >
                  <StatIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-black text-slate-900 leading-none">{stat.val}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
                </motion.div>
              );
            })}
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          3. WHY CSC OLYMPIAD
      ═══════════════════════════════════════════ */}
      {config.toggles.whyChoose && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Benefits"
            title="Why Choose CSC Olympiad"
            subtitle="NEP aligned platform validating cognitive aptitude and computational thinking early."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-left">
            {[
              { title: "NEP Assessment Framework", desc: "Formulated in alignment with NEP objectives auditing conceptual depth and learning outcomes.", icon: BookMarked, color: "text-amber-500 bg-amber-50 border-amber-200/60" },
              { title: "Practice-Based Learning", desc: "Rigorous exercise using mock papers and online practice modules to reinforce school curriculum.", icon: Target, color: "text-blue-500 bg-blue-50 border-blue-200/60" },
              { title: "Digital Literacy Skills", desc: "Introduces online examination proctor systems and digital assessment environments to candidates.", icon: Laptop, color: "text-cyan-600 bg-cyan-50 border-cyan-200/60" },
              { title: "Conceptual Aptitude", desc: "Strengthens logical deduction and analytical capabilities beyond standard textbooks.", icon: Lightbulb, color: "text-emerald-600 bg-emerald-50 border-emerald-200/60" },
              { title: "National Recognition", desc: "Establishes national benchmarks, state standing audits and merit certificates across India.", icon: Award, color: "text-purple-600 bg-purple-50 border-purple-200/60" },
              { title: "Performance Tracking", desc: "Detailed metric reports identifying conceptual learning gaps and cognitive strengths.", icon: LineChart, color: "text-rose-600 bg-rose-50 border-rose-200/60" }
            ].map((card, idx) => {
              const IconComp = card.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08, duration: 0.5 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl glass-liquid-premium hover:bg-white/80 transition-all duration-300 cursor-default"
                >
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm", card.color)}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-5">{card.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-2">{card.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          4. CLASS & SUBJECT EXPLORER
      ═══════════════════════════════════════════ */}
      {config.toggles.explorer && (
        <RevealSection id="explorer" className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Subject Mappings"
            title="Class &amp; Subject Explorer"
            subtitle="Select a class to audit the available subjects for registration."
          />

          {/* Class Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 overflow-x-auto no-scrollbar">
            {[3,4,5,6,7,8,9,10,11,12].map((cls) => (
              <button
                key={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  setSelectedCalcSubjects([]);
                }}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 outline-none cursor-pointer border select-none",
                  selectedClass === cls
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/15"
                    : "bg-white/80 border-slate-200 hover:bg-slate-50 text-slate-600"
                )}
              >
                Class {cls}
              </button>
            ))}
          </div>

          {/* Subjects Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-left">
            <AnimatePresence mode="popLayout">
              {filteredSubjects.map((sub) => {
                const IconComp = subjectIcons[sub.icon] || BookOpen;
                const isSelected = selectedCalcSubjects.includes(sub.id);

                return (
                  <motion.div
                    key={sub.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => toggleCalcSubject(sub.id)}
                    className={cn(
                      "p-5 rounded-2xl border cursor-pointer select-none transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-36 group",
                      isSelected
                        ? "border-blue-400 bg-blue-50/60 shadow-md shadow-blue-500/5"
                        : "border-slate-200/70 bg-white/70 hover:bg-white hover:border-slate-300 hover:shadow-sm"
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
                        "h-5.5 w-5.5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-transparent"
                      )}>
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">{sub.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Available in 10+ languages
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Live Fee Calculator */}
          <AnimatePresence>
            {selectedCalcSubjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-10 p-6 rounded-2xl glass-liquid-premium text-left flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div>
                  <span className="text-[9px] uppercase font-black text-blue-600 tracking-wider flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5" /> Fee Calculator
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">
                    Selected {selectedCalcSubjects.length} subject{selectedCalcSubjects.length > 1 ? "s" : ""}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 max-w-md">
                    {selectedCalcSubjects.map(id => config.subjects.find(s => s.id === id)?.name).join(", ")}
                  </p>
                </div>

                <div className="flex items-center gap-5 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 line-through font-bold">&#8377;{calculatedOldTotal}</span>
                    <div className="text-lg font-black text-slate-900 flex items-center gap-2 leading-none mt-1">
                      &#8377;{calculatedTotal}
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                        Save &#8377;{calculatedSavings}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`${applyPath}?subjects=${selectedCalcSubjects.join(",")}`}
                    className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-all"
                  >
                    Register Now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          5. LANGUAGE MEDIUM CHART
      ═══════════════════════════════════════════ */}
      {config.toggles.mediumChart && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Accessibility"
            title="Language Mediums Chart"
            subtitle="Exam question papers are available in multiple languages to facilitate regional accessibility."
          />

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 text-left">
            {[
              { code: "EN", name: "English", desc: "Standard medium" },
              { code: "HI", name: "Hindi", desc: "Standard national" },
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
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04, duration: 0.4 }}
                className="p-4 rounded-xl glass-liquid-premium hover:bg-white/80 transition-all"
              >
                <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200/60 p-1 px-2.5 rounded-lg inline-block">{lang.code}</span>
                <h3 className="text-xs font-extrabold text-slate-900 mt-3">{lang.name}</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{lang.desc}</p>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          6. PREPARATION SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.preparation && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-6 text-left">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Preparation Kit</span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-5 leading-tight font-heading">Exam Preparation Materials</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mt-3">
                  Registered students receive dashboard access loaded with mocks and syllabus books to practice anytime.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { label: "5 Sets of Mock Tests", desc: "Simulated question environments loaded for subject prep.", icon: FileText },
                  { label: "3 Examination Attempts Allowed", desc: "Practice attempts to identify candidate pacing mistakes.", icon: Target },
                  { label: "Detailed Study PDF Material", desc: "Curated chapter references mapping complete syllabi.", icon: BookMarked },
                  { label: "Cognitive Strengths Report", desc: "Performance report tracking conceptual weak fields.", icon: LineChart }
                ].map((prep, idx) => {
                  const PrepIcon = prep.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1, duration: 0.4 }}
                      className="flex gap-3.5 items-start p-4 rounded-xl glass-liquid-premium"
                    >
                      <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-200/50 flex items-center justify-center shrink-0">
                        <PrepIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{prep.label}</h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{prep.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Mock Test Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-6 rounded-[2rem] glass-liquid-premium relative overflow-hidden"
            >
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-5 text-left text-xs text-slate-600 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                  <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Mock Assessment Console</span>
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 p-0.5 px-2.5 rounded-lg flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 59:45
                  </span>
                </div>
                <p className="text-slate-900 font-extrabold text-[11px]">Q1: A vehicle travels 60 km/h for 2 hours and 80 km/h for next 3 hours. What is the average velocity of travel?</p>
                <div className="grid gap-2">
                  {["A. 70 km/h", "B. 72 km/h", "C. 75 km/h", "D. 68 km/h"].map((opt, oIdx) => (
                    <div key={oIdx} className={cn(
                      "p-3 rounded-xl border flex justify-between items-center font-medium transition-all",
                      oIdx === 1 ? "border-blue-300 bg-blue-50/50 text-blue-800" : "border-slate-200 bg-white text-slate-700"
                    )}>
                      <span>{opt}</span>
                      <span className={cn(
                        "h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center",
                        oIdx === 1 ? "border-blue-500 bg-blue-500" : "border-slate-300"
                      )}>
                        {oIdx === 1 && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-500 font-bold">Question 1 of 50</span>
                  <button type="button" className="h-8 px-4 rounded-lg bg-blue-600 font-bold text-[10px] text-white">Next Question</button>
                </div>
              </div>
            </motion.div>
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          7. EXAM MODE SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.examMode && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Protocol"
            title="Online Proctor Guidelines"
            subtitle="Exam integrity audits are strictly monitored remotely using webcams."
          />

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-left">
            {[
              { label: "Proctored Exam", desc: "Online monitoring detects eye movements and tabs switching.", icon: Shield },
              { label: "Devices Approved", desc: "Desktop, laptop or webcam integrated mobile device required.", icon: Monitor },
              { label: "Hardware Camera", desc: "Mandatory webcam focus verifying the registered student candidate.", icon: Camera },
              { label: "Appearing Centers", desc: "Home, school lab, cybercafe or local CSC Academy locations.", icon: MapPin }
            ].map((mode, idx) => {
              const ModeIcon = mode.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl glass-liquid-premium"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200/50 flex items-center justify-center mb-4">
                    <ModeIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{mode.label}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-2">{mode.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {config.dateSheetUrl && (
            <div className="mt-10 flex justify-center">
              <a href={config.dateSheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold text-xs text-blue-700 px-7 tracking-wide transition-all cursor-pointer">
                <Download className="h-4 w-4" /> Download Official Date Sheet (PDF)
              </a>
            </div>
          )}
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          8. EXAM CALENDAR
      ═══════════════════════════════════════════ */}
      {config.toggles.calendar && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Schedules"
            title="Exam Time Tables &amp; Slots"
            subtitle="Verify exam phases details. Candidates receive slot credentials over SMS."
          />

          <div className="rounded-2xl glass-liquid-premium overflow-hidden text-left">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-slate-500">
                <thead className="bg-slate-50/80 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200/60">
                  <tr>
                    <th className="p-4 px-5 text-left">Subjects Group</th>
                    <th className="p-4 text-left">Phase 1 (Mock/Prep)</th>
                    <th className="p-4 text-left">Phase 2 (Final Test)</th>
                    <th className="p-4 text-left">Time Slots</th>
                    <th className="p-4 text-left">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-medium">
                  {config.examCalendar.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 px-5 font-black text-slate-900 max-w-xs">{item.subject}</td>
                      <td className="p-4 text-blue-600 font-bold">{item.phase1}</td>
                      <td className="p-4 text-emerald-600 font-bold">{item.phase2}</td>
                      <td className="p-4">{item.timeWindow}</td>
                      <td className="p-4 text-[10px] text-slate-450 leading-normal">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-200/50">
              {config.examCalendar.map((item, idx) => (
                <div key={idx} className="p-5 space-y-2.5 text-xs font-medium">
                  <h4 className="font-black text-slate-900 text-sm">{item.subject}</h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Phase 1</span>
                      <span className="text-blue-600 font-bold">{item.phase1}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Phase 2</span>
                      <span className="text-emerald-600 font-bold">{item.phase2}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 block">Time Window</span>
                    <span className="text-slate-700">{item.timeWindow}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">{item.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          9. REWARDS & RECOGNITION
      ═══════════════════════════════════════════ */}
      {config.toggles.rewards && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Rewards"
            eyebrowColor="text-amber-700 bg-amber-50 border-amber-200"
            title="Scholarships &amp; Honors"
            subtitle="Toppers receive certificates and cash support incentives directly."
          />

          <div className="grid gap-6 md:grid-cols-2 text-left">
            {/* National Toppers Scholarship */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-7 rounded-[2rem] olympiad-gold-surface text-xs text-slate-600 space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b border-amber-200/50 pb-4">
                <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200/60 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">National Topper Scholarships</h3>
              </div>
              <div className="divide-y divide-amber-200/30">
                {[
                  { pos: "1st Position Rank Holder", prize: config.rewards.topper1st },
                  { pos: "2nd Position Rank Holder", prize: config.rewards.topper2nd },
                  { pos: "3rd Position Rank Holder", prize: config.rewards.topper3rd }
                ].map((prize, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 font-bold">
                    <span className="text-slate-700">{prize.pos}</span>
                    <span className="text-sm font-black text-amber-700 bg-amber-100/60 px-3 py-1 rounded-lg border border-amber-200/40">{prize.prize}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* National School Representative Awards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-7 rounded-[2rem] glass-liquid-premium text-xs text-slate-600 space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b border-blue-200/50 pb-4">
                <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">National School Awards</h3>
              </div>
              <div className="divide-y divide-slate-200/50">
                {[
                  { pos: "1st Best Participating School", prize: config.rewards.school1st },
                  { pos: "2nd Best Participating School", prize: config.rewards.school2nd },
                  { pos: "3rd Best Participating School", prize: config.rewards.school3rd }
                ].map((prize, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 font-bold">
                    <span className="text-slate-700">{prize.pos}</span>
                    <span className="text-sm font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200/40">{prize.prize}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal pt-2">
                {config.rewards.notes}
              </p>
            </motion.div>
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          10. WINNERS SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.winners && config.winners.length > 0 && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <SectionHeading
            eyebrow="Hall of Fame"
            title="National Olympiad Toppers"
            subtitle="Verify previous session top position holders."
          />

          {/* Filters */}
          <div className="p-4 rounded-2xl glass-liquid-premium mb-8 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <Filter className="h-4 w-4 text-slate-500" />
              {[
                { value: winFilterYear, setter: setWinFilterYear, options: winnerDropdowns.years, label: "All Years" },
                { value: winFilterClass, setter: setWinFilterClass, options: winnerDropdowns.classes, label: "All Classes" },
                { value: winFilterSubject, setter: setWinFilterSubject, options: winnerDropdowns.subjects, label: "All Subjects" },
                { value: winFilterRank, setter: setWinFilterRank, options: winnerDropdowns.ranks, label: "All Ranks" },
              ].map((filter, idx) => (
                <select
                  key={idx}
                  value={filter.value}
                  onChange={e => filter.setter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold px-2.5 outline-none text-[11px] cursor-pointer"
                >
                  <option value="All">{filter.label}</option>
                  {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ))}
            </div>

            <div className="flex gap-1.5 border border-slate-200 rounded-lg p-1">
              <button onClick={() => setWinnersViewMode("grid")} className={cn("p-1.5 rounded cursor-pointer", winnersViewMode === "grid" ? "bg-slate-100 text-slate-800" : "text-slate-500")}>
                <Grid className="h-4 w-4" />
              </button>
              <button onClick={() => { setWinnersViewMode("carousel"); setWinnersCarouselIndex(0); }} className={cn("p-1.5 rounded cursor-pointer", winnersViewMode === "carousel" ? "bg-slate-100 text-slate-800" : "text-slate-500")}>
                <Sliders className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Winners Grid/Carousel */}
          {filteredWinners.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 py-12">No winners matching current filter selection.</p>
          ) : winnersViewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 text-left">
              {filteredWinners.map((win) => (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -3 }}
                  className="p-5 rounded-2xl glass-liquid-premium flex flex-col justify-between items-center text-center"
                >
                  <div className="h-16 w-16 rounded-full border-2 border-slate-200 bg-slate-50 overflow-hidden relative mb-3">
                    {win.photo ? (
                      <Image src={win.photo} alt={win.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-black text-blue-600 bg-blue-50 text-sm">
                        {win.name.split(" ").map(x => x[0]).join("")}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">{win.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{win.class} | {win.subject}</p>
                    <span className="inline-block mt-2 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 p-0.5 px-2.5 rounded-full uppercase tracking-wider">
                      {win.rank} ({win.year})
                    </span>
                    <p className="text-[9.5px] text-slate-600 font-bold block mt-1">{win.state}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="max-w-xl mx-auto relative px-12">
              <div className="p-8 rounded-3xl glass-liquid-premium text-center">
                <div className="h-20 w-20 rounded-full border-2 border-slate-200 bg-slate-50 overflow-hidden relative mx-auto mb-4">
                  {filteredWinners[winnersCarouselIndex]?.photo ? (
                    <Image src={filteredWinners[winnersCarouselIndex].photo} alt={filteredWinners[winnersCarouselIndex].name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-black text-blue-600 bg-blue-50">
                      {filteredWinners[winnersCarouselIndex]?.name.split(" ").map(x => x[0]).join("")}
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900">{filteredWinners[winnersCarouselIndex]?.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{filteredWinners[winnersCarouselIndex]?.class} | {filteredWinners[winnersCarouselIndex]?.subject}</p>
                <div className="my-3 inline-block text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 p-1 px-3 rounded-full uppercase">
                  {filteredWinners[winnersCarouselIndex]?.rank} ({filteredWinners[winnersCarouselIndex]?.year})
                </div>
                <p className="text-xs text-slate-600 font-bold">{filteredWinners[winnersCarouselIndex]?.state}</p>
              </div>

              <div className="flex justify-center gap-1.5 mt-5">
                {filteredWinners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setWinnersCarouselIndex(idx)}
                    className={cn("h-1.5 rounded-full cursor-pointer outline-none transition-all", winnersCarouselIndex === idx ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200")}
                  />
                ))}
              </div>
            </div>
          )}
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          11. GALLERY SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.gallery && finalGallery.length > 0 && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <SectionHeading
            eyebrow="Gallery"
            title="National Event Gallery"
            subtitle="Memorable instances from national award ceremonies and online proctored exam groups."
          />

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 border-b border-slate-100 pb-5">
            {["All", "Winners", "Award Ceremony", "School Participation", "Online Exam", "Students", "Events"].map((cat) => (
              <button
                key={cat}
                onClick={() => setGalleryFilter(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black transition cursor-pointer select-none border",
                  galleryFilter === cat
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredGallery.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 py-12">No media uploads found in this category.</p>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-left">
              {filteredGallery.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  onClick={() => setLightboxImg({ url: item.url, title: item.title, category: item.category })}
                  className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden aspect-video relative group cursor-pointer shadow-sm"
                >
                  <Image src={item.url} alt={item.title} fill className="object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
                    <span className="text-[8px] font-black uppercase text-cyan-300 tracking-wider leading-none">{item.category} ({item.year})</span>
                    <h4 className="text-xs font-extrabold text-white mt-1 leading-tight">{item.title}</h4>
                  </div>
                </motion.div>
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
                  <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200 cursor-pointer select-none z-20">&#10005;</button>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-50">
                    <Image src={lightboxImg.url} alt={lightboxImg.title} fill className="object-contain" />
                  </div>
                  <div className="p-4 text-left text-xs font-bold text-slate-700">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{lightboxImg.category}</span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">{lightboxImg.title}</h4>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          12. REGISTRATION PROCESS TIMELINE
      ═══════════════════════════════════════════ */}
      {config.toggles.timeline && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10">
          <SectionHeading
            eyebrow="Roadmap"
            title="10 Core Registration Milestones"
            subtitle="Simple steps to register, audit eligibility and receive certificate standings."
          />

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 text-left">
            {[
              { num: "01", title: "Select Class Grade", desc: "Eligibility matches Classes 3\u201312." },
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
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06, duration: 0.4 }}
                className="p-5 rounded-xl glass-liquid-premium flex gap-4 relative"
              >
                <span className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-200/50 h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-mono">{step.num}</span>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{step.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          13. BLOG SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.blogs && (
        <RevealSection className="relative px-4 max-w-7xl mx-auto z-10 text-center">
          <SectionHeading
            eyebrow="Updates"
            title="Latest Announcements &amp; Blogs"
            subtitle="Keep updated with exam slot dates and instructions."
          />

          {articles.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-left">
              {[
                { title: "National Olympiad Phase 1 Mock Tests Open", cat: "Announcements", excerpt: "Mock test slots are loaded inside the student dashboard. Practice mock papers now.", date: "June 2026" },
                { title: "How Remote Proctoring Works in Olympiad", cat: "Guides", excerpt: "Check detailed webcam focus restrictions, browser guidelines and exam code rules.", date: "May 2026" },
                { title: "NEP Aligned Curriculum Subject Mapping Guide", cat: "Curriculum", excerpt: "Detailed class-wise mapping guides explaining core cognitive logic sections.", date: "April 2026" }
              ].map((mockArt, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 rounded-2xl glass-liquid-premium hover:bg-white/80 transition-all flex flex-col justify-between h-48"
                >
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-600">{mockArt.cat}</span>
                    <h3 className="text-xs font-extrabold text-slate-900 mt-2 leading-tight">{mockArt.title}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mt-2 line-clamp-2">{mockArt.excerpt}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-3">{mockArt.date}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-left">
              {articles.map((art) => (
                <Link
                  key={art.id}
                  href={`/blog/${art.slug}`}
                  className="p-6 rounded-2xl glass-liquid-premium hover:bg-white/80 transition-all flex flex-col justify-between h-48"
                >
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-600">{art.category ?? "Notice"}</span>
                    <h3 className="text-xs font-extrabold text-slate-900 mt-2 leading-tight">{art.title}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mt-2 line-clamp-2">{art.excerpt}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-3">
                    {new Date(art.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          14. FAQ ACCORDION SECTION
      ═══════════════════════════════════════════ */}
      {config.faqs.length > 0 && (
        <RevealSection className="relative px-4 max-w-4xl mx-auto z-10">
          <SectionHeading
            eyebrow="Questions"
            title="Frequently Asked Questions"
            subtitle="Review query answers regarding exam modes and fees."
          />

          {/* Search */}
          {config.faqs.length > 5 && (
            <div className="mb-6">
              <Input
                value={faqSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFaqSearch(e.target.value)}
                placeholder="Search questions..."
                className="bg-white/80 border-slate-200 text-slate-800 rounded-xl text-xs h-10 max-w-md mx-auto"
              />
            </div>
          )}

          <div className="space-y-3 text-left">
            {filteredFaqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "rounded-2xl border transition-all duration-300 overflow-hidden",
                    isOpen
                      ? "border-blue-300 bg-blue-50/30 shadow-sm"
                      : "border-slate-200/60 bg-white/70 hover:bg-white hover:border-slate-300"
                  )}
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-extrabold text-slate-800 hover:text-blue-700 transition duration-200 cursor-pointer outline-none select-none text-sm"
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
                        <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-600 border-t border-slate-200/50 pl-12 font-medium">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          15. TESTIMONIALS SLIDER SECTION
      ═══════════════════════════════════════════ */}
      {config.testimonials.length > 0 && (
        <RevealSection className="relative px-4 max-w-4xl mx-auto z-10 text-center">
          <SectionHeading
            eyebrow="Testimonials"
            title="Trust &amp; Reviews"
            subtitle="Audits from participating students and school principals."
          />

          <div className="relative overflow-hidden py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl p-8 md:p-12 glass-liquid-premium relative overflow-hidden text-left"
              >
                <Quote className="absolute -right-4 -top-4 h-36 w-36 text-slate-100 opacity-60 pointer-events-none" />

                <div className="flex items-center gap-1 text-yellow-500 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>

                <p className="text-base md:text-lg font-medium leading-relaxed text-slate-700 italic relative z-10">
                  &quot;{config.testimonials[currentTestimonial].text}&quot;
                </p>

                <div className="mt-8 flex items-center gap-3.5 relative z-10">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-200/50">
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

          <div className="flex justify-center gap-1.5 mt-4">
            {config.testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={cn("h-1.5 rounded-full cursor-pointer outline-none transition-all duration-300", currentTestimonial === idx ? "w-7 bg-blue-600" : "w-1.5 bg-slate-200")}
              />
            ))}
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          16. CONTACT FORM SECTION
      ═══════════════════════════════════════════ */}
      {config.toggles.contact && (
        <RevealSection className="relative px-4 max-w-4xl mx-auto z-10">
          <SectionHeading
            eyebrow="Enquiry Desk"
            title="Submit Inquiry / Query"
            subtitle="Have questions? Fill out the inquiry form below."
          />

          <div className="p-7 rounded-3xl glass-liquid-premium text-left">
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <Input
                    value={contactForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Enter name"
                    className="bg-white border-slate-200 text-slate-800 rounded-xl text-xs"
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
                    className="bg-white border-slate-200 text-slate-800 rounded-xl text-xs"
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
                    className="bg-white border-slate-200 text-slate-800 rounded-xl text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Query Category *</label>
                  <select
                    value={contactForm.queryType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactForm({ ...contactForm, queryType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-white text-slate-700"
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
                  className="bg-white border-slate-200 text-slate-800 rounded-xl text-xs min-h-20"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-3 border-t border-slate-200/50">
                <span className="text-[10px] text-slate-500 font-medium">
                  * Submission sends details to dedicated RNoS verification coordinators.
                </span>

                <Button type="submit" disabled={contactPending} className="h-11 px-7 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-xs cursor-pointer select-none flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  {contactPending ? "Submitting..." : "Submit Inquiry"}
                </Button>
              </div>
            </form>

            {/* Helplines */}
            <div className="mt-6 pt-5 border-t border-slate-200/50 grid gap-3 sm:grid-cols-2 text-xs font-bold text-slate-700">
              <a href="tel:+919000000000" className="flex items-center gap-2.5 bg-blue-50/60 hover:bg-blue-50 border border-blue-200/50 p-3 rounded-xl transition text-blue-700">
                <Phone className="h-4 w-4" />
                <span>Helpline Call Coordinator</span>
              </a>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/50 p-3 rounded-xl transition text-emerald-700">
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Registration Help</span>
              </a>
            </div>
          </div>
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════
          17. FINAL REGISTER CTA
      ═══════════════════════════════════════════ */}
      <RevealSection className="relative px-4 max-w-4xl mx-auto z-10 text-center">
        <div className="p-10 md:p-14 rounded-3xl olympiad-aurora-bg border border-blue-200/30 relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-blue-200/20 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gradient-to-tr from-cyan-200/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <Sparkles className="h-8 w-8 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight font-heading">
              Ready to Register for CSC Olympiad?
            </h2>
            <p className="text-sm text-slate-600 font-medium mt-3 max-w-md mx-auto">
              Join thousands of students competing nationally. Session {config.session} registration is open.
            </p>

            {countdownActive && (
              <div className="flex justify-center gap-2 mt-6">
                {[
                  { val: timeLeft.days, label: "Days" },
                  { val: timeLeft.hours, label: "Hrs" },
                  { val: timeLeft.minutes, label: "Mins" },
                  { val: timeLeft.seconds, label: "Secs" }
                ].map((time, idx) => (
                  <div key={idx} className="min-w-[44px]">
                    <div className="h-10 flex items-center justify-center rounded-lg bg-white/80 border border-slate-200/60 text-base font-black text-blue-600 font-mono tabular-nums">
                      {String(time.val).padStart(2, "0")}
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold block mt-1">{time.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <Link
                href={applyPath}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-sm px-10 shadow-lg shadow-blue-500/20 active:scale-[0.97] transition-all cursor-pointer"
              >
                {applyCtaLabel}
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 font-bold text-emerald-700 text-sm px-7 shadow-sm transition-all cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Help
              </a>
            </div>
          </div>
        </div>
      </RevealSection>

    </div>
  );
}
