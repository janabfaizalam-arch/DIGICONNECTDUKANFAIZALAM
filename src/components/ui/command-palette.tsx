"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Mic, MicOff, Sparkles, X, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  title: string;
  slug: string;
  category: string;
  type: "service" | "package";
  description: string;
}

// Hardcoded search dataset representing V5 Enterprise offerings
const items: SearchResult[] = [
  { title: "GST Registration & Compliance", slug: "gst-registration", category: "Tax", type: "service", description: "Regular, Composition schemes registration." },
  { title: "Passport Application Assistance", slug: "passport", category: "Gov ID", type: "service", description: "Fresh, Tatkaal, and Minor passport slots." },
  { title: "ITR Filing & Tax Planning", slug: "itr-filing", category: "Tax", type: "service", description: "ITR1, ITR2, ITR3, ITR4, ITR-U returns." },
  { title: "Driving Licence Application", slug: "driving-licence", category: "Licence", type: "service", description: "Learner, Permanent, Renewal, International." },
  { title: "PAN Card Registration", slug: "pan-card", category: "Gov ID", type: "service", description: "New individual PAN, correction, lost reprint." },
  { title: "Aadhaar Services", slug: "aadhaar-services", category: "Gov ID", type: "service", description: "Address, HOF, biometric, and DOB updates." },
  { title: "GST & Business Launch Starter", slug: "gst-starter-bundle", category: "Bundles", type: "package", description: "GST + MSME registration package." }
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const recognitionRef = useRef<unknown>(null);

  // Hotkey listener for CMD+K / CTRL+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter search results
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  // Voice Search / Speech Recognition setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const windowObj = window as unknown as Record<string, unknown>;
      const SpeechRecognition = (windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition) as new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onstart: () => void;
        onend: () => void;
        onresult: (event: unknown) => void;
        start: () => void;
        stop: () => void;
      };
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: unknown) => {
          const ev = event as { results: { [key: number]: { [key: number]: { transcript: string } } } };
          const transcript = ev.results[0][0].transcript;
          setQuery(transcript);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert("Voice search is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const recognition = recognitionRef.current as { start: () => void; stop: () => void };
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    if (result.type === "package") {
      router.push(`/combo/${result.slug}`);
    } else {
      router.push(`/services/${result.slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Trigger floating button on home/header */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl hover:bg-slate-900 transition active:scale-95 border border-slate-800"
        title="Search Command Palette (Ctrl+K)"
      >
        <Search className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-white shadow-2xl backdrop-blur-xl"
              onKeyDown={handleKeyDown}
            >
              {/* Search bar */}
              <div className="relative flex items-center border-b border-white/5 pb-3">
                <Search className="absolute left-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search government services, documentation, bundles..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent pl-11 pr-24 py-2.5 text-sm font-semibold outline-hidden placeholder-slate-500"
                />

                <div className="absolute right-2 flex items-center gap-2">
                  {/* Voice Button */}
                  <button
                    onClick={toggleVoiceSearch}
                    className={`p-2 rounded-xl transition ${
                      isListening ? "bg-red-500/20 text-red-400" : "hover:bg-white/5 text-slate-400"
                    }`}
                    title="Voice Search"
                  >
                    {isListening ? <MicOff className="h-4.5 w-4.5 animate-pulse" /> : <Mic className="h-4.5 w-4.5" />}
                  </button>

                  {/* AI search indicator */}
                  <div className="hidden sm:flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-black tracking-wider text-indigo-400 uppercase">
                    <Sparkles className="h-3 w-3" /> AI Ready
                  </div>

                  {/* Close button */}
                  <button onClick={() => setIsOpen(false)} className="p-1 text-slate-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Dynamic results list */}
              <div className="mt-3 max-h-80 overflow-y-auto">
                {results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <div
                        key={result.slug}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 cursor-pointer transition ${
                          idx === selectedIndex ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{result.category}</span>
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-black text-slate-300 uppercase">
                              {result.type}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-white mt-1">{result.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate leading-snug">{result.description}</p>
                        </div>

                        {idx === selectedIndex && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-450 bg-slate-950/20 px-2 py-1 rounded-lg">
                            <span>Select</span>
                            <CornerDownLeft className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : query ? (
                  <div className="p-6 text-center text-slate-500 font-semibold text-sm">
                    No services or bundles matched your search. Try &ldquo;GST&rdquo; or &ldquo;Passport&rdquo;.
                  </div>
                ) : (
                  <div>
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">Recommended Services</h5>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.slice(0, 4).map((item) => (
                        <div
                          key={item.slug}
                          onClick={() => handleSelect(item)}
                          className="flex flex-col justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition hover:bg-white/10"
                        >
                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase">{item.category}</span>
                            <h4 className="text-xs font-extrabold text-white mt-1">{item.title}</h4>
                          </div>
                          <p className="text-[10px] text-slate-450 mt-1 leading-snug">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
