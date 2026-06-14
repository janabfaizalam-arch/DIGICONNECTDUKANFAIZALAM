"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Video,
  FileDown,
  Search,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  Download,
  Play,
  Clock,
  ShieldCheck,
  HelpCircle,
  Bookmark
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface SOPItem {
  id: string;
  title: string;
  category: "SOP Guides" | "Video Tutorials" | "Downloads / PDFs" | "Compliance / Policy";
  iconType: "book" | "video" | "pdf";
  durationOrSize: string;
  summary: string;
  tags: string[];
  contentMarkdown: string;
  steps?: string[];
  tips?: string[];
}

const KNOWLEDGE_ITEMS: SOPItem[] = [
  {
    id: "sop-1",
    title: "Complete Guide: CM Yuva Scheme Application",
    category: "SOP Guides",
    iconType: "book",
    durationOrSize: "6 min read",
    summary: "Step-by-step procedure to file the Chief Minister Yuva Scheme application correctly, avoiding common rejection reasons.",
    tags: ["Scheme", "SOP", "Government"],
    steps: [
      "Gather customer's income certificate (should be less than 2.5 LPA) and resident proof.",
      "Navigate to applications page and click 'New Application'. Select CM Yuva Scheme.",
      "Enter personal metadata, bank IFSC details carefully. Cross-check name matches bank passbook exactly.",
      "Upload signature image (under 100kb, JPEG) and passbook copy (under 500kb, PDF).",
      "Pay the processing fee from your partner wallet. Confirm invoice.",
      "Check application tracker regularly for status changes from 'submitted' to 'under review'."
    ],
    tips: [
      "Mismatch between bank account name and Aadhaar name is the #1 reason for Yuva Scheme rejection.",
      "Verify the income certificate issuance date. It must be within the current financial year."
    ],
    contentMarkdown: "The Chief Minister Yuva Scheme is aimed at offering direct financial support and skill-training allowances to eligible youth. As a DigiPartner, it is vital to check age limits (18-35 years) and residence certifications prior to payment submission."
  },
  {
    id: "sop-2",
    title: "DigiPartner Portal Video Walkthrough",
    category: "Video Tutorials",
    iconType: "video",
    durationOrSize: "12 mins",
    summary: "A full-screen walkthrough explaining how to use the wallet, submit applications, check commissions, and resolve customer ticket queries.",
    tags: ["Walkthrough", "Onboarding", "Video"],
    steps: [
      "Dashboard Tour: Understanding today's revenue, ledger balance and performance charts.",
      "Services Engine: Pinning favorite services and using recents list to reduce click latency.",
      "Submitting an application: Pre-filling customer data, drag-and-drop document upload.",
      "Wallet management: Integrating Razorpay for quick digital balance recharges.",
      "Lead CRM: Tracking client leads, changing stages, and triggering immediate conversions.",
      "Support Console: How to lodge a ticket and upload compliance proofs."
    ],
    tips: [
      "Save the Services page to your mobile home screen for immediate field entry.",
      "Setup low-wallet reminders to never miss an application deadline."
    ],
    contentMarkdown: "Watch this comprehensive video guide to master the partner dashboard. Rohan from Support takes you from logging in for the first time to verifying commissions, ledger records, and customer logs."
  },
  {
    id: "sop-3",
    title: "PDF Checklist: Correct Document Formats for GST Return",
    category: "Downloads / PDFs",
    iconType: "pdf",
    durationOrSize: "1.4 MB (PDF)",
    summary: "A one-page PDF checklist of mandatory invoices, bills, and declarations required for filing monthly/quarterly GST returns.",
    tags: ["GST", "Checklist", "PDF"],
    steps: [
      "GSTR-1: Inward sales records, invoice numbers, tax rates (5%, 12%, 18%, 28%).",
      "GSTR-3B: Consolidated summary of outward sales, tax liability, and Input Tax Credit (ITC) claimable.",
      "Aadhaar linkage confirmation of the proprietor/directors.",
      "PAN Card verification details matching state registration portal logs.",
      "Self-declaration template signed by compliance auditor."
    ],
    tips: [
      "Invoices must show both CGST/SGST (for local) or IGST (for interstate transactions).",
      "Upload all invoices in standard Excel or CSV sheets to expedite automated processing."
    ],
    contentMarkdown: "Filing GST return correctly ensures compliance and protects your clients from penalties. This PDF contains the checklist format used by our premium accountancy experts to file GST returns on time."
  },
  {
    id: "sop-4",
    title: "Understanding Wallet Balance & Weekly Settlements",
    category: "Compliance / Policy",
    iconType: "book",
    durationOrSize: "4 min read",
    summary: "Details about how payout cycle works, automated TDS deductions, GST invoices, and how to verify bank transfers.",
    tags: ["Wallet", "Settlements", "Finance"],
    steps: [
      "Commissions are calculated instantly upon application completion and displayed in your ledger.",
      "Partner earnings accumulate throughout the week (Monday through Sunday).",
      "Automated payouts are triggered every Tuesday morning directly to your registered settlement bank account.",
      "A standard 5% TDS deduction is applied as per government tax regulations. You can download Form 16 from Profile settings.",
      "Invoices for services are emailed to your partner address at the end of each billing cycle."
    ],
    tips: [
      "Ensure your PAN is verified under profile settings to prevent high tax bracket deductions (20%).",
      "Payouts can take up to 24-48 business hours to reflect in bank accounts depending on bank cycles."
    ],
    contentMarkdown: "DigiConnect Dukan maintains transparent ledger accounts. Every transaction is accounted for. Track your earnings log, view TDS details, and manage bank account links straight from the wallet console."
  },
  {
    id: "sop-5",
    title: "Marketing Kit: Banners & WhatsApp Templates",
    category: "Downloads / PDFs",
    iconType: "pdf",
    durationOrSize: "8.5 MB (ZIP)",
    summary: "Download official DigiConnect Dukan promotional banners, flyers, and pre-written WhatsApp messages to attract retail customers.",
    tags: ["Marketing", "Banners", "Growth"],
    steps: [
      "Download and extract the ZIP kit on your device.",
      "Choose from 12+ banner resolutions optimized for WhatsApp, Instagram, Facebook, and storefront printing.",
      "Locate pre-drafted WhatsApp templates in English, Hindi, and regional languages.",
      "Insert your custom partner link, contact number, and shop address in the placeholder brackets.",
      "Send to customer broadcast lists to advertise direct local availability of PAN, GST, and Government services."
    ],
    tips: [
      "Print and display the official DigiConnect Dukan agent poster near your counter to build trust.",
      "Post daily updates on WhatsApp status to remind clients about upcoming filing/scheme deadlines."
    ],
    contentMarkdown: "Attract more clients to your retail counter. This marketing bundle is professionally designed to showcase the wide catalog of digital government services you can deliver instantly."
  },
  {
    id: "sop-6",
    title: "Video Guide: Resolving Blurry KYC Document Rejections",
    category: "Video Tutorials",
    iconType: "video",
    durationOrSize: "4 mins",
    summary: "Short tutorial on how to compress and crop Aadhaar and PAN certificates without losing text clarity.",
    tags: ["KYC", "Compliance", "Video"],
    steps: [
      "How to use free mobile apps to scan docs under proper ambient lighting.",
      "Cropping margins to eliminate background noise (e.g. bedsheets, tables).",
      "Compressing files while maintaining 300 DPI resolution for compliance OCR.",
      "Matching photo profiles with government database records."
    ],
    tips: [
      "Never upload passport-size photo selfies. Always upload scanned documents directly.",
      "Check that margins aren't cut off. The full boundary lines of Aadhaar cards must be visible."
    ],
    contentMarkdown: "Reduce rejection rates significantly by mastering simple mobile document scanning. Avoid shadows, glares, and blurry borders to ensure instant verification success."
  }
];

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeItem, setActiveItem] = useState<SOPItem | null>(null);

  // Filter logic
  const filteredItems = KNOWLEDGE_ITEMS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-indigo-400" />;
      case "pdf":
        return <FileDown className="h-5 w-5 text-amber-400" />;
      default:
        return <BookOpen className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Rebranding */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Training & SOP Portal
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              DigiPartner Knowledge Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Access training videos, standard operating procedures, documentation checklists, and marketing assets.
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex gap-4">
            <Card className="border border-white/5 bg-slate-900/40 px-4 py-2.5 rounded-xl backdrop-blur-md text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available SOPs</p>
              <p className="text-xl font-extrabold text-white">12+</p>
            </Card>
            <Card className="border border-white/5 bg-slate-900/40 px-4 py-2.5 rounded-xl backdrop-blur-md text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Video Guides</p>
              <p className="text-xl font-extrabold text-indigo-400">5</p>
            </Card>
          </div>
        </div>

        {/* Filter & Search Bar Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Categories Tab */}
          <div className="md:col-span-8 flex flex-wrap gap-1.5">
            {["All", "SOP Guides", "Video Tutorials", "Downloads / PDFs", "Compliance / Policy"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-md"
                    : "bg-slate-900/30 border-white/5 text-slate-400 hover:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search tutorials, GST, KYC checklists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl bg-slate-900/40 pl-10 pr-4 text-xs font-semibold text-slate-200 placeholder-slate-500 border border-white/5 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Knowledge Resource Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.length === 0 ? (
            <div className="col-span-full border border-dashed border-white/10 bg-slate-900/10 p-12 text-center rounded-3xl">
              <HelpCircle className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-3 text-base font-bold text-slate-400">No resources found</p>
              <p className="text-xs text-slate-500 mt-1.5">Try searching with alternative tags or choose another filter category.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Card
                key={item.id}
                className="group relative border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 transition-all duration-200 p-5 rounded-2xl flex flex-col justify-between hover:border-white/10 hover:shadow-lg hover:shadow-indigo-950/5 cursor-pointer"
                onClick={() => setActiveItem(item)}
              >
                <div className="space-y-4">
                  {/* Category icon and duration badge */}
                  <div className="flex justify-between items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 border border-white/5 group-hover:border-white/10 transition-colors">
                      {getIcon(item.iconType)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Clock className="h-3 w-3" />
                      {item.durationOrSize}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-white text-base leading-snug group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {/* Footer tags and Link */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-slate-950 border border-white/5 text-[9px] font-semibold text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Access <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Interactive PDF & Marketing Asset Callout Box */}
        <div className="grid gap-6 md:grid-cols-2 pt-4">
          <Card className="border border-white/5 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950 p-6 rounded-2xl flex flex-col md:flex-row gap-5 items-start justify-between">
            <div className="space-y-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bookmark className="h-5 w-5" />
              </span>
              <h3 className="font-extrabold text-white text-lg">Partner Operational Toolkit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download printable customer receipts, offline consent declarations, offline service logbooks, and commission slab brochures.
              </p>
            </div>
            <a
              href="#"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 border border-white/5 hover:bg-slate-900 px-4 font-bold text-white transition-all text-xs shrink-0 self-end md:self-center"
            >
              <Download className="h-3.5 w-3.5" /> Download Toolkit (12 MB)
            </a>
          </Card>

          <Card className="border border-white/5 bg-gradient-to-br from-amber-950/10 via-slate-900/40 to-slate-950 p-6 rounded-2xl flex flex-col md:flex-row gap-5 items-start justify-between">
            <div className="space-y-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="font-extrabold text-white text-lg">June Marketing Flyers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get promotional posters optimized for WhatsApp statuses and direct printing. Drive foot traffic and digital submissions.
              </p>
            </div>
            <a
              href="#"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 font-bold text-white transition-all text-xs shrink-0 self-end md:self-center"
            >
              <Download className="h-3.5 w-3.5" /> Download Flyers (8.5 MB)
            </a>
          </Card>
        </div>

        {/* Detailed Article Reader Overlay (Drawer Modal) */}
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/85 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl h-full border-l border-white/10 bg-slate-900 shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-350">
              
              {/* Close and Title Section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {activeItem.category}
                  </span>
                  <button
                    onClick={() => setActiveItem(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-white transition-all"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                    {activeItem.title}
                  </h2>
                  <p className="text-sm font-semibold text-slate-300 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-white/5">
                    {activeItem.summary}
                  </p>
                </div>

                {/* Article Steps Walkthrough */}
                {activeItem.steps && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-400" /> Walkthrough Steps
                    </h3>
                    <ol className="space-y-3">
                      {activeItem.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-xs font-medium text-slate-300 leading-relaxed">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 font-mono">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Pro Tips Section */}
                {activeItem.tips && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" /> Compliance Pro Tips
                    </h3>
                    <div className="space-y-2">
                      {activeItem.tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 text-xs text-amber-300/90 leading-relaxed font-semibold">
                          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <p>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Content Markdown Placeholder */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Summary Analysis</p>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    {activeItem.contentMarkdown}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Footer */}
              <div className="mt-8 pt-4 border-t border-white/5 flex gap-3">
                {activeItem.iconType === "video" ? (
                  <button className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 font-bold text-white transition-all text-xs shadow-md">
                    <Play className="h-4.5 w-4.5 fill-current" /> Watch Video Tutorial (12:00)
                  </button>
                ) : activeItem.iconType === "pdf" ? (
                  <button className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 px-6 font-bold text-white transition-all text-xs shadow-md">
                    <Download className="h-4.5 w-4.5" /> Download Document ({activeItem.durationOrSize})
                  </button>
                ) : (
                  <button className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 font-bold text-white transition-all text-xs shadow-md">
                    <BookOpen className="h-4.5 w-4.5" /> Mark SOP Read
                  </button>
                )}
                
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-6 h-11 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/5 text-xs font-bold text-slate-400 transition-all"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
