"use client";

import React, { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Eye,
  Trash2,
  Copy,
  Archive,
  RefreshCw,
  X,
  FileText,
  User,
  Layers,
  Command,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";

interface ServiceMetadata {
  customer_fee?: number | string;
  agent_payout?: number | string;
  auto_assignment?: boolean;
  tat_hours?: number;
  payout_type?: "fixed" | "percentage";
  payout_percentage?: number | string;
}

interface ServiceAnalyticsData {
  summary: {
    totalApplications: number;
    completedApplications: number;
    pendingApplications: number;
    totalRevenue: number;
    averageValue: number;
    approvalRate?: number;
  };
  latestApplications: Array<{
    id: string;
    customerName: string;
    customerMobile: string;
    amount: number;
    status: string;
  }>;
  growthTrends?: Array<{
    date: string;
    revenue: number;
  }>;
}

interface AuditLogChange {
  old: unknown;
  new: unknown;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
  changes?: Record<string, AuditLogChange> | null;
}
import { useToast } from "@/components/providers/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminService, DbServiceCategory } from "@/lib/services";
import { cn } from "@/lib/utils";
import { AdminCommandPalette } from "./admin-command-palette";

interface AdminServicesListProps {
  services: AdminService[];
  categories: DbServiceCategory[];
}

export function AdminServicesList({ services: initialServices, categories }: AdminServicesListProps) {
  const [services] = useState<AdminService[]>(initialServices);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("sort_order");
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Active Details Drawer service
  const [activeService, setActiveService] = useState<AdminService | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "applications" | "revenue" | "partners" | "documents" | "commission" | "activity">("overview");
  
  // Drawer data state
  const [timelineLogs, setTimelineLogs] = useState<AuditLog[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<ServiceAnalyticsData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  // Command palette state
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  // Input fields for bulk actions
  const [showBulkPriceInput, setShowBulkPriceInput] = useState(false);
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [showBulkCommissionInput, setShowBulkCommissionInput] = useState(false);
  const [bulkCommissionValue, setBulkCommissionValue] = useState("");

  const [, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  // Fetch active service details dynamically when drawer is opened
  useEffect(() => {
    if (!activeService) {
      setTimelineLogs([]);
      setAnalyticsData(null);
      return;
    }

    const serviceId = activeService.id;
    const serviceSlug = activeService.slug;

    // Load Audit timeline
    async function loadActivity() {
      setIsTimelineLoading(true);
      try {
        const res = await fetch(`/api/admin/services/${serviceId}/activity`);
        if (res.ok) {
          const data = await res.json();
          setTimelineLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to load activity logs", err);
      } finally {
        setIsTimelineLoading(false);
      }
    }

    // Load specific service analytics & application list
    async function loadAnalytics() {
      setIsAnalyticsLoading(true);
      try {
        const res = await fetch(`/api/admin/services/analytics?slug=${serviceSlug}`);
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        }
      } catch (err) {
        console.error("Failed to load service analytics", err);
      } finally {
        setIsAnalyticsLoading(false);
      }
    }

    loadActivity();
    loadAnalytics();
  }, [activeService]);

  // Filter and Sort Services
  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = services.filter((service) => {
      const haystack = `${service.title} ${service.slug} ${service.short_description ?? ""} ${service.category?.name ?? ""}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesCategory = category === "all" || service.category_id === category;
      const matchesStatus = status === "all" || service.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort options
    filtered.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    return filtered;
  }, [search, category, status, sortBy, services]);

  // Service count metrics
  const metrics = useMemo(() => {
    return {
      total: services.length,
      published: services.filter((s) => s.status === "published").length,
      draft: services.filter((s) => s.status === "draft").length,
      archived: services.filter((s) => s.status === "archived").length,
    };
  }, [services]);

  // Toggle selection
  function handleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    if (selectedIds.length === visibleServices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleServices.map((s) => s.id));
    }
  }

  // Note: Unused handlers removed.

  function handleArchive(service: AdminService) {
    if (!window.confirm(`Archive ${service.title}? It will stop showing publicly.`)) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Archive failed.");
        success("Service archived.");
        window.location.reload();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Archive failed.");
      }
    });
  }

  function handleRestore(service: AdminService) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${service.id}/restore`, { method: "POST" });
        if (!response.ok) throw new Error("Restore failed.");
        success("Service restored as draft.");
        window.location.reload();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Restore failed.");
      }
    });
  }

  function handleDuplicate(service: AdminService) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${service.id}/duplicate`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Duplicate failed.");
        success("Service duplicated successfully.");
        window.location.reload();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Duplicate failed.");
      }
    });
  }

  // Bulk Operations Actions Handler
  function executeBulkAction(action: string) {
    if (!selectedIds.length) return;
    
    let pricingValue: number | undefined;
    let commissionValue: number | undefined;

    if (action === "update_pricing") {
      pricingValue = Number(bulkPriceValue);
      if (Number.isNaN(pricingValue) || pricingValue < 0) {
        toastError("Enter a valid pricing amount.");
        return;
      }
    }

    if (action === "update_commission") {
      commissionValue = Number(bulkCommissionValue);
      if (Number.isNaN(commissionValue) || commissionValue < 0) {
        toastError("Enter a valid commission payout.");
        return;
      }
    }

    if (action === "delete" && !window.confirm("Permanently delete selected services? This cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/services/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, action, pricingValue, commissionValue }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Bulk operation failed.");
        
        success(result.message || "Bulk operation completed.");
        setSelectedIds([]);
        setShowBulkPriceInput(false);
        setShowBulkCommissionInput(false);
        window.location.reload();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Bulk action failed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Total Services</span>
            <Layers className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.total}</p>
          <span className="text-[10px] text-slate-450 font-semibold block mt-1">Catalog setup count</span>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Live / Published</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.published}</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">
            {metrics.total > 0 ? Math.round((metrics.published / metrics.total) * 100) : 0}% Active live
          </span>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Draft Catalog</span>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.draft}</p>
          <span className="text-[10px] text-slate-450 font-semibold block mt-1">Pending publication</span>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Archived (Soft Deleted)</span>
            <Archive className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.archived}</p>
          <span className="text-[10px] text-red-500 font-bold block mt-1">Excluded from portal views</span>
        </div>
      </div>

      {/* 2. Controls & Search Workspace */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-blue-50 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service, slug, category, benefits..."
            className="h-10 pl-11 bg-slate-50/50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-10">
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sort_order">Sort Order (Def)</SelectItem>
              <SelectItem value="title">Alphabetical</SelectItem>
              <SelectItem value="newest">Newest Added</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Command Palette Button */}
          <Button
            variant="outline"
            className="h-10 gap-1.5 hidden md:inline-flex"
            onClick={() => setIsPaletteOpen(true)}
          >
            <Command className="h-4 w-4 text-slate-500" />
            <span>Search</span>
            <kbd className="text-[10px] font-mono border rounded px-1.5 py-0.5 bg-slate-50">Ctrl+K</kbd>
          </Button>
        </div>
      </div>

      {/* 3. Services Listing (Premium Stripe style list) */}
      <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === visibleServices.length && visibleServices.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                </th>
                <th className="px-5 py-4">Service Details</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Fee / Payout</th>
                <th className="px-5 py-4 text-center">Apps / Revenue</th>
                <th className="px-5 py-4">Last Updated</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {visibleServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <FileText className="h-10 w-10 mx-auto text-slate-350 mb-3" />
                    <p className="text-sm font-bold text-slate-800">No services match the filter query.</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Try updating search queries or dropdown selections.</p>
                  </td>
                </tr>
              ) : (
                visibleServices.map((svc) => {
                  const customerFeeVal = Number((svc.metadata as ServiceMetadata | null | undefined)?.customer_fee ?? svc.sale_price ?? svc.offer_price ?? 0);
                  const agentPayoutVal = Number((svc.metadata as ServiceMetadata | null | undefined)?.agent_payout ?? 0);

                  return (
                    <tr
                      key={svc.id}
                      className={cn(
                        "hover:bg-slate-50/40 transition-colors duration-150 cursor-pointer",
                        selectedIds.includes(svc.id) ? "bg-slate-50/20" : ""
                      )}
                      onClick={() => {
                        setActiveService(svc);
                        setActiveTab("overview");
                      }}
                    >
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(svc.id)}
                          onChange={() => handleSelectRow(svc.id)}
                          className="h-4 w-4 rounded text-indigo-600"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 text-[13px]">{svc.title}</span>
                          <span className="font-mono text-[10px] text-slate-400 mt-0.5">{svc.slug}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 text-xs">
                        {svc.category?.name || "Uncategorized"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide",
                            svc.status === "published"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : svc.status === "draft"
                              ? "bg-slate-100 text-slate-650"
                              : "bg-red-50 text-red-600 border border-red-100"
                          )}
                        >
                          {svc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-850 text-xs">₹{customerFeeVal}</span>
                          <span className="text-[10px] text-emerald-600 font-bold mt-0.5">Payout: ₹{agentPayoutVal}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-slate-700 text-xs">-- Apps</span>
                          <span className="text-[10px] text-slate-450 font-semibold mt-0.5">-- Rev</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs font-bold">
                        {new Date(svc.updated_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100"
                            onClick={() => {
                              setActiveService(svc);
                              setActiveTab("overview");
                            }}
                            title="View details"
                          >
                            <Eye className="h-4 w-4 text-slate-650" />
                          </Button>
                          <Link
                            href={`/admin/services/${svc.id}/edit`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                              "h-8 w-8 hover:bg-slate-100"
                            )}
                            title="Configure service settings"
                          >
                            <SlidersHorizontal className="h-4 w-4 text-slate-650" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={() => handleDuplicate(svc)}
                            title="Duplicate service"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {svc.status === "archived" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-green-50 text-green-600"
                              onClick={() => handleRestore(svc)}
                              title="Restore service"
                            >
                              <RefreshCw className="h-4 w-4 animate-spin-hover" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50 text-red-500"
                              onClick={() => handleArchive(svc)}
                              title="Archive service"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Sliding Bulk Action Bar (bottom popover overlay) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-3xl -translate-x-1/2 px-4 animate-in slide-in-from-bottom-8 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-white/35 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-xs font-extrabold">
                {selectedIds.length}
              </span>
              <span className="text-xs font-extrabold text-slate-200">Services selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                className="text-slate-350 hover:text-white text-xs font-bold"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>

              <Button
                variant="outline"
                className="h-9 px-3.5 text-xs font-extrabold border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200"
                onClick={() => executeBulkAction("enable")}
              >
                Publish Live
              </Button>

              <Button
                variant="outline"
                className="h-9 px-3.5 text-xs font-extrabold border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200"
                onClick={() => executeBulkAction("disable")}
              >
                Set Draft
              </Button>

              <Button
                variant="outline"
                className="h-9 px-3.5 text-xs font-extrabold border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200"
                onClick={() => executeBulkAction("duplicate")}
              >
                Duplicate
              </Button>

              {/* Update Pricing Action */}
              <div className="relative">
                {showBulkPriceInput ? (
                  <div className="absolute bottom-11 right-0 flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 p-2 shadow-2xl animate-in zoom-in-95 duration-100">
                    <Input
                      type="number"
                      placeholder="Price (₹)"
                      value={bulkPriceValue}
                      onChange={(e) => setBulkPriceValue(e.target.value)}
                      className="h-8 w-24 text-xs bg-slate-900 border-slate-750 text-white placeholder-slate-500"
                    />
                    <Button
                      className="h-8 text-xs px-2.5 font-bold"
                      onClick={() => executeBulkAction("update_pricing")}
                    >
                      Apply
                    </Button>
                    <button onClick={() => setShowBulkPriceInput(false)} className="text-slate-400 hover:text-white px-1">
                      &times;
                    </button>
                  </div>
                ) : null}
                <Button
                  variant="outline"
                  className="h-9 px-3.5 text-xs font-extrabold border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200"
                  onClick={() => {
                    setShowBulkPriceInput(!showBulkPriceInput);
                    setShowBulkCommissionInput(false);
                  }}
                >
                  Adjust Price
                </Button>
              </div>

              {/* Update Commission Action */}
              <div className="relative">
                {showBulkCommissionInput ? (
                  <div className="absolute bottom-11 right-0 flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 p-2 shadow-2xl animate-in zoom-in-95 duration-100">
                    <Input
                      type="number"
                      placeholder="Payout (₹)"
                      value={bulkCommissionValue}
                      onChange={(e) => setBulkCommissionValue(e.target.value)}
                      className="h-8 w-24 text-xs bg-slate-900 border-slate-750 text-white placeholder-slate-500"
                    />
                    <Button
                      className="h-8 text-xs px-2.5 font-bold"
                      onClick={() => executeBulkAction("update_commission")}
                    >
                      Apply
                    </Button>
                    <button onClick={() => setShowBulkCommissionInput(false)} className="text-slate-400 hover:text-white px-1">
                      &times;
                    </button>
                  </div>
                ) : null}
                <Button
                  variant="outline"
                  className="h-9 px-3.5 text-xs font-extrabold border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200"
                  onClick={() => {
                    setShowBulkCommissionInput(!showBulkCommissionInput);
                    setShowBulkPriceInput(false);
                  }}
                >
                  Adjust Payout
                </Button>
              </div>

              <Button
                variant="outline"
                className="h-9 px-3.5 text-xs font-extrabold border-red-900 bg-red-950/60 hover:bg-red-900 text-red-200"
                onClick={() => executeBulkAction("archive")}
              >
                Archive
              </Button>

              <Button
                variant="ghost"
                className="h-9 w-9 text-slate-400 hover:text-red-400 hover:bg-slate-850"
                onClick={() => executeBulkAction("delete")}
              >
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Right-side Details Slider Drawer */}
      {activeService && (
        <>
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 z-45 bg-slate-900/10 backdrop-blur-2xs transition-opacity"
            onClick={() => setActiveService(null)}
          />

          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl border-l border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Drawer Header */}
            <div className="border-b border-slate-200/60 p-5 flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-indigo-700">
                  {activeService.category?.name || "Services CMS"}
                </span>
                <h2 className="mt-1 text-base font-extrabold text-slate-900">{activeService.title}</h2>
                <span className="font-mono text-[10px] text-slate-450 block mt-0.5">{activeService.slug}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/services/${activeService.id}/edit`}
                  className={cn(buttonVariants({ variant: "outline" }), "h-8 px-3.5 text-xs font-bold")}
                >
                  Edit Configuration
                </Link>
                <button
                  onClick={() => setActiveService(null)}
                  className="rounded-lg p-1.5 text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Tab header bar */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1 select-none overflow-x-auto">
              {(
                [
                  { id: "overview", label: "Overview" },
                  { id: "documents", label: "Documents" },
                  { id: "commission", label: "Commission" },
                  { id: "applications", label: "Applications" },
                  { id: "revenue", label: "Revenue" },
                  { id: "activity", label: "Activity" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-2 text-xs font-extrabold rounded-lg shrink-0 transition-all",
                    activeTab === tab.id
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content scrollable panels */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-5 animate-in fade-in-50 duration-150">
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450">Short Description</h4>
                    <p className="mt-1.5 text-xs font-semibold text-slate-750 leading-relaxed">
                      {activeService.short_description || "No short description provided."}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450">Detailed Overview</h4>
                    <p className="mt-1.5 text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                      {activeService.full_description || activeService.overview || "No detailed overview provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450 block">Status</span>
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-650">
                        {activeService.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450 block">CTA Button Link</span>
                      <span className="mt-1.5 text-xs font-bold text-slate-700">
                        {activeService.cta_type === "apply" ? "Standard Application" : "Enquiry Form"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450 block">SLA & System Configuration</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-750">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Auto Assign</span>
                        <span className="mt-1 block">
                          {(activeService.metadata as ServiceMetadata | null | undefined)?.auto_assignment ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <span className="text-[9px] font-extrabold text-slate-400 block uppercase">TAT SLA Goal</span>
                        <span className="mt-1 block">
                          {(activeService.metadata as ServiceMetadata | null | undefined)?.tat_hours || 48} Hours
                        </span>
                      </div>
                    </div>
                  </div>

                  {activeService.created_by_profile && (
                    <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-650">
                        <User className="h-4.5 w-4.5 text-slate-450" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Created By</span>
                        <span className="text-xs font-bold text-slate-750 block mt-0.5">
                          {activeService.created_by_profile.full_name} ({activeService.created_by_profile.role})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Documents */}
              {activeTab === "documents" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450">Required Submission Checklist</h4>
                  {activeService.documents && activeService.documents.length > 0 ? (
                    <ul className="grid gap-2">
                      {activeService.documents.map((doc, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3.5 py-3 text-xs font-bold text-slate-750"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-extrabold text-indigo-700">
                            {idx + 1}
                          </span>
                          {doc}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 font-semibold italic">No specific documents registered.</p>
                  )}
                </div>
              )}

              {/* Tab 3: Commission */}
              {activeTab === "commission" && (
                <div className="space-y-5 animate-in fade-in-50 duration-150">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450">Pricing & Partner Revenue splits</h4>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/80 p-4">
                      <span className="text-[9px] font-extrabold text-slate-450 uppercase block">Customer Price</span>
                      <p className="mt-1 text-xl font-extrabold text-slate-900">
                        ₹{(activeService.metadata as ServiceMetadata | null | undefined)?.customer_fee || activeService.sale_price || 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 p-4">
                      <span className="text-[9px] font-extrabold text-slate-450 uppercase block">Partner Payout</span>
                      <p className="mt-1 text-xl font-extrabold text-emerald-600">
                        ₹{(activeService.metadata as ServiceMetadata | null | undefined)?.agent_payout || 0}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Commission Model</span>
                      <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                        {(activeService.metadata as ServiceMetadata | null | undefined)?.payout_type || "fixed"}
                      </span>
                    </div>
                    {(activeService.metadata as ServiceMetadata | null | undefined)?.payout_type === "percentage" && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Percentage Split</span>
                        <span className="font-extrabold text-slate-800">
                          {(activeService.metadata as ServiceMetadata | null | undefined)?.payout_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Applications */}
              {activeTab === "applications" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450">Recent Applications</span>
                    {analyticsData?.summary && (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-150 px-2 py-0.5 rounded">
                        Total {analyticsData.summary.totalApplications}
                      </span>
                    )}
                  </div>

                  {isAnalyticsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    </div>
                  ) : !analyticsData?.latestApplications || analyticsData.latestApplications.length === 0 ? (
                    <p className="text-xs text-slate-500 font-semibold italic text-center py-6">
                      No applications submitted for this service yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {analyticsData.latestApplications.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between border border-slate-200/80 rounded-xl p-3.5 text-xs font-bold text-slate-750 bg-white hover:border-slate-350 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span>{app.customerName}</span>
                            <span className="font-mono text-[9px] text-slate-400 mt-0.5">{app.customerMobile}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-800">₹{app.amount}</span>
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide font-extrabold",
                                app.status === "completed"
                                  ? "bg-green-50 text-green-700"
                                  : app.status === "rejected"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-amber-50 text-amber-600"
                              )}
                            >
                              {app.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Revenue */}
              {activeTab === "revenue" && (
                <div className="space-y-5 animate-in fade-in-50 duration-150">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase">Gross Revenue</span>
                      <p className="mt-1 text-xl font-extrabold text-slate-900">
                        ₹{analyticsData?.summary?.totalRevenue || 0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase">Approval SLA Rate</span>
                      <p className="mt-1 text-xl font-extrabold text-indigo-600">
                        {analyticsData?.summary?.approvalRate || 100}%
                      </p>
                    </div>
                  </div>

                  {/* Revenue Growth Trend Chart */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-slate-450 uppercase block mb-3">Revenue growth trends</span>
                    {isAnalyticsLoading ? (
                      <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      </div>
                    ) : analyticsData?.growthTrends && analyticsData.growthTrends.length > 0 ? (
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsData.growthTrends}>
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <ChartTooltip />
                            <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-semibold italic text-center py-10">No revenue data available.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: Activity Logs */}
              {activeTab === "activity" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-450">Activity Timeline Logs</span>

                  {isTimelineLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    </div>
                  ) : timelineLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 font-semibold italic text-center py-6">
                      No logged operations found for this service.
                    </p>
                  ) : (
                    <div className="relative border-l border-slate-250/80 ml-2.5 pl-6 space-y-5">
                      {timelineLogs.map((log) => {
                        const dateStr = new Date(log.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const actorName = log.profiles?.full_name || "Admin Manager";

                        return (
                          <div key={log.id} className="relative text-xs">
                            {/* Dot indicator */}
                            <span className="absolute -left-[30px] top-1 flex h-2 w-2 rounded-full bg-indigo-600" />
                            
                            <div className="font-bold text-slate-800">
                              <span className="text-indigo-600 font-extrabold capitalize">{log.action}</span>
                              <span className="text-slate-450 font-semibold"> by {actorName}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">{dateStr}</span>

                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-2 text-[10px] font-mono space-y-1">
                                {Object.entries(log.changes || {}).map(([field, delta]) => (
                                  <div key={field} className="text-slate-650 flex flex-wrap gap-1">
                                    <span className="font-bold text-slate-700">{field}:</span>
                                    <span className="text-red-600 line-through">
                                      {JSON.stringify(delta.old)}
                                    </span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-emerald-700 font-extrabold">
                                      {JSON.stringify(delta.new)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 6. Command Palette Overlay Modal */}
      <AdminCommandPalette
        services={services}
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectService={(svc) => {
          setActiveService(svc);
          setActiveTab("overview");
        }}
      />
    </div>
  );
}
