"use client";
 
import { useState, useTransition, type FormEvent } from "react";
import { Plus, Save, Trash2, AlertCircle, Loader2 } from "lucide-react";
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

type CscOlympiadConfig = {
  session?: string;
  lastDate?: string;
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
  };
  notifications?: string[];
  subjects?: Subject[];
  faqs?: FAQ[];
  testimonials?: Testimonial[];
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
];

export function CscOlympiadCmsForm({
  serviceId,
  categoryId,
  currentConfig
}: CmsFormProps) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  // Load configuration details from parsed DB state or defaults
  const [session, setSession] = useState(currentConfig.session ?? "2026-2027");
  const [lastDate, setLastDate] = useState(currentConfig.lastDate ?? "October 31, 2026");
  
  const [price, setPrice] = useState<number>(currentConfig.registrationFee?.price ?? 150);
  const [offerPrice, setOfferPrice] = useState<number>(currentConfig.registrationFee?.offerPrice ?? 100);
  const [offerText, setOfferText] = useState(currentConfig.registrationFee?.offerText ?? "Introductory discount of ₹50 per subject");

  const [heroTitle, setHeroTitle] = useState(currentConfig.hero?.title ?? "CSC Olympiad Registration 2026");
  const [heroSubtitle, setHeroSubtitle] = useState(currentConfig.hero?.subtitle ?? "Empowering students from Class 3 to 12 through competitive learning and digital excellence.");

  const [notifications, setNotifications] = useState<string[]>(currentConfig.notifications ?? [
    "Registration for Academic Session 2026-27 is now open.",
    "Mock tests are available for registered students to practice."
  ]);

  const [subjects, setSubjects] = useState<Subject[]>(currentConfig.subjects ?? defaultSubjects);
  const [faqs, setFaqs] = useState<FAQ[]>(currentConfig.faqs ?? []);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(currentConfig.testimonials ?? []);

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

    const nextConfig = {
      session,
      lastDate,
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
      },
      notifications: notifications.filter(Boolean),
      subjects,
      faqs: faqs.filter(f => f.question && f.answer),
      testimonials: testimonials.filter(t => t.name && t.text),
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

  return (
    <form onSubmit={handleSaveConfig} className="grid gap-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      
      {/* Dates and pricing */}
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
          <div className="space-y-1.5 sm:col-span-2 md:col-span-4">
            <label className="text-xs font-bold text-slate-700">Offer Text *</label>
            <Input value={offerText} onChange={e => setOfferText(e.target.value)} placeholder="Promo code details or offer banners" required />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="rounded-xl border border-slate-100 p-4 space-y-4">
        <h3 className="font-bold text-slate-900 border-b pb-2">Hero Banner Details</h3>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Hero Main Title *</label>
            <Input value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="Main title" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Hero Subheading *</label>
            <Textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Empowering text" required />
          </div>
        </div>
      </div>

      {/* Notices */}
      <div className="rounded-xl border border-slate-100 p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-slate-900">Marquee Notices</h3>
          <Button type="button" variant="outline" onClick={addNotice} size={"sm" as unknown as "default"} className="cursor-pointer">
            <Plus className="h-4 w-4" /> Add Notice
          </Button>
        </div>
        <div className="grid gap-3">
          {notifications.map((notice, index) => (
            <div key={index} className="flex gap-2">
              <Input value={notice} onChange={e => updateNotice(index, e.target.value)} placeholder="Alert description" />
              <Button type="button" variant="outline" onClick={() => removeNotice(index)} className="text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="rounded-xl border border-slate-100 p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-slate-900">Olympiad Subjects Mapping</h3>
          <Button type="button" variant="outline" onClick={addSubject} size={"sm" as unknown as "default"} className="cursor-pointer">
            <Plus className="h-4 w-4" /> Add Subject
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Lucide Icon name</label>
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
                    <option value="ShieldAlert">Shield (Cyber)</option>
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
                    <label key={cls} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border px-2.5 py-1 rounded-md cursor-pointer hover:border-slate-300">
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

              <Button type="button" variant="outline" onClick={() => removeSubject(index)} className="text-red-500 justify-self-end mt-2 cursor-pointer">
                <Trash2 className="h-4 w-4" /> Remove Subject
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="rounded-xl border border-slate-100 p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-slate-900">FAQ Accordion (Min 20 FAQs)</h3>
          <Button type="button" variant="outline" onClick={addFaq} size={"sm" as unknown as "default"} className="cursor-pointer">
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
        </div>
        
        {faqs.length < 20 && (
          <div className="p-3 rounded-lg border border-orange-100 bg-orange-50/50 flex items-center gap-2 text-xs font-semibold text-orange-800">
            <AlertCircle className="h-4.5 w-4.5 text-orange-600 shrink-0" />
            <span>Currently showing {faqs.length} FAQs. You need at least 20 FAQs to meet requirements.</span>
          </div>
        )}

        <div className="grid gap-4">
          {faqs.map((faq, index) => (
            <div key={index} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/50 grid gap-2">
              <span className="text-[10px] font-black text-slate-400">FAQ #{index + 1}</span>
              <Input value={faq.question} onChange={e => updateFaq(index, "question", e.target.value)} placeholder="Question" />
              <Textarea value={faq.answer} onChange={e => updateFaq(index, "answer", e.target.value)} placeholder="Answer" className="min-h-16" />
              <Button type="button" variant="outline" onClick={() => removeFaq(index)} className="text-red-500 justify-self-start cursor-pointer">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="rounded-xl border border-slate-100 p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-slate-900">Testimonials Carousel</h3>
          <Button type="button" variant="outline" onClick={addTestimonial} size={"sm" as unknown as "default"} className="cursor-pointer">
            <Plus className="h-4 w-4" /> Add Testimonial
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
              <Button type="button" variant="outline" onClick={() => removeTestimonial(index)} className="text-red-500 justify-self-start cursor-pointer">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

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
