"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Send, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";

type TemplateItem = {
  key: string;
  name: string;
  category: string;
  language: string;
  bodyParams: string[];
  suggestedBody?: string;
};

// Known registry templates
const REGISTRY_TEMPLATES: TemplateItem[] = [
  {
    key: "application_update",
    name: "application_status",
    category: "UTILITY",
    language: "hi",
    bodyParams: ["Customer Name", "Service Name", "Application Reference", "Status Detail"],
    suggestedBody:
      "Hello {{1}}, DigiConnect Dukan mein aapki {{2}} application ke sambandh mein important update hai. Aapki application reference number {{3}} ka current status: {{4}}.",
  },
];

export function InboxTemplatePicker({
  customerName,
  isOpen,
  onClose,
  onSendTemplate,
  sending,
}: {
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSendTemplate: (templateName: string, templateKey: string, params: string[]) => Promise<void>;
  sending: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<string>("application_update");
  const [params, setParams] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const currentTemplate = REGISTRY_TEMPLATES.find((t) => t.key === selectedKey) || REGISTRY_TEMPLATES[0];

  useEffect(() => {
    if (isOpen && currentTemplate) {
      // Initialize params with customer name as param 0 if available
      const initial = currentTemplate.bodyParams.map((p, idx) => {
        if (idx === 0 && customerName && customerName !== "WhatsApp Customer") {
          return customerName;
        }
        return "";
      });
      setParams(initial);
      setError("");
    }
  }, [isOpen, selectedKey, customerName, currentTemplate]);

  if (!isOpen) return null;

  const handleParamChange = (index: number, val: string) => {
    setParams((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSend = async () => {
    setError("");
    const missingIdx = params.findIndex((p) => !p.trim());
    if (missingIdx !== -1) {
      setError(`Please enter a value for ${currentTemplate.bodyParams[missingIdx]}`);
      return;
    }

    try {
      await onSendTemplate(currentTemplate.name, currentTemplate.key, params);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send template");
    }
  };

  // Preview body with parameters replaced
  let previewText = currentTemplate.suggestedBody || "";
  params.forEach((val, idx) => {
    const placeholder = `{{${idx + 1}}}`;
    previewText = previewText.replace(placeholder, val || `[${currentTemplate.bodyParams[idx]}]`);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Send WhatsApp Template</h3>
              <p className="text-[11px] text-slate-500">
                Pre-approved Meta templates for service notifications & updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Template Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Select Approved Template
            </label>
            <div className="grid gap-2">
              {REGISTRY_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedKey(t.key)}
                  className={cn(
                    "flex items-start justify-between rounded-xl border p-3 text-left transition",
                    selectedKey === t.key
                      ? "border-[#1268e8] bg-blue-50/50 shadow-2xs"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      {t.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Language: {t.language.toUpperCase()} • Category: {t.category}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Meta Approved
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Parameters Form */}
          <div className="space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Fill Template Variables
            </span>
            <div className="space-y-2">
              {currentTemplate.bodyParams.map((label, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    {"{{" + (idx + 1) + "}}"} {label}
                  </label>
                  <input
                    type="text"
                    value={params[idx] || ""}
                    onChange={(e) => handleParamChange(idx, e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1268e8] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Customer Message Preview
            </span>
            <div className="rounded-xl border border-slate-200 bg-[#d9fdd3] p-3 text-xs text-slate-900 shadow-2xs whitespace-pre-wrap leading-relaxed">
              {previewText}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1268e8] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0b4fb8] transition disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending Template..." : "Send Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
