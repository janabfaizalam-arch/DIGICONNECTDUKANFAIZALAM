"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, Beaker, BookOpen, Laptop, Globe, Lightbulb, 
  ShieldAlert, Atom, FlaskConical, Activity, Hourglass, 
  Compass, LineChart, Briefcase, BarChart3, Brain, 
  HelpCircle, ChevronDown, User, Star, Quote, ArrowRight, Check
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Icon mapping helper
const subjectIcons: Record<string, any> = {
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

type InteractiveProps = {
  subjects: Subject[];
  classes: number[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  pricePerSubject: number;
  oldPricePerSubject?: number;
  applyPath: string;
  applyCtaLabel: string;
};

export function CscOlympiadInteractive({
  subjects,
  classes,
  testimonials,
  faqs,
  pricePerSubject,
  oldPricePerSubject,
  applyPath,
  applyCtaLabel
}: InteractiveProps) {
  const [selectedClass, setSelectedClass] = useState<number>(3);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Filter subjects that are available for the selected class
  const filteredSubjects = subjects.filter(subject => 
    subject.classes.includes(selectedClass)
  );

  // Dynamic price calculation details
  const [selectedCalcSubjects, setSelectedCalcSubjects] = useState<string[]>([]);
  
  const toggleCalcSubject = (id: string) => {
    if (selectedCalcSubjects.includes(id)) {
      setSelectedCalcSubjects(selectedCalcSubjects.filter(x => x !== id));
    } else {
      setSelectedCalcSubjects([...selectedCalcSubjects, id]);
    }
  };

  const calculatedTotal = selectedCalcSubjects.length * pricePerSubject;
  const calculatedOldTotal = oldPricePerSubject ? selectedCalcSubjects.length * oldPricePerSubject : 0;
  const calculatedSavings = calculatedOldTotal - calculatedTotal;

  // Frame motion helper transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-16">
      {/* SECTION: Interactive Class Selector & Dynamic Subjects Filter */}
      <section className="section-pad bg-white/20 backdrop-blur-md rounded-3xl border border-white/50 p-6 md:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 -bottom-32 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />
        
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Dynamic Curriculum</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">Available Subjects</h2>
          <p className="mt-3 text-sm text-slate-600">Select your class to view the eligible olympiad subjects for this academic year.</p>
        </div>

        {/* Classes Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 pb-2 overflow-x-auto no-scrollbar max-w-4xl mx-auto border-b border-slate-100">
          {classes.map((cls) => (
            <button
              key={cls}
              onClick={() => {
                setSelectedClass(cls);
                setSelectedCalcSubjects([]); // reset calculator on class change
              }}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 relative outline-none cursor-pointer",
                selectedClass === cls
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                  : "bg-white/60 hover:bg-white text-slate-700 border border-slate-200/50 hover:border-slate-300"
              )}
            >
              Class {cls}
              {selectedClass === cls && (
                <motion.span
                  layoutId="activeClassIndicator"
                  className="absolute inset-0 rounded-full border-2 border-blue-500/20 pointer-events-none"
                  transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Subjects Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={selectedClass}
          className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredSubjects.map((subject) => {
              const IconComp = subjectIcons[subject.icon] || Calculator;
              const isSelectedInCalc = selectedCalcSubjects.includes(subject.id);
              
              return (
                <motion.div
                  key={subject.id}
                  variants={itemVariants}
                  layout
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={cn(
                    "liquid-card rounded-2xl p-5 border cursor-pointer select-none transition-all duration-300 relative group overflow-hidden",
                    isSelectedInCalc 
                      ? "border-blue-500 bg-blue-50/40 shadow-md shadow-blue-500/5" 
                      : "border-slate-100/80 bg-white/70 hover:bg-white"
                  )}
                  onClick={() => toggleCalcSubject(subject.id)}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                      isSelectedInCalc 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-50 text-blue-700 group-hover:bg-blue-100 group-hover:scale-110"
                    )}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    
                    <div className={cn(
                      "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200",
                      isSelectedInCalc 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : "border-slate-300 text-transparent"
                    )}>
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  </div>
                  
                  <h3 className="mt-4 text-base font-extrabold text-slate-950">{subject.name}</h3>
                  <p className="mt-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class {selectedClass}</p>
                  
                  {/* Decorative glass light bar */}
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Pricing Calculator box integrated with dynamic selection */}
        {selectedCalcSubjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white border border-slate-700/50 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-900/30">
                  Live Calculator
                </span>
                <h3 className="text-xl font-bold mt-2.5">
                  Selected {selectedCalcSubjects.length} Subject{selectedCalcSubjects.length > 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md">
                  You have chosen: {selectedCalcSubjects.map(id => subjects.find(s => s.id === id)?.name).join(", ")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-slate-400 line-through text-sm">
                    {calculatedOldTotal ? `₹${calculatedOldTotal}` : ""}
                  </div>
                  <div className="text-2xl font-black text-white flex items-center gap-1.5">
                    ₹{calculatedTotal}
                    {calculatedSavings > 0 && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 px-2 py-0.5 rounded-md">
                        Save ₹{calculatedSavings}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Wallet redemption applicable at checkout</p>
                </div>

                <Link
                  href={`${applyPath}?subjects=${selectedCalcSubjects.join(",")}`}
                  className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {applyCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* SECTION: Testimonials Glass Carousel */}
      <section className="section-pad relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Student & Parent Trust</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">Testimonials</h2>
          <p className="mt-3 text-sm text-slate-600">Real feedback from parents, students, and educators across India.</p>
        </div>

        <div className="max-w-4xl mx-auto px-4 relative">
          <div className="overflow-hidden py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                className="glass-liquid-premium rounded-3xl p-8 md:p-12 shadow-xl border border-white/60 relative overflow-hidden bg-white/70"
              >
                <Quote className="absolute -right-4 -top-4 h-36 w-36 text-slate-100 opacity-60 pointer-events-none" />
                <div className="flex items-center gap-1.5 text-orange-500 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                
                <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-700 italic relative z-10">
                  "{testimonials[currentTestimonial].text}"
                </p>
                
                <div className="mt-8 flex items-center gap-4 relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-950">{testimonials[currentTestimonial].name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{testimonials[currentTestimonial].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer outline-none",
                  currentTestimonial === index ? "w-8 bg-blue-600" : "w-2 bg-slate-300 hover:bg-slate-400"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: FAQ Accordion */}
      <section className="section-pad">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Got Questions?</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">Frequently Asked Questions</h2>
          <p className="mt-3 text-sm text-slate-600">Everything you need to know about eligibility, dates, and examinations.</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className={cn(
                  "rounded-2xl border transition-all duration-300 overflow-hidden bg-white/70 backdrop-blur-sm",
                  isOpen 
                    ? "border-blue-200/80 shadow-md bg-white shadow-blue-500/2" 
                    : "border-slate-100/80 hover:border-slate-200 hover:bg-white"
                )}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-slate-950 hover:text-blue-700 transition duration-200 cursor-pointer outline-none"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 shrink-0 text-blue-500 opacity-80" />
                    {faq.question}
                  </span>
                  <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-blue-600")} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-slate-600 border-t border-slate-50 pl-11">
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
    </div>
  );
}
