"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Compass, Plus, Settings, Sparkles, X, ChevronRight } from "lucide-react";
import type { AdminService } from "@/lib/services";

interface AdminCommandPaletteProps {
  services: AdminService[];
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: AdminService) => void;
}

export function AdminCommandPalette({
  services,
  isOpen,
  onClose,
  onSelectService,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Command items definition
  const navigationItems = [
    { label: "Go to Dashboard", path: "/dashboard", icon: Compass },
    { label: "Go to Applications Manager", path: "/admin/applications", icon: Sparkles },
    { label: "Go to Services Listing", path: "/admin/services", icon: Settings },
  ];

  const actions = [
    {
      label: "Create New Service Wizard",
      action: () => {
        onClose();
        router.push("/admin/services/new");
      },
      icon: Plus,
    },
  ];

  const filteredServices = query.trim()
    ? services.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.slug.toLowerCase().includes(query.toLowerCase())
      )
    : services.slice(0, 5);

  const totalItems = navigationItems.length + actions.length + filteredServices.length;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeItem(selectedIndex);
    }
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedIndex, query]);

  const executeItem = (index: number) => {
    let currentIdx = 0;

    // Navigation
    for (const nav of navigationItems) {
      if (currentIdx === index) {
        onClose();
        router.push(nav.path);
        return;
      }
      currentIdx++;
    }

    // Actions
    for (const act of actions) {
      if (currentIdx === index) {
        act.action();
        return;
      }
      currentIdx++;
    }

    // Services
    for (const svc of filteredServices) {
      if (currentIdx === index) {
        onClose();
        onSelectService(svc);
        return;
      }
      currentIdx++;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[15vh] backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-0 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200"
      >
        {/* Search Input */}
        <div className="relative flex items-center border-b border-slate-200/60 p-4">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="ml-3 w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-450 outline-none"
            placeholder="Type a command or search services..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            onClick={onClose}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-650 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {/* Navigation Group */}
          {navigationItems.length > 0 && !query && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Navigation
              </div>
              {navigationItems.map((item, idx) => {
                const globalIndex = idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={item.path}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/10"
                        : "text-slate-650 hover:bg-slate-50"
                    }`}
                    onClick={() => executeItem(globalIndex)}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-450"}`} />
                      <span>{item.label}</span>
                    </div>
                    {isSelected && <ChevronRight className="h-3.5 w-3.5 text-white/85" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Actions Group */}
          {actions.length > 0 && !query && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Quick Actions
              </div>
              {actions.map((item, idx) => {
                const globalIndex = navigationItems.length + idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={item.label}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/10"
                        : "text-slate-650 hover:bg-slate-50"
                    }`}
                    onClick={() => executeItem(globalIndex)}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-450"}`} />
                      <span>{item.label}</span>
                    </div>
                    {isSelected && <ChevronRight className="h-3.5 w-3.5 text-white/85" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Services Group */}
          <div>
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {query ? "Matching Services" : "Recent Services"}
              </span>
              {query && (
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {filteredServices.length} found
                </span>
              )}
            </div>

            {filteredServices.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-450">
                No matching services found.
              </div>
            ) : (
              filteredServices.map((service, idx) => {
                const globalIndex = (query ? 0 : navigationItems.length + actions.length) + idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={service.id}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/10"
                        : "text-slate-650 hover:bg-slate-50"
                    }`}
                    onClick={() => executeItem(globalIndex)}
                  >
                    <div className="flex flex-col">
                      <span>{service.title}</span>
                      <span
                        className={`text-[10px] font-mono mt-0.5 ${
                          isSelected ? "text-indigo-200" : "text-slate-400"
                        }`}
                      >
                        {service.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                          isSelected
                            ? "bg-indigo-700/50 text-white"
                            : service.status === "published"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {service.status}
                      </span>
                      {isSelected && <ChevronRight className="h-3.5 w-3.5 text-white/85" />}
                    </div>
                  </button>
                );
              }))
            }
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[10px] font-bold text-slate-450">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono shadow-sm">↑↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono shadow-sm">⏎</kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono shadow-sm">esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
