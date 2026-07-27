"use client";

import { type ReactNode, useState } from "react";

type TabKey = "overview" | "documents" | "activity" | "payment" | "communication";

type AdminApplicationTabsProps = {
  overviewContent: ReactNode;
  documentsContent: ReactNode;
  activityContent: ReactNode;
  paymentContent: ReactNode;
  communicationContent: ReactNode;
  documentCount?: number;
  activityCount?: number;
};

export function AdminApplicationTabs({
  overviewContent,
  documentsContent,
  activityContent,
  paymentContent,
  communicationContent,
  documentCount,
  activityCount,
}: AdminApplicationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const tabs: Array<{ key: TabKey; label: string; count?: number | null }> = [
    { key: "overview", label: "Overview" },
    { key: "documents", label: "Documents", count: documentCount ?? null },
    { key: "activity", label: "Activity", count: activityCount ?? null },
    { key: "payment", label: "Payment" },
    { key: "communication", label: "Communication" },
  ];

  return (
    <div className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex min-w-full gap-1 border-b border-slate-200 pb-px sm:min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {typeof tab.count === "number" && tab.count > 0 ? (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[32vh]">
        {activeTab === "overview" ? <div className="space-y-4">{overviewContent}</div> : null}
        {activeTab === "documents" ? <div className="space-y-4">{documentsContent}</div> : null}
        {activeTab === "activity" ? <div className="space-y-4">{activityContent}</div> : null}
        {activeTab === "payment" ? <div className="space-y-4">{paymentContent}</div> : null}
        {activeTab === "communication" ? <div className="space-y-4">{communicationContent}</div> : null}
      </div>
    </div>
  );
}
