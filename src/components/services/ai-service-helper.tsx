"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Bot, ShieldAlert, FileSearch, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DbService } from "@/lib/services";
import { safeCurrency } from "@/lib/admin-format";

interface AIServiceHelperProps {
  service: DbService;
}

export function AIServiceHelper({ service }: AIServiceHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string; actionType?: string }[]>([
    {
      role: "assistant",
      text: `Hello! I am your DigiConnect AI Assistant for ${service.title}. How can I assist you today?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple mock intelligence for handling questions based on service data
  const getAIResponse = (query: string): { text: string; actionType?: string } => {
    const q = query.toLowerCase();
    
    if (q.includes("document") || q.includes("paper") || q.includes("file")) {
      const docs = service.documents ? service.documents.join(", ") : "Aadhaar Card, PAN Card, Photo, Address Proof";
      return { text: `For ${service.title}, you will need to upload: ${docs}. All copies must be clear and legible.` };
    }
    
    if (q.includes("eligibility") || q.includes("apply") || q.includes("qualified")) {
      return {
        text: `Let's perform a quick eligibility check. Please tell me: What is your business type or state of residence? Or click below to run the check.`,
        actionType: "eligibility_form"
      };
    }

    if (q.includes("time") || q.includes("duration") || q.includes("days") || q.includes("fast")) {
      return { text: `The normal processing timeline for this service is approximately ${service.tat_hours || 72} Hours.` };
    }

    if (q.includes("price") || q.includes("cost") || q.includes("fee")) {
      const price = service.offer_price || service.sale_price || service.base_price || 0;
      return { text: `The total professional fee for ${service.title} is ${safeCurrency(price)}. Government fees and processing taxes are included unless marked extra.` };
    }

    if (q.includes("ocr") || q.includes("check my doc") || q.includes("verify document")) {
      return {
        text: `Sure, you can pre-validate your documents here before final application submission. Upload a copy of your Aadhaar or PAN Card below.`,
        actionType: "ocr_upload"
      };
    }

    return {
      text: `For ${service.title}, our system supports full online submission, Aadhaar OTP authentication, and Razorpay safe checkout. Is there a specific variant (like Tatkaal vs Normal) you need help choosing?`
    };
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInputValue("");
    setLoading(true);

    setTimeout(() => {
      const aiReply = getAIResponse(userText);
      setMessages((prev) => [...prev, { role: "assistant", text: aiReply.text, actionType: aiReply.actionType }]);
      setLoading(false);
    }, 800);
  };

  // Eligibility Mock Form State
  const [eligibilityState, setEligibilityState] = useState({ age: "", state: "", checked: false, passed: false });
  const runEligibilityCheck = () => {
    const isEligible = Number(eligibilityState.age) >= 18;
    setEligibilityState((prev) => ({ ...prev, checked: true, passed: isEligible }));
  };

  // OCR Upload State
  const [ocrState, setOcrState] = useState({ fileUploaded: false, analyzing: false, result: "" });
  const handleOcrMock = () => {
    setOcrState({ fileUploaded: true, analyzing: true, result: "" });
    setTimeout(() => {
      setOcrState({
        fileUploaded: true,
        analyzing: false,
        result: "✓ Aadhaar Verified: Name matches profile (Rajesh Kumar), DOB is valid, photo visibility is 98%."
      });
    }, 1500);
  };

  return (
    <>
      {/* Mini floating AI assistant launcher */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 py-3 text-white shadow-xl hover:shadow-indigo-500/10 transition active:scale-95 border border-indigo-500/10"
      >
        <Sparkles className="h-4 w-4 animate-spin text-amber-300" style={{ animationDuration: "3s" }} />
        <span className="text-xs font-black uppercase tracking-wider">Ask AI Assistant</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl backdrop-blur-xl md:w-[380px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md">
                  <Bot className="h-4.5 w-4.5 text-amber-300 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Service Companion AI</h4>
                  <p className="text-[9px] text-white/70">Online support assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    {m.role === "assistant" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white text-[10px] font-black">
                        AI
                      </div>
                    )}
                    <div>
                      <div
                        className={`rounded-2xl px-3 py-2.5 text-xs font-semibold leading-relaxed ${
                          m.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-white/5 border border-white/5 text-slate-200 rounded-tl-none"
                        }`}
                      >
                        {m.text}
                      </div>

                      {/* Dynamic forms injected by AI actions */}
                      {m.role === "assistant" && m.actionType === "eligibility_form" && (
                        <div className="mt-3 rounded-2xl bg-white/5 border border-white/5 p-3 space-y-3">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase">Eligibility Calculator</h5>
                          <div className="space-y-2">
                            <input
                              type="number"
                              placeholder="Enter your age"
                              value={eligibilityState.age}
                              onChange={(e) => setEligibilityState({ ...eligibilityState, age: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-hidden"
                            />
                            <input
                              type="text"
                              placeholder="Enter your state"
                              value={eligibilityState.state}
                              onChange={(e) => setEligibilityState({ ...eligibilityState, state: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-hidden"
                            />
                            <button
                              onClick={runEligibilityCheck}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold py-2 rounded-xl"
                            >
                              Check Eligibility
                            </button>
                          </div>

                          {eligibilityState.checked && (
                            <div className={`flex items-start gap-2 p-2 rounded-xl text-[10px] leading-snug font-bold ${
                              eligibilityState.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            }`}>
                              {eligibilityState.passed ? (
                                <>
                                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                                  <span>Passed! You qualify for {service.title}. You may proceed to click Apply.</span>
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                                  <span>Failed. Minimum age requirement is 18 years.</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {m.role === "assistant" && m.actionType === "ocr_upload" && (
                        <div className="mt-3 rounded-2xl bg-white/5 border border-white/5 p-3 text-center space-y-3">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase">Aadhaar / PAN Validator</h5>
                          {!ocrState.fileUploaded ? (
                            <div className="border border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition" onClick={handleOcrMock}>
                              <FileSearch className="h-6 w-6 text-slate-450 mb-1.5" />
                              <span className="text-[10px] text-slate-400 font-bold">Click to Upload Document</span>
                            </div>
                          ) : ocrState.analyzing ? (
                            <div className="flex items-center justify-center gap-2 p-2">
                              <div className="h-3 w-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                              <span className="text-[10px] text-slate-350">Extracting details via OCR...</span>
                            </div>
                          ) : (
                            <div className="text-left bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl text-[10px] leading-snug font-bold border border-emerald-500/25">
                              {ocrState.result}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white text-[10px] font-black">
                    AI
                  </div>
                  <div className="bg-white/5 border border-white/5 px-3 py-2 rounded-2xl rounded-tl-none flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="border-t border-white/5 p-3 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md">
              <input
                type="text"
                placeholder="Ask about price, documents, timelines..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                onClick={handleSend}
                className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-750 text-white transition active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
