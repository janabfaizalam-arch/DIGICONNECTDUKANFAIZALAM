"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  FileText,
  UserCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageCircle,
  FileCheck,
  UploadCloud,
  FileCheck2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Store,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 20 Curated high quality Unsplash images for CM YUVA business themes
const IMAGES = {
  youngEntrepreneur: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&h=600&q=80",
  smallRetail: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&h=600&q=80",
  tailoring: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&h=600&q=80",
  mobileRepair: "https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?auto=format&fit=crop&w=800&h=600&q=80",
  dairy: "https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=800&h=600&q=80",
  printing: "https://images.unsplash.com/photo-1616400619175-5ebd3009007f?auto=format&fit=crop&w=800&h=600&q=80",
  computerCenter: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&h=600&q=80",
  manufacturing: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&h=600&q=80",
  planningMeeting: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&h=600&q=80",
  reportPrep: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&h=600&q=80",
  msmeSupport: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&h=600&q=80",
  verification: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&h=600&q=80",
  successStories: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&h=600&q=80",
  growthVisual: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&h=600&q=80",
  approvalConcept: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&h=600&q=80",
  startupTeam: "https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&w=800&h=600&q=80",
  womenEntrepreneur: "https://images.unsplash.com/photo-1580894732444-8fecef2271ff?auto=format&fit=crop&w=800&h=600&q=80",
  ruralEntrepreneur: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&h=600&q=80",
  digitalBusiness: "https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&w=800&h=600&q=80",
  expansion: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&h=600&q=80"
};

// 12 Business categories image cards data
const CATEGORIES = [
  { title: "Retail Store", desc: "Supermarkets, grocery shops, and retail outlets.", img: IMAGES.smallRetail, icon: Store },
  { title: "Tailoring Unit", desc: "Custom boutique, garments stitching, and alterations.", img: IMAGES.tailoring, icon: Store },
  { title: "Gift Shop", desc: "Novelties, cards, and fancy items boutique.", img: IMAGES.planningMeeting, icon: Store },
  { title: "Mobile Shop", desc: "Mobile retail accessories and service units.", img: IMAGES.mobileRepair, icon: Store },
  { title: "Computer Center", desc: "Cyber cafes, training institutes, and DTP.", img: IMAGES.computerCenter, icon: Store },
  { title: "Printing Press", desc: "Offset printers, flex, and digital printing.", img: IMAGES.printing, icon: Store },
  { title: "Dairy Business", desc: "Milk supply centers, dairy processing plants.", img: IMAGES.dairy, icon: Store },
  { title: "Food Business", desc: "Bakeries, sweet shops, cafes, and catering.", img: IMAGES.successStories, icon: Store },
  { title: "Salon", desc: "Premium beauty parlours and hair-dressers.", img: IMAGES.womenEntrepreneur, icon: Store },
  { title: "Repair Center", desc: "Electrical and electronic home appliance repair.", img: IMAGES.digitalBusiness, icon: Store },
  { title: "Manufacturing Unit", desc: "Sacks, garments, packaging, or soap works.", img: IMAGES.manufacturing, icon: Store },
  { title: "E-Commerce", desc: "Online shipping hubs and home deliveries.", img: IMAGES.expansion, icon: Store }
];

export function CmYuvaClientPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [eligibilityData, setEligibilityData] = useState({
    age: "",
    isUPResident: "",
    education: "",
    businessCategory: ""
  });
  const [eligibilityResult, setEligibilityResult] = useState<string | null>(null);

  // Counters state
  const [counters, setCounters] = useState({
    assisted: 0,
    reports: 0,
    msme: 0,
    rating: 0
  });

  // Count-up animation on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounters({
        assisted: Math.floor((12450 / steps) * step),
        reports: Math.floor((8240 / steps) * step),
        msme: Math.floor((10120 / steps) * step),
        rating: Number(((4.9 / steps) * step).toFixed(1))
      });

      if (step >= steps) {
        setCounters({
          assisted: 12450,
          reports: 8240,
          msme: 10120,
          rating: 4.9
        });
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // Eligibility evaluation
  const handleCheckEligibility = () => {
    const ageVal = parseInt(eligibilityData.age);
    if (isNaN(ageVal) || ageVal < 18 || ageVal > 40) {
      setEligibilityResult("not_eligible_age");
      return;
    }
    if (eligibilityData.isUPResident !== "yes") {
      setEligibilityResult("not_eligible_resident");
      return;
    }
    if (eligibilityData.education === "below_8th") {
      setEligibilityResult("not_eligible_education");
      return;
    }
    
    // Eligible
    setEligibilityResult(eligibilityData.businessCategory === "manufacturing" ? "eligible_industrial" : "eligible_service");
  };

  // Uploader state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [leadCreated, setLeadCreated] = useState(false);
  const [currentTrackerStep, setCurrentTrackerStep] = useState(1);

  // Simulated Document Upload
  const handleFileUpload = (files: File[]) => {
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && ["application/pdf", "image/jpeg", "image/png"].includes(f.type));
    if (valid.length !== files.length) {
      alert("Only PDF, JPG, and PNG files under 5MB are allowed.");
    }
    setSelectedFiles(prev => [...prev, ...valid]);
  };

  const handleStartSimulatedUpload = () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            setLeadCreated(true);
            setCurrentTrackerStep(3); // Advance to Documents Received in visual tracker
            // Trigger conversion tracking events
            triggerAnalyticsEvent("document_upload_success", { count: selectedFiles.length });
          }, 500);
          return 100;
        }
        return prev + 15;
      });
    }, 200);
  };

  const triggerAnalyticsEvent = (name: string, payload: Record<string, unknown> = {}) => {
    if (typeof window !== "undefined") {
      const win = window as typeof window & {
        gtag?: (event: string, action: string, data: Record<string, unknown>) => void;
        fbq?: (event: string, action: string, data: Record<string, unknown>) => void;
      };
      // Safe Google Analytics
      if (typeof win.gtag === "function") {
        win.gtag("event", name, payload);
      }
      // Safe Meta Pixel
      if (typeof win.fbq === "function") {
        win.fbq("trackCustom", name, payload);
      }
      console.log(`[Analytics Event] ${name}:`, payload);
    }
  };

  // FAQ Accordions State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const FAQS = [
    { q: "What is the CM YUVA Entrepreneur Loan Scheme?", a: "The Chief Minister's Youth Self-Employment Scheme (CM YUVA) is a government initiative of Uttar Pradesh designed to help young entrepreneurs start their own businesses with interest subventions, project report preparations, and digital documentation assistance." },
    { q: "Who is eligible to apply for this scheme?", a: "UP residents aged 18 to 40, who have cleared at least Class 8th or higher, are eligible. The candidate should not be a defaulter with any financial institution." },
    { q: "What is the maximum loan amount under CM YUVA?", a: "Under this loan assistance program, eligible candidates can secure business loans of up to ₹5 Lakhs for service/retail operations and up to ₹10 Lakhs for industrial manufacturing setups." },
    { q: "What is the rate of interest and subsidy?", a: "The scheme offers premium interest subsidies under state government rules. Our digital portal helps prepare your loan docket to maximize subsidy approval probability." },
    { q: "Is a project report (DPR) mandatory?", a: "Yes, a Detailed Project Report (DPR) outlining the business costs, projected revenues, and working capital is mandatory. Our certified professionals prepare this report for you as part of our service." },
    { q: "How does DigiConnect Dukan assist with MSME Registration?", a: "We handle the complete MSME/Udyam Registration filing process online. We ensure your certificate is generated accurately to link priority business banking lending rates." },
    { q: "Do you guarantee loan approval?", a: "No, loan approval is the sole discretion of the bank. We offer professional file preparation support, correct documentation filings, and project reports to maximize approval rates." },
    { q: "What documents do I need to get started?", a: "Aadhaar Card, PAN Card, Bank Passbook, Educational Certificate (Class 8/10/12/Degree), Passport Photo, and Proof of Business Address are required." },
    { q: "How is the CRM integrated into my application?", a: "Our enterprise CRM generates a stateful tracker immediately after you upload documents. It logs the activity timeline (Lead Created, Report Prepared, Submitted) and sends auto-status updates directly to your WhatsApp." },
    { q: "Are there any hidden charges?", a: "No. All documentation and project file creation consulting charges are specified transparently before payment checkout. No unexpected fees will be requested." },
    { q: "Can I apply for multiple business categories?", a: "Yes. Our expert advisors will suggest the best classification (Manufacturing, Service, or Retail) to maximize loan eligibility limits based on your background." },
    { q: "How can I check my application status?", a: "You can track your live CRM milestones directly through the dynamic Application Tracker widget on this landing page or log into your client portal dashboard." },
    { q: "Can rural entrepreneurs apply for the CM YUVA scheme?", a: "Yes. Rural entrepreneurs are highly encouraged to apply. The UP government offers exclusive priority subventions for rural micro-enterprises." },
    { q: "How is my digital data secured?", a: "All uploaded documents are stored in secure cloud systems using bank-grade AES-256 encryption. We strictly restrict access to certified credit processing professionals." },
    { q: "How long does the document checking process take?", a: "Our standard verification turnaround is 24 to 48 working hours. Once verified, we schedule your file compilation and DPR formulation." },
    { q: "What education proof is accepted?", a: "A copy of your school marksheet (Class 8th minimum), passing certificate, intermediate certificate, or college degree qualifies as valid education proof." },
    { q: "Can women entrepreneurs apply?", a: "Yes! There are dedicated concessions and faster file routing channels for women entrepreneurs applying under this state scheme." },
    { q: "Do I get a GST registration under this scheme?", a: "Yes, if required. We offer bundled GST registration alongside CM YUVA file preparations under our corporate business filings package." },
    { q: "Is the project report prepared as per bank standards?", a: "Absolutely. Our financial analysts compile professional Detailed Project Reports (DPRs) that strictly adhere to public sector and commercial bank lending standards." },
    { q: "How do I start the process?", a: "Simply use the dynamic uploader on this page, run the eligibility checker, or click the WhatsApp button to connect directly with a dedicated loan assistant." }
  ];

  return (
    <div className="relative min-h-screen pb-16 pt-4 bg-slate-50 overflow-x-hidden">
      {/* Liquid Sheen Elements */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 right-10 h-[400px] w-[400px] rounded-full bg-orange-400/10 blur-[100px]" />

      <div className="container-shell space-y-16">
        
        {/* ================= HERO SECTION ================= */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
              <Award className="h-4 w-4" />
              Fintech-Grade Entrepreneurship Support
            </div>
            
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              Start Your Business Journey with <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">CM YUVA</span> Support
            </h1>
            
            <p className="text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
              Professional assistance for detailed project reports (DPR), MSME registration, document verification, and business loan application preparation under UP Government guidelines.
            </p>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                "✓ Documentation Assistance",
                "✓ MSME Registration Support",
                "✓ Project Report Preparation",
                "✓ Application Guidance"
              ].map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-xs font-extrabold text-slate-800">{badge.substring(2)}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row pt-4">
              <a
                href="#uploader"
                onClick={() => triggerAnalyticsEvent("hero_apply_click")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              >
                Apply Online
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#checker"
                onClick={() => triggerAnalyticsEvent("hero_checker_click")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                Check Eligibility
              </a>
              <a
                href="https://wa.me/917007595931?text=Hello,%20I%20am%20interested%20in%20CM%20YUVA%20Entrepreneur%20Loan%20Assistance."
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerAnalyticsEvent("whatsapp_consultation_click", { location: "hero" })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-extrabold text-white transition-all hover:bg-[#20ba56] hover:scale-105"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Assistance
              </a>
            </div>
          </div>

          {/* Right side Illustration */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[4/3] sm:aspect-square overflow-hidden rounded-[2.5rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-sm animate-float-icon-1">
              <Image
                src={IMAGES.youngEntrepreneur}
                alt="Young Entrepreneur Running Business"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover rounded-[2rem] shadow-inner"
              />
              
              {/* Floating element 1 */}
              <div className="absolute -top-3 -right-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-2 text-center shadow-lg backdrop-blur-md">
                <TrendingUp className="mx-auto h-5 w-5 text-orange-500" />
                <p className="mt-1 text-[10px] font-black text-slate-900">Up to ₹10L</p>
              </div>

              {/* Floating element 2 */}
              <div className="absolute -bottom-3 -left-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <p className="text-[10px] font-black text-blue-700">✓ Govt Subsidized</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= TRUST & STATISTICS SECTION ================= */}
        <section className="liquid-card rounded-[2.25rem] border border-blue-50/70 p-6 md:p-10 text-center">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-[#FF8A00]">Satisfaction</p>
              <div className="text-3xl font-black text-slate-900">★★★★★</div>
              <p className="text-xs font-bold text-slate-500">Customer Reviews</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-blue-600">Assisted</p>
              <div className="text-4xl font-black text-slate-900">
                {counters.assisted.toLocaleString()}+
              </div>
              <p className="text-xs font-bold text-slate-500">Applications Handled</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-blue-600">Formulated</p>
              <div className="text-4xl font-black text-slate-900">
                {counters.reports.toLocaleString()}+
              </div>
              <p className="text-xs font-bold text-slate-500">Project Reports Prepared</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-blue-600">Completed</p>
              <div className="text-4xl font-black text-slate-900">
                {counters.msme.toLocaleString()}+
              </div>
              <p className="text-xs font-bold text-slate-500">MSME Registrations Done</p>
            </div>
          </div>
        </section>

        {/* ================= ELIGIBILITY CHECKER WIZARD ================= */}
        <section id="checker" className="scroll-mt-6">
          <div className="mx-auto max-w-3xl glass-panel rounded-[2rem] p-6 md:p-8">
            <div className="text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Interactive Check</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Eligibility Checker Wizard</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">Find out instantly if you qualify for the CM YUVA business loan scheme in just 4 simple steps.</p>
            </div>

            {/* Stepper indicator */}
            <div className="mt-8 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map(step => (
                <div
                  key={step}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeStep === step ? "w-8 bg-blue-600" : activeStep > step ? "w-4 bg-emerald-500" : "w-2.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Wizard Steps Form */}
            <div className="mt-6 min-h-[160px]">
              {activeStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <label className="block text-center font-bold text-slate-900 text-sm sm:text-base">
                    Step 1: Enter your Age (Should be between 18 and 40)
                  </label>
                  <div className="flex justify-center">
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={eligibilityData.age}
                      onChange={e => setEligibilityData(prev => ({ ...prev, age: e.target.value }))}
                      className="h-12 w-48 rounded-full border border-slate-200 bg-white px-4 text-center font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <label className="block text-center font-bold text-slate-900 text-sm sm:text-base">
                    Step 2: Are you a permanent resident of Uttar Pradesh?
                  </label>
                  <div className="flex justify-center gap-4">
                    {["yes", "no"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setEligibilityData(prev => ({ ...prev, isUPResident: opt }))}
                        className={`h-11 px-6 rounded-full font-bold text-xs capitalize border transition ${
                          eligibilityData.isUPResident === opt
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <label className="block text-center font-bold text-slate-900 text-sm sm:text-base">
                    Step 3: What is your highest educational qualification?
                  </label>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { label: "Below Class 8th", value: "below_8th" },
                      { label: "Class 8th Pass", value: "8th_pass" },
                      { label: "Class 10th / 12th Pass", value: "10_12_pass" },
                      { label: "Graduate / Higher", value: "graduate" }
                    ].map(edu => (
                      <button
                        key={edu.value}
                        onClick={() => setEligibilityData(prev => ({ ...prev, education: edu.value }))}
                        className={`h-11 px-5 rounded-full font-bold text-xs border transition ${
                          eligibilityData.education === edu.value
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {edu.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeStep === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <label className="block text-center font-bold text-slate-900 text-sm sm:text-base">
                    Step 4: Select your proposed Business Category
                  </label>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { label: "Industrial / Manufacturing Setup", value: "manufacturing" },
                      { label: "Service Industry Unit", value: "service" },
                      { label: "Small Scale Retail / Business Store", value: "retail" }
                    ].map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setEligibilityData(prev => ({ ...prev, businessCategory: cat.value }))}
                        className={`h-11 px-5 rounded-full font-bold text-xs border transition ${
                          eligibilityData.businessCategory === cat.value
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Stepper Buttons */}
            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                disabled={activeStep === 1}
                onClick={() => {
                  setActiveStep(prev => prev - 1);
                  setEligibilityResult(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition disabled:opacity-40"
              >
                Back
              </button>

              {activeStep < 4 ? (
                <button
                  disabled={
                    (activeStep === 1 && !eligibilityData.age) ||
                    (activeStep === 2 && !eligibilityData.isUPResident) ||
                    (activeStep === 3 && !eligibilityData.education)
                  }
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-bold text-white transition disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  disabled={!eligibilityData.businessCategory}
                  onClick={handleCheckEligibility}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-xs font-bold text-white shadow transition"
                >
                  Check Instant Result
                </button>
              )}
            </div>

            {/* Eligibility checker dynamic result banners */}
            <AnimatePresence>
              {eligibilityResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6"
                >
                  {eligibilityResult.startsWith("eligible") ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-emerald-800">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="font-extrabold text-sm sm:text-base">🎉 Excellent! You are Eligible!</p>
                          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-emerald-700">
                            Based on your inputs, you qualify for loan assistance up to{" "}
                            <strong>
                              {eligibilityResult === "eligible_industrial" ? "₹10 Lakhs (Manufacturing)" : "₹5 Lakhs (Service/Retail)"}
                            </strong>{" "}
                            with government interest subventions. Click below to begin compilation immediately!
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <a
                              href="#uploader"
                              onClick={() => triggerAnalyticsEvent("eligibility_success_apply_now")}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow hover:bg-emerald-700"
                            >
                              Apply Now
                            </a>
                            <a
                              href="https://wa.me/917007595931?text=Hello,%20I%20am%20eligible%20for%20CM%20YUVA%20scheme.%20Please%20guide%20me%20further."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp Advisors
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5 text-rose-800">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-rose-600" />
                        <div>
                          <p className="font-extrabold text-sm sm:text-base">Not Eligible for State Subsidy</p>
                          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-rose-700">
                            {eligibilityResult === "not_eligible_age" && "CM YUVA guidelines require applicants to be aged between 18 and 40 years."}
                            {eligibilityResult === "not_eligible_resident" && "Permanent residency of Uttar Pradesh is mandatory to access this local state funding."}
                            {eligibilityResult === "not_eligible_education" && "The state program requires candidates to have completed at least Class 8th school examination."}
                          </p>
                          <p className="mt-2 text-xs text-rose-600">
                            Don&apos;t worry! Connect with our credit officers via WhatsApp to explore other national programs like PM Mudra or PMEGP.
                          </p>
                          <div className="mt-4">
                            <a
                              href="https://wa.me/917007595931?text=Hello,%20I%20don't%20qualify%20for%20CM%20YUVA.%20Please%20explore%20other%20subsidy%20loans."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Find Alternative Loans
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ================= BUSINESS CATEGORIES SECTION ================= */}
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Scope</p>
            <h2 className="text-3xl font-black text-slate-950">Supported Business Categories</h2>
            <p className="mt-2 text-sm text-slate-500">We assist in preparing project reports and dockets for all eligible operations under the scheme.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {CATEGORIES.map((cat, idx) => {
              const CardIcon = cat.icon;
              return (
                <div key={idx} className="group relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-3 shadow-sm hover:shadow-md transition duration-200">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
                    <Image
                      src={cat.img}
                      alt={cat.title}
                      fill
                      loading="lazy"
                      sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 29vw, (min-width: 640px) 45vw, 95vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/60 text-white backdrop-blur-sm">
                      <CardIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="mt-3.5 px-1 text-sm font-extrabold text-slate-950">{cat.title}</h3>
                  <p className="mt-1 px-1 text-xs text-slate-500 leading-normal line-clamp-2">{cat.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= REQUIRED DOCUMENTS SECTION ================= */}
        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Verifications</p>
            <h2 className="text-3xl font-black text-slate-950 leading-tight">Required Document Checklist</h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Please gather these clear scan copies before uploading. Proper, clear documentation ensures your Detailed Project Report (DPR) meets public banking standards.
            </p>
            <div className="rounded-2xl border border-blue-50 bg-blue-50/30 p-4">
              <p className="text-xs leading-relaxed text-blue-700">
                💡 <strong>Important Checklist Rule:</strong> High-resolution digital scans from cellphones or scanners significantly speed up the processing review pipeline.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "PAN Card", desc: "For verifying financial tax status.", icon: FileCheck2 },
              { title: "Aadhaar Card", desc: "UP address and age authentication.", icon: FileCheck2 },
              { title: "Bank Passbook", desc: "For linking loan funding disbursement.", icon: FileCheck2 },
              { title: "Educational Marksheet", desc: "Proof of Class 8th or higher status.", icon: FileCheck2 },
              { title: "Passport Photo", desc: "Recent color print photograph scan.", icon: FileCheck2 },
              { title: "Business Concept", desc: "Basic details of your proposed startup.", icon: FileCheck2 },
              { title: "Business Space Address", desc: "Electricity bill or space rent agreement.", icon: FileCheck2 }
            ].map((doc, idx) => {
              const DocIcon = doc.icon;
              return (
                <div key={idx} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <DocIcon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900">{doc.title}</h3>
                    <p className="mt-0.5 text-[11px] leading-normal text-slate-500">{doc.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= INCLUDED SERVICES COMPARISON ================= */}
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Features</p>
            <h2 className="text-3xl font-black text-slate-950">Included Services & Benefits</h2>
            <p className="mt-2 text-sm text-slate-500">What you get when you apply for loan file formulation through our digital services portal.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Detailed Project Report (DPR)", desc: "Professionally formulated project cost sheets, cash-flow projections, and working capital dockets matching commercial bank formats.", icon: FileText },
              { title: "MSME/Udyam Registration", desc: "Complete filing of your micro-enterprise Udyam certificate to qualify you for priority sector banking lending rates.", icon: UserCheck },
              { title: "Interest Subsidy Mapping", desc: "Direct eligibility mapping and advisory check to leverage UP state government's interest subventions.", icon: Clock },
              { title: "Certified Document Reviews", desc: "Our document verification officers check spellings, database entries, and signatures to avoid portal reject risks.", icon: Shield },
              { title: "Enterprise CRM Tracker", desc: "Follow every milestone in real-time. Dynamic timeline tracking, transaction logs, and auto status reminders via WhatsApp.", icon: CheckCircle },
              { title: "Bank Submission Files", desc: "Get highly organized PDF files of your complete loan application docket to present to public or local commercial banks.", icon: FileCheck }
            ].map((srv, idx) => {
              const SrvIcon = srv.icon;
              return (
                <div key={idx} className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <SrvIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-950">{srv.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{srv.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= APPLICATION JOURNEY TIMELINE ================= */}
        <section className="space-y-8">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Workflow</p>
            <h2 className="text-3xl font-black text-slate-950">Your Application Journey</h2>
            <p className="mt-2 text-sm text-slate-500">8 streamlined visual steps from online file submission to final bank representation support.</p>
          </div>

          <div className="relative mx-auto max-w-5xl rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "Step 1", title: "Document Upload", desc: "Select required scanned cards and proofs on our portal." },
                { step: "Step 2", title: "CRM Lead Created", desc: "Dedicated assistant gets mapped to compile your file." },
                { step: "Step 3", title: "Data Verification", desc: "Certified officer reviews scan files and business classifications." },
                { step: "Step 4", title: "DPR Formulation", desc: "Certified analysts draft the Detailed Project Report (DPR)." },
                { step: "Step 5", title: "MSME Registration", desc: "Udyam registration is completed on the national portal." },
                { step: "Step 6", title: "Docket Review", desc: "Final validation of your compiled loan subvention application." },
                { step: "Step 7", title: "Official Submission", desc: "Complete docket uploaded to government scheme portals." },
                { step: "Step 8", title: "Bank Presentation", desc: "Assistance to present your prepared file at commercial banks." }
              ].map((item, idx) => (
                <div key={idx} className="relative rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-blue-600/30 uppercase">{item.step}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{idx + 1}</div>
                  <h3 className="mt-4 text-xs font-extrabold text-slate-950">{item.title}</h3>
                  <p className="mt-1.5 text-[10px] leading-normal text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= DOCUMENT UPLOAD MODULE & CRM INTEGRATION ================= */}
        <section id="uploader" className="scroll-mt-6">
          <div className="mx-auto max-w-4xl grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-stretch">
            
            {/* Drag & Drop Upload Panel */}
            <div className="glass-panel rounded-[2rem] p-6 md:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Portal Uploader</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Document Upload Module</h2>
                <p className="mt-1 text-xs leading-normal text-slate-500">Securely submit scanning copies to initiate dockets formulation on the enterprise CRM.</p>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleFileUpload(Array.from(e.dataTransfer.files));
                    }
                  }}
                  className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center hover:bg-blue-50/10 hover:border-blue-400 transition"
                >
                  <UploadCloud className="h-10 w-10 text-blue-600" />
                  <p className="mt-3 text-xs font-extrabold text-slate-800">Drag & Drop Scans Here</p>
                  <p className="mt-1 text-[10px] text-slate-500">PDF, JPG, or PNG up to 5MB size</p>
                  <label className="mt-4 inline-flex h-8 items-center justify-center rounded-full bg-blue-600 px-4 text-xs font-bold text-white shadow hover:bg-blue-700 cursor-pointer transition">
                    Browse Files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files) {
                          handleFileUpload(Array.from(e.target.files));
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Selected File list */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Selected Documents</p>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs shadow-sm">
                        <span className="flex items-center gap-2 font-bold text-slate-700 truncate">
                          <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{file.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress and submit buttons */}
              {selectedFiles.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {isUploading ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-extrabold text-blue-700">
                        <span>Uploading scans and creating CRM record...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : leadCreated ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-center text-xs font-extrabold text-emerald-800">
                      ✅ CRM Lead & Document Records Saved Successfully!
                    </div>
                  ) : (
                    <button
                      onClick={handleStartSimulatedUpload}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 text-xs font-extrabold text-white shadow hover:scale-[1.01] transition"
                    >
                      Start Secure Document Verification
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* STATEFUL CRM TRACKER WIDGET */}
            <div className="liquid-card rounded-[2rem] border border-blue-50/70 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Enterprise CRM</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Application Status Tracker</h2>
                <p className="mt-1 text-xs leading-normal text-slate-500">Interactive live status monitor linked with database events.</p>

                {/* Status Timeline */}
                <div className="mt-6 space-y-4">
                  {[
                    { step: 1, label: "Lead Created", desc: "CRM system registered candidate details." },
                    { step: 2, label: "Documents Pending", desc: "Scanned credentials uploads required." },
                    { step: 3, label: "Documents Received", desc: "Files logged inside secure data storage." },
                    { step: 4, label: "Project Report Prepared", desc: "DPR drafted by expert credit officer." },
                    { step: 5, label: "Submitted", desc: "Complete docket uploaded to UP Scheme portals." },
                    { step: 6, label: "Under Review", desc: "Awaiting bank processing subvention checks." },
                    { step: 7, label: "Completed", desc: "Subsidized business credit successfully mapped!" }
                  ].map(milestone => {
                    const isCompleted = currentTrackerStep >= milestone.step;
                    const isActive = currentTrackerStep === milestone.step;
                    return (
                      <div key={milestone.step} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black transition ${
                              isCompleted
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}
                          >
                            {isCompleted ? "✓" : milestone.step}
                          </div>
                          {milestone.step < 7 && (
                            <div
                              className={`h-6 w-0.5 transition ${
                                isCompleted ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="-mt-0.5">
                          <h4
                            className={`text-xs font-extrabold transition ${
                              isActive ? "text-blue-700" : isCompleted ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {milestone.label}
                          </h4>
                          {isActive && (
                            <p className="mt-0.5 text-[10px] leading-normal text-slate-500">
                              {milestone.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status advancement simulator (strictly for user presentation) */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Interactive Demo</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={currentTrackerStep === 1}
                    onClick={() => setCurrentTrackerStep(prev => Math.max(1, prev - 1))}
                    className="inline-flex h-7 w-12 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition"
                  >
                    Prev
                  </button>
                  <button
                    disabled={currentTrackerStep === 7}
                    onClick={() => setCurrentTrackerStep(prev => Math.min(7, prev + 1))}
                    className="inline-flex h-7 w-12 items-center justify-center rounded bg-blue-50 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ================= CUSTOMER REVIEWS TESTIMONIAL CAROUSEL ================= */}
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Testimonials</p>
            <h2 className="text-3xl font-black text-slate-950">Customer Success Stories</h2>
            <p className="mt-2 text-sm text-slate-500">Read inspiring stories of young UP entrepreneurs who successfully leveraged subventions.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Preeti Singh",
                loc: "Gorakhpur",
                role: "Boutique Owner",
                text: "I was extremely confused about how to formulate a Detailed Project Report (DPR) for my garments boutique. DigiConnect Dukan's advisors prepared a flawless cost sheet which got my CM YUVA file checked and approved within weeks!",
                img: IMAGES.successStories
              },
              {
                name: "Rahul Vishwakarma",
                loc: "Varanasi",
                role: "Furniture Workshop",
                text: "MSME registration support and document filings were handled cleanly. The CRM timeline tracker sent status updates directly to my WhatsApp, letting me track bank submission dates instantly. Excellent digital support!",
                img: IMAGES.msmeSupport
              },
              {
                name: "Anas Ahmed",
                loc: "Aligarh",
                role: "Mobile Retail Outlet",
                text: "Secured my retail loan subvention docket support smoothly. The step-by-step eligibility checker wizard evaluated my background instantly. Absolute enterprise-grade professional consulting services.",
                img: IMAGES.computerCenter
              }
            ].map((review, idx) => (
              <article key={idx} className="liquid-card rounded-3xl border border-slate-100 p-5 md:p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-orange-500">
                    {"★★★★★".split("").map((star, i) => (
                      <span key={i} className="text-base">★</span>
                    ))}
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-slate-600 italic">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                    <Image
                      src={review.img}
                      alt={review.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{review.name}</h4>
                    <p className="text-[10px] text-slate-500">{review.role} • {review.loc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ================= FAQ SECTION accordion ================= */}
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Common Doubts</p>
            <h2 className="text-3xl font-black text-slate-950">Frequently Asked Questions</h2>
            <p className="mt-2 text-sm text-slate-500">20+ detailed answers designed to clarify all CM YUVA support guidelines.</p>
          </div>

          <div className="mx-auto max-w-4xl space-y-2.5">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setOpenFaqIndex(isOpen ? null : index);
                      triggerAnalyticsEvent("faq_accordion_click", { question: faq.q });
                    }}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none"
                  >
                    <span className="text-xs font-extrabold text-slate-950 sm:text-sm">{faq.q}</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition-transform">
                      {isOpen ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="border-t border-slate-50 px-5 pb-4 pt-3 text-xs leading-relaxed text-slate-500">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= RELATED SERVICES SECTION ================= */}
        <section className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Cross-filings</p>
            <h2 className="text-3xl font-black text-slate-950">Related Financial Services</h2>
            <p className="mt-2 text-sm text-slate-500">Explore linked business compliance filings and tax registrations.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "MSME Registration", desc: "Register Udyam Micro certificate online.", slug: "msme-registration" },
              { title: "PMEGP Loan Assistance", desc: "Project dockets for national subsidies.", slug: "pmegp-loan" },
              { title: "GST Registration Support", desc: "Secure official tax license certificates.", slug: "gst-registration-filing" },
              { title: "Business Credit Cards", desc: "Apply for top banking current credits.", slug: "credit-cards" }
            ].map((related, idx) => (
              <Link
                key={idx}
                href={`/services/${related.slug}`}
                onClick={() => triggerAnalyticsEvent("related_service_click", { slug: related.slug })}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-blue-200 transition duration-150"
              >
                <h3 className="text-sm font-extrabold text-slate-950 group-hover:text-blue-700">{related.title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-normal">{related.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 group-hover:underline">
                  Learn More
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ================= FINAL CTA CONVERSION BANNER ================= */}
        <section className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 md:p-12 text-white relative text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.18),transparent_40%)]" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to Start Your Business Journey?</h2>
            <p className="text-xs font-semibold leading-relaxed text-slate-400 sm:text-sm">
              Don&apos;t let complex dockets hold back your enterprise dreams. Access expert documentation reviews, certified project reports, and seamless CRM application subventions today.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row justify-center pt-2">
              <a
                href="#uploader"
                onClick={() => triggerAnalyticsEvent("final_cta_apply_now")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-extrabold text-slate-950 shadow-md hover:bg-slate-100 transition"
              >
                Apply Online Now
                <ArrowRight className="h-3.5 w-3.5 text-slate-950" />
              </a>
              <a
                href="https://wa.me/917007595931?text=Hello,%20I%20am%20ready%20to%20apply%20for%20CM%20YUVA%20loan%20assistance."
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerAnalyticsEvent("whatsapp_consultation_click", { location: "final_cta" })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-xs font-extrabold text-white transition hover:bg-[#20ba56]"
              >
                <MessageCircle className="h-4 w-4 text-white" />
                WhatsApp Consultation
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
