"use client";

import { type ReactNode, useState } from "react";
import { FileText, FolderOpen, History } from "lucide-react";

type AdminApplicationTabsProps = {
  overviewContent: ReactNode;
  documentsContent: ReactNode;
  activityContent: ReactNode;
  documentCount: number;
  activityCount: number;
};

type TabKey = "overview" | "documents" | "activity";

export function AdminApplicationTabs({
  overviewContent,
  documentsContent,
  activityContent,
  documentCount,
  activityCount,
}: AdminApplicationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const tabs = [
    {
      key: "overview" as const,
      label: "Overview",
      icon: FileText,
      count: null,
    },
    {
      key: "documents" as const,
      label: "Documents",
      icon: FolderOpen,
      count: documentCount,
    },
    {
      key: "activity" as const,
      label: "Activity",
      icon: History,
      count: activityCount,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Premium Stripe-like tab navigation */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-sm md:p-1.5">
        <div className="flex flex-1 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition md:py-3 md:text-sm ${
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-md shadow-blue-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`rounded-full px-2 py-0.5 text-xxs font-extrabold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stateful tab views */}
      <div className="min-h-[40vh] transition-all duration-200">
        {activeTab === "overview" && <div className="space-y-5 animate-fade-in">{overviewContent}</div>}
        {activeTab === "documents" && <div className="space-y-5 animate-fade-in">{documentsContent}</div>}
        {activeTab === "activity" && <div className="space-y-5 animate-fade-in">{activityContent}</div>}
      </div>
    </div>
  );
}
