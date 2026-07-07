"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, MessageSquare, Mail, Sparkles, Sliders, Settings, Code, Plus, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

interface TemplateItem {
  id: string;
  name: string;
  key: string;
  type: "whatsapp" | "email";
  body: string;
}

export default function AdminCoreConfigurationPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"templates" | "ai" | "constants">("templates");

  // Template States
  const [templates, setTemplates] = useState<TemplateItem[]>([
    {
      id: "tpl-1",
      name: "GST Renewal Reminder",
      key: "gst_renewal_whatsapp",
      type: "whatsapp",
      body: "Hello {{customer_name}}, your GST filing for the current quarter is due soon. Please click the link to file instantly: https://digiconnect.in/pay/{{application_id}}"
    },
    {
      id: "tpl-2",
      name: "Passport Application Verification",
      key: "passport_verified_email",
      type: "email",
      body: "Dear {{customer_name}},\n\nWe have verified your documents for application ID {{application_id}}. The status is now set to {{status}}.\n\nThank you,\nDigiConnect Operations Team"
    }
  ]);
  const [activeTemplateIdx, setActiveTemplateIdx] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI Prompts States
  const [aiCompanionPrompt, setAiCompanionPrompt] = useState(
    "You are the DigiConnect V5 Citizen Assistant. Help user select the best government registration packages based on their target profile (Student, Business, Farmer)."
  );
  const [aiDocPrompt, setAiDocPrompt] = useState(
    "Verify uploaded Aadhaar/PAN scans. Extract full name, DOB, ID number and flag if image contains watermarks or blur."
  );

  // Global Constants
  const [defaultGst, setDefaultGst] = useState(18);
  const [settlementDelay, setSettlementDelay] = useState(2);
  const [kycExpiryDays, setKycExpiryDays] = useState(30);

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;

    const activeTpl = templates[activeTemplateIdx];
    const newBody = text.substring(0, startPos) + tag + text.substring(endPos);

    setTemplates(
      templates.map((tpl, i) => (i === activeTemplateIdx ? { ...tpl, body: newBody } : tpl))
    );

    // Reposition cursor after tag insertion
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + tag.length;
      textarea.selectionEnd = startPos + tag.length;
    }, 10);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success("Core Configuration variables saved to system registry!");
    }, 800);
  };

  // Simulate rendering placeholder values
  const getSimulatedPreview = (bodyText: string) => {
    return bodyText
      .replace(/\{\{customer_name\}\}/g, "Amit Sharma")
      .replace(/\{\{service_name\}\}/g, "GST Registration")
      .replace(/\{\{application_id\}\}/g, "APP-9875412")
      .replace(/\{\{status\}\}/g, "Document Approved")
      .replace(/\{\{amount\}\}/g, "₹1,500");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/admin/settings")}
            className="group inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to console settings
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-heading">
              Core Configuration Engine
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase tracking-widest animate-pulse">
              <Sparkles className="h-2.5 w-2.5" /> Cockpit Console
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Centrally manage communication templates, AI model instruction prompts, and tax constants without writing code.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-750 disabled:bg-indigo-300 shadow-md shadow-indigo-900/10 hover:shadow-lg transition-all"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Changes..." : "Save Engine Variables"}
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/50 p-1.5 rounded-2xl gap-1.5 max-w-md">
        <button
          onClick={() => setSelectedTab("templates")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            selectedTab === "templates"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Communication Templates
        </button>
        <button
          onClick={() => setSelectedTab("ai")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            selectedTab === "ai"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI Prompt Controls
        </button>
        <button
          onClick={() => setSelectedTab("constants")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            selectedTab === "constants"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Sliders className="h-4 w-4" />
          System Constants
        </button>
      </div>

      {/* Main configuration content area */}
      <div className="animate-in fade-in-50 duration-200">
        {selectedTab === "templates" && (
          <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
            {/* List and template editor */}
            <div className="space-y-6">
              {/* Left Form: Edit template */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Message Template Configurator
                  </h3>
                  <select
                    value={activeTemplateIdx}
                    onChange={(e) => setActiveTemplateIdx(Number(e.target.value))}
                    className="text-xs font-bold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg"
                  >
                    {templates.map((tpl, idx) => (
                      <option key={tpl.id} value={idx}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Template Technical Key</label>
                  <input
                    type="text"
                    value={templates[activeTemplateIdx].key}
                    onChange={(e) =>
                      setTemplates(
                        templates.map((t, idx) =>
                          idx === activeTemplateIdx ? { ...t, key: e.target.value } : t
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-blue-500 bg-slate-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-700">Template Message Body</label>
                    {/* Tags Injector Buttons */}
                    <div className="flex gap-1.5">
                      {["{{customer_name}}", "{{service_name}}", "{{application_id}}", "{{status}}", "{{amount}}"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => insertTag(tag)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black py-1 px-1.5 rounded-md border border-indigo-100 transition"
                          >
                            +{tag.replace(/[{}]/g, "")}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={templates[activeTemplateIdx].body}
                    onChange={(e) =>
                      setTemplates(
                        templates.map((t, idx) =>
                          idx === activeTemplateIdx ? { ...t, body: e.target.value } : t
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-hidden focus:border-blue-500 h-36 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Right: Mock Phone Simulator for templates */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Mock Dispatch Simulator
              </h3>

              {templates[activeTemplateIdx].type === "whatsapp" ? (
                /* Simulated WhatsApp Device */
                <div className="border border-slate-200 rounded-3xl overflow-hidden bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover shadow-sm p-4 relative aspect-video sm:aspect-square flex flex-col justify-between">
                  {/* Fake top sender bar */}
                  <div className="bg-slate-900/90 text-white rounded-2xl p-2 flex items-center gap-2 mb-auto shadow-xs backdrop-blur-xs">
                    <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center font-black text-[10px]">
                      D
                    </div>
                    <div>
                      <span className="text-[10px] font-black block leading-none">DigiConnect Alerts</span>
                      <span className="text-[8px] font-semibold text-slate-400">Verified Business Account</span>
                    </div>
                  </div>

                  {/* Chat bubble using state formatting */}
                  <div className="bg-white rounded-2xl p-3 max-w-[85%] self-start shadow-xs relative border border-slate-100/50 mt-6 mb-auto text-[10px] leading-relaxed text-slate-800 font-semibold font-sans">
                    {getSimulatedPreview(templates[activeTemplateIdx].body)}
                    <span className="block text-[8px] text-right text-slate-400 font-bold mt-1">11:58 AM</span>
                  </div>

                  <span className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest mt-auto">
                    Simulated WhatsApp Alert
                  </span>
                </div>
              ) : (
                /* Simulated Email Inbox */
                <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50 shadow-sm p-4 relative aspect-video sm:aspect-square flex flex-col">
                  <div className="bg-white border rounded-2xl p-4 space-y-3 flex-1 flex flex-col">
                    <div className="border-b border-slate-100 pb-2 space-y-1">
                      <span className="text-[9px] font-semibold text-slate-400 block">From: support@digiconnect.in</span>
                      <span className="text-[10px] font-black text-slate-900 block">Subject: {templates[activeTemplateIdx].name} Confirmation</span>
                    </div>
                    <div className="text-[10px] text-slate-650 leading-relaxed font-semibold flex-1 whitespace-pre-line py-2">
                      {getSimulatedPreview(templates[activeTemplateIdx].body)}
                    </div>
                    <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-slate-400">DigiConnect Mail Gateway</span>
                      <div className="h-2 w-2 rounded-full bg-indigo-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "ai" && (
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                AI Agent Model Prompts Engine
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Citizen Helper Chatbot Prompt System Instruction</label>
                <textarea
                  value={aiCompanionPrompt}
                  onChange={(e) => setAiCompanionPrompt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-hidden focus:border-blue-500 h-24 leading-relaxed bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Document Verification & OCR Extraction Prompt</label>
                <textarea
                  value={aiDocPrompt}
                  onChange={(e) => setAiDocPrompt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-hidden focus:border-blue-500 h-24 leading-relaxed bg-slate-50/50"
                />
              </div>
            </div>
          </div>
        )}

        {selectedTab === "constants" && (
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Settings className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Global System Constants & Registry Values
              </h3>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Default Service GST %</label>
                <input
                  type="number"
                  value={defaultGst}
                  onChange={(e) => setDefaultGst(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Razorpay Payout Settle Gap (Days)</label>
                <input
                  type="number"
                  value={settlementDelay}
                  onChange={(e) => setSettlementDelay(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">KYC Vault Expiry Warning Gap (Days)</label>
                <input
                  type="number"
                  value={kycExpiryDays}
                  onChange={(e) => setKycExpiryDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
