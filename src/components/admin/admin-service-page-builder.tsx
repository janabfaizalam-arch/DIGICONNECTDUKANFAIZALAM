"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, ToggleLeft, ToggleRight, AlertCircle, RefreshCw, Layout, Edit3 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import type { AdminService, DbServiceSection, ServiceSectionType } from "@/lib/services";

interface AdminServicePageBuilderProps {
  service: AdminService;
}

const SECTION_TYPES: { value: ServiceSectionType; label: string }[] = [
  { value: "overview", label: "Service Overview" },
  { value: "benefits", label: "Benefits & Advantages" },
  { value: "documents", label: "Required Documents List" },
  { value: "process", label: "Step-by-Step Processing" },
  { value: "faq", label: "Frequently Asked Questions" },
  { value: "pricing", label: "Pricing Table Override" },
  { value: "stats", label: "Key Statistics Badge" },
  { value: "rich_text", label: "Rich Text blog guide" },
  { value: "video", label: "Video embed" },
  { value: "trust_badges", label: "Security & Trust Badges" }
];

export function AdminServicePageBuilder({ service }: AdminServicePageBuilderProps) {
  const { success, error } = useToast();
  const [sections, setSections] = useState<DbServiceSection[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch sections from API
  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${service.id}/sections`);
      if (!res.ok) throw new Error("Failed to load sections.");
      const json = await res.json();
      setSections(json.data || []);
      if (json.data && json.data.length > 0) {
        setSelectedIdx(0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sections.";
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [service.id, error]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Save layout back to API
  const handleSaveLayout = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/services/${service.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) throw new Error("Failed to save layout.");
      success("Landing page structure saved successfully!");
      fetchSections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save layout.";
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Reordering helpers
  const moveSection = (index: number, direction: "up" | "down") => {
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= sections.length) return;

    const nextSections = [...sections];
    const temp = nextSections[index];
    nextSections[index] = nextSections[nextIdx];
    nextSections[nextIdx] = temp;

    // Reset sort_order sequentially
    const updated = nextSections.map((sec, i) => ({
      ...sec,
      sort_order: (i + 1) * 10,
    }));

    setSections(updated);
    setSelectedIdx(nextIdx);
  };

  // Add new section template
  const addNewSection = (type: ServiceSectionType) => {
    let initialContent: Record<string, unknown> = {};

    if (type === "faq") {
      initialContent = { items: [{ question: "Is this service online?", answer: "Yes, our team processes it digitally." }] };
    } else if (type === "benefits") {
      initialContent = { items: ["Government verified certificate", "100% online tracking"] };
    } else if (type === "documents") {
      initialContent = { items: ["Aadhaar Card", "PAN Card", "Passport Photo"] };
    } else if (type === "process") {
      initialContent = { items: ["Submit details online", "Pay fee via Razorpay", "Documents verified by operator", "Certificate dispatch"] };
    } else if (type === "rich_text") {
      initialContent = { text: "Add comprehensive blog descriptions here..." };
    } else if (type === "video") {
      initialContent = { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" };
    } else if (type === "stats") {
      initialContent = { items: [{ label: "Happy Customers", value: "10K+" }, { label: "Approval Rate", value: "99%" }] };
    }

    const newSec: DbServiceSection = {
      id: crypto.randomUUID(),
      service_id: service.id,
      section_type: type,
      title: `New ${type.replace("_", " ")} Block`,
      subtitle: "Custom subsection guide",
      content: initialContent,
      sort_order: (sections.length + 1) * 10,
      is_active: true,
    };

    setSections([...sections, newSec]);
    setSelectedIdx(sections.length);
  };

  // Remove section
  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
    setSelectedIdx(null);
  };

  // Update fields of currently selected section
  const updateSelectedField = (fields: Partial<DbServiceSection>) => {
    if (selectedIdx === null) return;
    setSections(
      sections.map((sec, idx) => (idx === selectedIdx ? { ...sec, ...fields } : sec))
    );
  };

  // Dynamic Content Editor render block
  const renderContentEditor = (section: DbServiceSection) => {
    const type = section.section_type;

    if (type === "faq") {
      const items = Array.isArray(section.content?.items) ? section.content.items : [];
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-extrabold text-slate-700">FAQ List</label>
            <button
              onClick={() => {
                const nextItems = [...items, { question: "", answer: "" }];
                updateSelectedField({ content: { ...section.content, items: nextItems } });
              }}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              + Add Q&A
            </button>
          </div>
          {items.map((item: unknown, idx: number) => {
            const faqItem = item as { question?: string; answer?: string };
            return (
              <div key={idx} className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl space-y-2 relative">
                <input
                  type="text"
                  placeholder="Question"
                  value={faqItem.question || ""}
                  onChange={(e) => {
                    const nextItems = [...items];
                    (nextItems[idx] as Record<string, unknown>).question = e.target.value;
                    updateSelectedField({ content: { ...section.content, items: nextItems } });
                  }}
                  className="w-full text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                />
                <textarea
                  placeholder="Answer"
                  value={faqItem.answer || ""}
                  onChange={(e) => {
                    const nextItems = [...items];
                    (nextItems[idx] as Record<string, unknown>).answer = e.target.value;
                    updateSelectedField({ content: { ...section.content, items: nextItems } });
                  }}
                  className="w-full text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden h-14"
                />
                <button
                  onClick={() => {
                    const nextItems = items.filter((_: unknown, i: number) => i !== idx);
                    updateSelectedField({ content: { ...section.content, items: nextItems } });
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === "benefits" || type === "documents" || type === "process") {
      const items = Array.isArray(section.content?.items) ? section.content.items : [];
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-extrabold text-slate-700 capitalize">{type} List Items</label>
            <button
              onClick={() => {
                const nextItems = [...items, ""];
                updateSelectedField({ content: { ...section.content, items: nextItems } });
              }}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              + Add Item
            </button>
          </div>
          {items.map((item: unknown, idx: number) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder={`Item text...`}
                value={String(item)}
                onChange={(e) => {
                  const nextItems = [...items];
                  nextItems[idx] = e.target.value;
                  updateSelectedField({ content: { ...section.content, items: nextItems } });
                }}
                className="flex-1 text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
              <button
                onClick={() => {
                  const nextItems = items.filter((_: unknown, i: number) => i !== idx);
                  updateSelectedField({ content: { ...section.content, items: nextItems } });
                }}
                className="text-slate-400 hover:text-red-500 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (type === "rich_text") {
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700">Rich Text content</label>
          <textarea
            value={String(section.content?.text || "")}
            onChange={(e) => updateSelectedField({ content: { ...section.content, text: e.target.value } })}
            placeholder="Write markdown or guidance content here..."
            className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden h-40 leading-relaxed"
          />
        </div>
      );
    }

    if (type === "video") {
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700">Embed Video URL</label>
          <input
            type="text"
            value={String(section.content?.url || "")}
            onChange={(e) => updateSelectedField({ content: { ...section.content, url: e.target.value } })}
            placeholder="e.g. https://www.youtube.com/embed/video-id"
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          />
        </div>
      );
    }

    return (
      <div className="text-center p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-450">
        This block uses global service settings. No special custom contents needed.
      </div>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1.5fr]">
      {/* Left panel: section listing & ordering */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Drag & Drop Section Blocks</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Define which details should display and in what order.</p>
          </div>
          <button
            onClick={handleSaveLayout}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1 text-xs font-black rounded-xl transition"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Layout"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-xs text-slate-400 font-bold">Loading layout...</span>
          </div>
        ) : sections.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-xs font-extrabold text-slate-650">No custom landing sections published yet.</p>
            <button
              onClick={() => {
                addNewSection("overview");
                addNewSection("benefits");
                addNewSection("documents");
                addNewSection("process");
                addNewSection("faq");
              }}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold py-2 px-4 rounded-xl border border-indigo-100"
            >
              Initialize Default Sections
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                  selectedIdx === idx
                    ? "bg-indigo-50/50 border-indigo-500/30"
                    : "bg-slate-55/40 border-slate-100/60 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 w-5 text-right">{idx + 1}.</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border shadow-sm">
                    <Layout className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{sec.title || "Custom Block"}</h4>
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">{sec.section_type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Visibility toggle */}
                  <button
                    onClick={() => {
                      const next = [...sections];
                      next[idx].is_active = !next[idx].is_active;
                      setSections(next);
                    }}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    {sec.is_active ? (
                      <ToggleRight className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-350" />
                    )}
                  </button>
                  {/* Reordering buttons */}
                  <button
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, "up")}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(idx, "down")}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => removeSection(idx)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add section control panel */}
        <div className="border-t border-slate-50 pt-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Add New Block</label>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {SECTION_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => addNewSection(t.value)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[10px] font-black text-slate-750 transition"
              >
                <Plus className="h-3 w-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Editor of selected section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        {selectedIdx === null || !sections[selectedIdx] ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Edit3 className="h-8 w-8 text-slate-350 mb-2 animate-pulse" />
            <p className="text-xs font-extrabold text-slate-400">Select a section block on the left to configure it.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-50 pb-2">
              Configure {sections[selectedIdx].section_type.toUpperCase()} Section
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Section Header Title</label>
                <input
                  type="text"
                  value={sections[selectedIdx].title || ""}
                  onChange={(e) => updateSelectedField({ title: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Subtitle Description</label>
                <input
                  type="text"
                  value={sections[selectedIdx].subtitle || ""}
                  onChange={(e) => updateSelectedField({ subtitle: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            {/* Dynamic content form */}
            <div className="border-t border-slate-50 pt-4">
              {renderContentEditor(sections[selectedIdx])}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
