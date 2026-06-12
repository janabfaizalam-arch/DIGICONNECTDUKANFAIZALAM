"use client";
 
import { useState, useTransition, type FormEvent } from "react";
import { Plus, Save, Trash2, AlertCircle, Loader2, Award, Calendar, Layers, Users, BookOpen, Star } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
 
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
  session?: string;
  lastDate?: string;
  countdownDate?: string;
  registrationFee?: {
    price?: number;
    discount?: number;
    offerPrice?: number;
    offerText?: string;
  };
  hero?: {
    title?: string;
    subtitle?: string;
    image?: string;
    brochureUrl?: string;
    dateSheetUrl?: string;
  };
  notifications?: string[];
  stats?: StatsConfig;
  subjects?: Subject[];
  faqs?: FAQ[];
  testimonials?: Testimonial[];
  examCalendar?: ExamCalendarEvent[];
  rewards?: RewardsConfig;
  winners?: WinnerRecord[];
  gallery?: GalleryItem[];
  toggles?: TogglesConfig;
};
 
type CmsFormProps = {
  serviceId: string;
  categoryId: string;
  currentConfig: CscOlympiadConfig;
};
 
const defaultSubjects: Subject[] = [
  { id: "maths", name: "Mathematics", icon: "Calculator", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "science", name: "Science", icon: "Beaker", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "english", name: "English", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "hindi", name: "Hindi", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "computer", name: "Computer Science", icon: "Laptop", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "gk", name: "General Knowledge", icon: "Globe", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "reasoning", name: "Logical Reasoning", icon: "Lightbulb", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "cyber", name: "Cyber Safety", icon: "ShieldAlert", classes: [9,10] },
  { id: "physics", name: "Physics", icon: "Atom", classes: [11,12] },
  { id: "chemistry", name: "Chemistry", icon: "FlaskConical", classes: [11,12] },
  { id: "biology", name: "Biology", icon: "Activity", classes: [11,12] },
  { id: "history", name: "History", icon: "Hourglass", classes: [11,12] },
  { id: "geography", name: "Geography", icon: "Compass", classes: [11,12] },
  { id: "economics", name: "Economics", icon: "LineChart", classes: [11,12] },
  { id: "business", name: "Business Studies", icon: "Briefcase", classes: [11,12] },
  { id: "accountancy", name: "Accountancy", icon: "BarChart3", classes: [11,12] },
  { id: "psychology", name: "Psychology", icon: "Brain", classes: [11,12] },
];

const defaultStats: StatsConfig = {
  classes: "Classes 3–12",
  subjects: "17 Subjects",
  mediums: "10 Mediums",
  priceLabel: "₹299 per subject",
  registrations: "15 lakh+",
  participation: "3,60,000+",
  states: "36 States & UT",
};

const defaultRewards: RewardsConfig = {
  topper1st: "₹30,000",
  topper2nd: "₹20,000",
  topper3rd: "₹10,000",
  school1st: "1st ₹1,00,000",
  school2nd: "2nd ₹75,000",
  school3rd: "3rd ₹25,000",
  notes: "Scholarships and School Awards are subject to national ranking percentiles. Conditions apply.",
};

const defaultToggles: TogglesConfig = {
  hero: true,
  stats: true,
  whyChoose: true,
  explorer: true,
  mediumChart: true,
  preparation: true,
  examMode: true,
  calendar: true,
  rewards: true,
  winners: true,
  gallery: true,
  timeline: true,
  blogs: true,
  contact: true,
};

const defaultCalendar: ExamCalendarEvent[] = [
  { subject: "English / Hindi / GK / Logical Reasoning / Computer / Cyber Safety", phase1: "Nov 15 - Nov 20, 2026", phase2: "Dec 10 - Dec 15, 2026", timeWindow: "09:00 AM - 06:00 PM IST", notes: "Students can choose time slot in the portal" },
  { subject: "Mathematics / Science / Physics / Chemistry / Biology / History / Geography / Accountancy / Economics", phase1: "Nov 22 - Nov 30, 2026", phase2: "Dec 18 - Dec 28, 2026", timeWindow: "09:00 AM - 06:00 PM IST", notes: "Webcam proctor active during test" }
];

export function CscOlympiadCmsForm({
  serviceId,
  categoryId,
  currentConfig
}: CmsFormProps) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<string>("general");

  // Load configuration details from parsed DB state or defaults
  const [session, setSession] = useState(currentConfig.session ?? "2026-2027");
  const [lastDate, setLastDate] = useState(currentConfig.lastDate ?? "October 31, 2026");
  const [countdownDate, setCountdownDate] = useState(currentConfig.countdownDate ?? "2026-10-31T23:59:59");
  
  const [price, setPrice] = useState<number>(currentConfig.registrationFee?.price ?? 399);
  const [offerPrice, setOfferPrice] = useState<number>(currentConfig.registrationFee?.offerPrice ?? 299);
  const [offerText, setOfferText] = useState(currentConfig.registrationFee?.offerText ?? "Special facilitation pricing. Discount of ₹100 per subject");

  const [heroTitle, setHeroTitle] = useState(currentConfig.hero?.title ?? "CSC Olympiad Registration 2026");
  const [heroSubtitle, setHeroSubtitle] = useState(currentConfig.hero?.subtitle ?? "Empowering Young Minds through competitive learning, digital literacy and academic excellence.");
  const [brochureUrl, setBrochureUrl] = useState(currentConfig.hero?.brochureUrl ?? "/docs/csc-olympiad/brochure.pdf");
  const [dateSheetUrl, setDateSheetUrl] = useState(currentConfig.hero?.dateSheetUrl ?? "/docs/csc-olympiad/datesheet.pdf");

  const [notifications, setNotifications] = useState<string[]>(currentConfig.notifications ?? [
    "Registration for Academic Session 2026-27 is now open.",
    "Mock tests are available for registered students to practice."
  ]);

  const [stats, setStats] = useState<StatsConfig>(currentConfig.stats ?? defaultStats);
  const [subjects, setSubjects] = useState<Subject[]>(currentConfig.subjects ?? defaultSubjects);
  const [faqs, setFaqs] = useState<FAQ[]>(currentConfig.faqs ?? []);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(currentConfig.testimonials ?? []);
  
  const [examCalendar, setExamCalendar] = useState<ExamCalendarEvent[]>(currentConfig.examCalendar ?? defaultCalendar);
  const [rewards, setRewards] = useState<RewardsConfig>(currentConfig.rewards ?? defaultRewards);
  const [winners, setWinners] = useState<WinnerRecord[]>(currentConfig.winners ?? []);
  const [gallery, setGallery] = useState<GalleryItem[]>(currentConfig.gallery ?? []);
  const [toggles, setToggles] = useState<TogglesConfig>(currentConfig.toggles ?? defaultToggles);

  // Stats input handler
  const updateStat = (field: keyof StatsConfig, val: string) => {
    setStats({ ...stats, [field]: val });
  };

  // Rewards input handler
  const updateReward = (field: keyof RewardsConfig, val: string) => {
    setRewards({ ...rewards, [field]: val });
  };

  // Section toggle handler
  const toggleSection = (field: keyof TogglesConfig) => {
    setToggles({ ...toggles, [field]: !toggles[field] });
  };

  // Notice handlers
  const addNotice = () => setNotifications([...notifications, ""]);
  const updateNotice = (index: number, val: string) => {
    setNotifications(notifications.map((n, i) => i === index ? val : n));
  };
  const removeNotice = (index: number) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  // FAQ Handlers
  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const updateFaq = (index: number, field: keyof FAQ, val: string) => {
    setFaqs(faqs.map((faq, i) => i === index ? { ...faq, [field]: val } : faq));
  };
  const removeFaq = (index: number) => setFaqs(faqs.filter((_, i) => i !== index));

  // Testimonial Handlers
  const addTestimonial = () => setTestimonials([...testimonials, { name: "", role: "", text: "" }]);
  const updateTestimonial = (index: number, field: keyof Testimonial, val: string) => {
    setTestimonials(testimonials.map((t, i) => i === index ? { ...t, [field]: val } : t));
  };
  const removeTestimonial = (index: number) => setTestimonials(testimonials.filter((_, i) => i !== index));

  // Calendar event Handlers
  const addCalendarEvent = () => setExamCalendar([...examCalendar, { subject: "", phase1: "", phase2: "", timeWindow: "", notes: "" }]);
  const updateCalendarEvent = (index: number, field: keyof ExamCalendarEvent, val: string) => {
    setExamCalendar(examCalendar.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };
  const removeCalendarEvent = (index: number) => setExamCalendar(examCalendar.filter((_, i) => i !== index));

  // Winner Handlers
  const addWinner = () => setWinners([...winners, { id: `win-${Date.now()}`, photo: "", name: "", class: "", subject: "", rank: "", state: "", year: "2025" }]);
  const updateWinner = (index: number, field: keyof WinnerRecord, val: string) => {
    setWinners(winners.map((win, i) => i === index ? { ...win, [field]: val } : win));
  };
  const removeWinner = (index: number) => setWinners(winners.filter((_, i) => i !== index));

  // Gallery Item Handlers
  const addGalleryItem = () => setGallery([...gallery, { url: "", title: "", category: "Winners", year: "2025", sortOrder: 10, active: true }]);
  const updateGalleryItem = (index: number, field: keyof GalleryItem, val: string | number | boolean) => {
    setGallery(gallery.map((item, i) => i === index ? { ...item, [field]: val } as GalleryItem : item));
  };
  const removeGalleryItem = (index: number) => setGallery(gallery.filter((_, i) => i !== index));

  // Subject Handlers
  const addSubject = () => setSubjects([...subjects, { id: "", name: "", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] }]);
  const updateSubject = (index: number, field: keyof Subject, val: Subject[keyof Subject]) => {
    setSubjects(subjects.map((sub, i) => i === index ? { ...sub, [field]: val } : sub) as Subject[]);
  };
  const toggleSubjectClass = (index: number, cls: number) => {
    setSubjects(subjects.map((sub, i) => {
      if (i !== index) return sub;
      const classes = sub.classes.includes(cls)
        ? sub.classes.filter(x => x !== cls)
        : [...sub.classes, cls].sort((a,b) => a - b);
      return { ...sub, classes };
    }));
  };
  const removeSubject = (index: number) => setSubjects(subjects.filter((_, i) => i !== index));

  // Submit Handler
  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    
    // validation
    if (subjects.some(s => !s.id || !s.name)) {
      toastError("All subjects must have an ID and a Name.");
      return;
    }

    const nextConfig: CscOlympiadConfig = {
      session,
      lastDate,
      countdownDate,
      registrationFee: {
        price,
        discount: price - offerPrice,
        offerPrice,
        offerText,
      },
      hero: {
        title: heroTitle,
        subtitle: heroSubtitle,
        image: "/images/services/csc-olympiad/hero.webp",
        brochureUrl,
        dateSheetUrl,
      },
      notifications: notifications.filter(Boolean),
      stats,
      subjects,
      faqs: faqs.filter(f => f.question && f.answer),
      testimonials: testimonials.filter(t => t.name && t.text),
      examCalendar: examCalendar.filter(c => c.subject),
      rewards,
      winners: winners.filter(w => w.name),
      gallery: gallery.filter(g => g.url),
      toggles,
    };

    const formData = new FormData();
    formData.set("categoryId", categoryId);
    formData.set("title", "CSC Olympiad");
    formData.set("slug", "csc-olympiad");
    formData.set("shortDescription", heroSubtitle);
    formData.set("overview", heroSubtitle);
    formData.set("basePrice", String(price));
    formData.set("salePrice", String(offerPrice));
    formData.set("priceLabel", `₹${offerPrice}`);
    formData.set("isActive", "true");
    formData.set("status", "published");
    formData.set("blogContent", JSON.stringify(nextConfig));
    formData.set("ctaType", "apply");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${serviceId}`, {
          method: "PATCH",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to update configuration.");
        }

        success("CSC Olympiad settings updated successfully.");
        window.location.href = "/admin/services";
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Could not save configuration.");
      }
    });
  };

  const tabClass = (tabName: string) => 
    `px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
      activeTab === tabName 
        ? "bg-slate-900 border-slate-950 text-white shadow-sm" 
        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <form onSubmit={handleSaveConfig} className="grid gap-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      
      {/* Navigation Tabs bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        <button type="button" onClick={() => setActiveTab("general")} className={tabClass("general")}>
          <Layers className="h-3.5 w-3.5" /> General & Hero
        </button>
        <button type="button" onClick={() => setActiveTab("stats")} className={tabClass("stats")}>
          <Calendar className="h-3.5 w-3.5" /> Stats & Schedule
        </button>
        <button type="button" onClick={() => setActiveTab("subjects")} className={tabClass("subjects")}>
          <BookOpen className="h-3.5 w-3.5" /> Subjects Mappings
        </button>
        <button type="button" onClick={() => setActiveTab("rewards")} className={tabClass("rewards")}>
          <Award className="h-3.5 w-3.5" /> Rewards & Toggles
        </button>
        <button type="button" onClick={() => setActiveTab("winners")} className={tabClass("winners")}>
          <Users className="h-3.5 w-3.5" /> Winners & Gallery
        </button>
        <button type="button" onClick={() => setActiveTab("reviews")} className={tabClass("reviews")}>
          <Star className="h-3.5 w-3.5" /> FAQ & Reviews
        </button>
      </div>

      {/* Tab content 1: General & Hero info */}
      {activeTab === "general" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Pricing & Session Details</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Academic Session *</label>
                <Input value={session} onChange={e => setSession(e.target.value)} placeholder="e.g. 2026-2027" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Last Date to Register *</label>
                <Input value={lastDate} onChange={e => setLastDate(e.target.value)} placeholder="e.g. October 31, 2026" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Standard Price (₹) *</label>
                <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Offer Price (₹) *</label>
                <Input type="number" value={offerPrice} onChange={e => setOfferPrice(Number(e.target.value))} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Countdown Deadline Date (ISO Format) *</label>
                <Input type="text" value={countdownDate} onChange={e => setCountdownDate(e.target.value)} placeholder="e.g. 2026-10-31T23:59:59" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Offer Tagline *</label>
                <Input value={offerText} onChange={e => setOfferText(e.target.value)} placeholder="Offer text" required />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Hero Layout Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Hero Main Title *</label>
                <Input value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="Main title" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Hero Subheading *</label>
                <Textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Empowering text" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Brochure Download PDF Path/Link *</label>
                <Input value={brochureUrl} onChange={e => setBrochureUrl(e.target.value)} placeholder="/docs/csc-olympiad/brochure.pdf" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Date Sheet PDF Path/Link *</label>
                <Input value={dateSheetUrl} onChange={e => setDateSheetUrl(e.target.value)} placeholder="/docs/csc-olympiad/datesheet.pdf" required />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">Header Notices / Marquee</h3>
              <Button type="button" variant="outline" onClick={addNotice} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Notice
              </Button>
            </div>
            <div className="grid gap-3">
              {notifications.map((notice, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={notice} onChange={e => updateNotice(index, e.target.value)} placeholder="Banner announcement alert description" />
                  <Button type="button" variant="outline" onClick={() => removeNotice(index)} className="text-red-500 cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 2: Stats & Calendars */}
      {activeTab === "stats" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Trust Stats Strip Metrics</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Classes Range Label</label>
                <Input value={stats.classes} onChange={e => updateStat("classes", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Subjects Count Label</label>
                <Input value={stats.subjects} onChange={e => updateStat("subjects", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mediums Count Label</label>
                <Input value={stats.mediums} onChange={e => updateStat("mediums", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Facilitation Price Label</label>
                <Input value={stats.priceLabel} onChange={e => updateStat("priceLabel", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Journey Registrations Label</label>
                <Input value={stats.registrations} onChange={e => updateStat("registrations", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Participation Counter Label</label>
                <Input value={stats.participation} onChange={e => updateStat("participation", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">States coverage Label</label>
                <Input value={stats.states} onChange={e => updateStat("states", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">Exam Phase Calendars</h3>
              <Button type="button" variant="outline" onClick={addCalendarEvent} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Schedule Event
              </Button>
            </div>
            <div className="grid gap-4">
              {examCalendar.map((cal, index) => (
                <div key={index} className="p-4 rounded-lg bg-slate-50 border border-slate-150 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Subjects Group *</label>
                      <Input value={cal.subject} onChange={e => updateCalendarEvent(index, "subject", e.target.value)} placeholder="e.g. Maths, Science" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phase 1 Dates *</label>
                      <Input value={cal.phase1} onChange={e => updateCalendarEvent(index, "phase1", e.target.value)} placeholder="e.g. Nov 15-20, 2026" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phase 2 Dates *</label>
                      <Input value={cal.phase2} onChange={e => updateCalendarEvent(index, "phase2", e.target.value)} placeholder="e.g. Dec 10-15, 2026" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Time Window *</label>
                      <Input value={cal.timeWindow} onChange={e => updateCalendarEvent(index, "timeWindow", e.target.value)} placeholder="e.g. 10:00 AM - 04:00 PM" required />
                    </div>
                    <div className="space-y-1 sm:col-span-2 md:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Schedules Footnote / Instructions</label>
                      <Input value={cal.notes} onChange={e => updateCalendarEvent(index, "notes", e.target.value)} placeholder="e.g. Select slot during admit card download" />
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => removeCalendarEvent(index)} className="text-red-500 justify-self-start mt-2 cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete Row
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 3: Subjects selector */}
      {activeTab === "subjects" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">Olympiad Subjects Mapping</h3>
              <Button type="button" variant="outline" onClick={addSubject} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject
              </Button>
            </div>
            <div className="grid gap-4">
              {subjects.map((sub, index) => (
                <div key={index} className="p-4 rounded-lg bg-slate-50 border border-slate-150 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Subject Slug / ID *</label>
                      <Input value={sub.id} onChange={e => updateSubject(index, "id", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="e.g. maths" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Subject Name *</label>
                      <Input value={sub.name} onChange={e => updateSubject(index, "name", e.target.value)} placeholder="e.g. Mathematics" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lucide Icon Name</label>
                      <select 
                        value={sub.icon} 
                        onChange={e => updateSubject(index, "icon", e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold outline-none bg-white"
                      >
                        <option value="Calculator">Calculator (Maths)</option>
                        <option value="Beaker">Beaker (Science)</option>
                        <option value="BookOpen">Book (Languages)</option>
                        <option value="Laptop">Laptop (Computers)</option>
                        <option value="Globe">Globe (GK)</option>
                        <option value="Lightbulb">Lightbulb (Reasoning)</option>
                        <option value="ShieldAlert">Shield (Cyber / Safety)</option>
                        <option value="Atom">Atom (Physics)</option>
                        <option value="FlaskConical">Flask (Chemistry)</option>
                        <option value="Activity">Activity (Biology)</option>
                        <option value="Hourglass">Hourglass (History)</option>
                        <option value="Compass">Compass (Geography)</option>
                        <option value="LineChart">Chart (Economics)</option>
                        <option value="Briefcase">Briefcase (Business)</option>
                        <option value="BarChart3">BarChart (Accountancy)</option>
                        <option value="Brain">Brain (Psychology)</option>
                      </select>
                    </div>
                  </div>

                  {/* Class Checkboxes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Eligible Classes</label>
                    <div className="flex flex-wrap gap-2.5 mt-1.5">
                      {[3,4,5,6,7,8,9,10,11,12].map(cls => (
                        <label key={cls} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border px-2.5 py-1 rounded-md cursor-pointer hover:border-slate-300 select-none">
                          <input 
                            type="checkbox" 
                            checked={sub.classes.includes(cls)} 
                            onChange={() => toggleSubjectClass(index, cls)} 
                          />
                          Class {cls}
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button type="button" variant="outline" onClick={() => removeSubject(index)} className="text-red-500 justify-self-end mt-2 cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Remove Subject
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 4: Rewards & section Toggles */}
      {activeTab === "rewards" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Rewards & Scholarships configuration</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">National Topper 1st Prize Scholarship</label>
                <Input value={rewards.topper1st} onChange={e => updateReward("topper1st", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">National Topper 2nd Prize Scholarship</label>
                <Input value={rewards.topper2nd} onChange={e => updateReward("topper2nd", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">National Topper 3rd Prize Scholarship</label>
                <Input value={rewards.topper3rd} onChange={e => updateReward("topper3rd", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">National School Award 1st Prize</label>
                <Input value={rewards.school1st} onChange={e => updateReward("school1st", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">National School Award 2nd Prize</label>
                <Input value={rewards.school2nd} onChange={e => updateReward("school2nd", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">National School Award 3rd Prize</label>
                <Input value={rewards.school3rd} onChange={e => updateReward("school3rd", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
                <label className="text-xs font-bold text-slate-700">Scholarships Conditions / Footnote *</label>
                <Input value={rewards.notes} onChange={e => updateReward("notes", e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Public Page Section Visibility Toggles</h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(Object.keys(toggles) as Array<keyof TogglesConfig>).map((key) => (
                <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer select-none">
                  <span className="text-xs font-bold capitalize text-slate-800">{key.replace(/([A-Z])/g, " $1")} Section</span>
                  <div className="relative inline-flex items-center">
                    <input 
                      type="checkbox" 
                      checked={toggles[key]}
                      onChange={() => toggleSection(key)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 5: Winners & Gallery */}
      {activeTab === "winners" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">Dynamic National Winners List</h3>
              <Button type="button" variant="outline" onClick={addWinner} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Winner
              </Button>
            </div>
            <div className="grid gap-4">
              {winners.map((win, index) => (
                <div key={win.id} className="p-4 rounded-lg bg-slate-50 border border-slate-150 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Winner Full Name *</label>
                      <Input value={win.name} onChange={e => updateWinner(index, "name", e.target.value)} placeholder="Name" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Winner Photo Link / URL</label>
                      <Input value={win.photo} onChange={e => updateWinner(index, "photo", e.target.value)} placeholder="/images/winners/stu.jpg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Class *</label>
                      <Input value={win.class} onChange={e => updateWinner(index, "class", e.target.value)} placeholder="e.g. Class 8" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Olympiad Subject *</label>
                      <Input value={win.subject} onChange={e => updateWinner(index, "subject", e.target.value)} placeholder="e.g. Science" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">National Rank *</label>
                      <Input value={win.rank} onChange={e => updateWinner(index, "rank", e.target.value)} placeholder="e.g. Rank 1" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">State / District *</label>
                      <Input value={win.state} onChange={e => updateWinner(index, "state", e.target.value)} placeholder="e.g. Uttar Pradesh" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Year *</label>
                      <Input value={win.year} onChange={e => updateWinner(index, "year", e.target.value)} placeholder="e.g. 2025" required />
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => removeWinner(index)} className="text-red-500 justify-self-start mt-2 cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Remove Winner
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">JSON-Managed Gallery Items</h3>
              <Button type="button" variant="outline" onClick={addGalleryItem} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Image
              </Button>
            </div>
            <div className="grid gap-4">
              {gallery.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-slate-50 border border-slate-150 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Image URL *</label>
                      <Input value={item.url} onChange={e => updateGalleryItem(index, "url", e.target.value)} placeholder="/images/services/csc-olympiad/gallery1.webp" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Image Title</label>
                      <Input value={item.title} onChange={e => updateGalleryItem(index, "title", e.target.value)} placeholder="School Participation" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Category *</label>
                      <select 
                        value={item.category} 
                        onChange={e => updateGalleryItem(index, "category", e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold outline-none bg-white"
                      >
                        <option value="Winners">Winners</option>
                        <option value="Award Ceremony">Award Ceremony</option>
                        <option value="School Participation">School Participation</option>
                        <option value="Online Exam">Online Exam</option>
                        <option value="Students">Students</option>
                        <option value="Events">Events</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Year *</label>
                      <Input value={item.year} onChange={e => updateGalleryItem(index, "year", e.target.value)} placeholder="e.g. 2025" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Sort Order *</label>
                      <Input type="number" value={item.sortOrder} onChange={e => updateGalleryItem(index, "sortOrder", Number(e.target.value))} required />
                    </div>
                    <div className="space-y-1.5 flex items-end">
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border p-2.5 rounded-md cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={item.active} 
                          onChange={e => updateGalleryItem(index, "active", e.target.checked)} 
                        />
                        Active / Visible
                      </label>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => removeGalleryItem(index)} className="text-red-500 justify-self-start mt-2 cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete Image
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 6: FAQs and testimonials */}
      {activeTab === "reviews" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">FAQ Accordion (At least 20 FAQs recommended)</h3>
              <Button type="button" variant="outline" onClick={addFaq} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add FAQ
              </Button>
            </div>
            
            {faqs.length < 20 && (
              <div className="p-3 rounded-lg border border-orange-100 bg-orange-50/50 flex items-center gap-2 text-xs font-semibold text-orange-800">
                <AlertCircle className="h-4.5 w-4.5 text-orange-600 shrink-0" />
                <span>Currently showing {faqs.length} FAQs. We recommend at least 20 FAQs for a complete information portal.</span>
              </div>
            )}

            <div className="grid gap-4">
              {faqs.map((faq, index) => (
                <div key={index} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/50 grid gap-2">
                  <span className="text-[10px] font-black text-slate-400">FAQ #{index + 1}</span>
                  <Input value={faq.question} onChange={e => updateFaq(index, "question", e.target.value)} placeholder="Question" />
                  <Textarea value={faq.answer} onChange={e => updateFaq(index, "answer", e.target.value)} placeholder="Answer" className="min-h-16" />
                  <Button type="button" variant="outline" onClick={() => removeFaq(index)} className="text-red-500 justify-self-start cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">Testimonials Carousel</h3>
              <Button type="button" variant="outline" onClick={addTestimonial} className="cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Testimonial
              </Button>
            </div>
            <div className="grid gap-4">
              {testimonials.map((t, index) => (
                <div key={index} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/50 grid gap-2">
                  <span className="text-[10px] font-black text-slate-400">Testimonial #{index + 1}</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={t.name} onChange={e => updateTestimonial(index, "name", e.target.value)} placeholder="Person Name" />
                    <Input value={t.role} onChange={e => updateTestimonial(index, "role", e.target.value)} placeholder="Role (e.g. Student, Class 9 / Parent)" />
                  </div>
                  <Textarea value={t.text} onChange={e => updateTestimonial(index, "text", e.target.value)} placeholder="Review Content" className="min-h-16" />
                  <Button type="button" variant="outline" onClick={() => removeTestimonial(index)} className="text-red-500 justify-self-start cursor-pointer hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save action */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => window.location.href = "/admin/services"} className="cursor-pointer">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </div>

    </form>
  );
}
