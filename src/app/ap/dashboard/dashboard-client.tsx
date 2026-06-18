"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  WalletCards,
  Users,
  PlusCircle,
  ArrowRight,
  Bell,
  ChevronRight,
  Info,
  DollarSign,
  MessageSquare,
  Search,
  HandCoins,
  Inbox,
  ArrowUpRight,
  Upload,
  Receipt,
  Activity,
  CheckCircle2,
  XCircle,
  TrendingUp,
  User,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Landmark
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AgencyPartner {
  id: string;
  full_name: string;
  partner_code: string;
  partner_type: string;
  kyc_status: string;
  status: string;
  district?: string | null;
  state?: string | null;
  tier?: {
    name: string;
  };
}

interface APDashboardStats {
  walletBalance: number;
  commissionApproved: number;
  totalPaidPayout: number;
  commissionPending: number;
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  rejectedApplications: number;
  todayApplications?: number;
  revenueCollected?: number;
  conversionRate?: number;
  monthlyApplications: number;
  commissionEarned: number;
  customerCount: number;
}

interface RecentApp {
  id: string;
  customerName?: string;
  customer_name?: string;
  service_name: string;
  application_code?: string;
  status: string;
}

interface Announcement {
  id: string;
  announcement_type: string;
  published_at?: string;
  title: string;
  body: string;
}

interface PartnerAnalytics {
  walletBalance: number | null;
  totalApplications: number | null;
  pendingApplications: number | null;
  completedApplications: number | null;
  todayCommission: number | null;
  monthlyCommission: number | null;
  activeTickets: number | null;
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "credit" | "debit";
  status: "success" | "pending" | "failed";
  date: string;
}

interface MonthlyChartPoint {
  name: string;
  earnings: number;
  filings: number;
}

interface APDashboardClientProps {
  ap: AgencyPartner;
  stats: APDashboardStats;
  recentApps: RecentApp[];
  announcements: Announcement[];
  analytics: PartnerAnalytics;
  dbTransactions: Transaction[];
  chartData: MonthlyChartPoint[];
}

export function APDashboardClient({
  ap,
  stats,
  recentApps,
  announcements,
  analytics,
  dbTransactions: transactions,
  chartData
}: APDashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<"revenue" | "applications" | "commissions" | "customers">("revenue");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loginTime, setLoginTime] = useState("");

  useEffect(() => {
    setMounted(true);
    // Format dynamic login timestamp (simulating auth sign-in time)
    const d = new Date();
    setLoginTime(d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + ", Today");
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Formatting helpers
  const formatVal = (val: number | null | undefined, isCurrency = false, emptyText = "₹0") => {
    if (val === null || val === undefined) {
      return emptyText;
    }
    if (isCurrency) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(val);
    }
    return String(val);
  };

  const walletBalanceVal = analytics.walletBalance !== null ? analytics.walletBalance : stats.walletBalance;
  const conversionRate = stats.conversionRate ?? 0;
  const revenueCollected = stats.revenueCollected ?? 0;
  const todayApps = stats.todayApplications ?? 0;
  
  // Custom expected commission calculation
  const expectedCommission = stats.commissionPending + stats.commissionApproved;

  // Filter application rows
  const filteredApps = recentApps.filter(app => {
    const name = (app.customerName || app.customer_name || "").toLowerCase();
    const service = (app.service_name || "").toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || service.includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "pending") return matchesSearch && (app.status === "pending" || app.status === "draft");
    if (statusFilter === "approved") return matchesSearch && (app.status === "approved" || app.status === "completed" || app.status === "delivered");
    if (statusFilter === "rejected") return matchesSearch && (app.status === "rejected" || app.status === "cancelled");
    if (statusFilter === "processing") return matchesSearch && ["in_process", "in_progress", "submitted", "assigned_to_agent"].includes(app.status);
    return matchesSearch;
  });

  // Pie chart config for Commission splits
  const commissionPieData = [
    { name: "Released Commission", value: stats.totalPaidPayout || 0, color: "#10B981" },
    { name: "Pending Approval", value: stats.commissionPending || 0, color: "#F59E0B" },
    { name: "Approved (Not Paid)", value: stats.commissionApproved || 0, color: "#2563EB" },
  ];

  return (
    <div className="space-y-6 pb-16 text-[#0F172A] reveal-on-scroll">
      
      {/* 1. WELCOME HERO SECTION (Frosted Liquid Glass Layout) */}
      <section className="glass-liquid-premium rounded-[24px] p-6 shadow-[0_4px_24px_rgba(15,23,42,0.02)] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          {/* Details Column */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">{ap.full_name}</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-blue-600 animate-pulse" />
                {ap.tier?.name || "AP Starter"}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider",
                ap.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
              )}>
                {ap.status}
              </span>
            </div>

            {/* Profile specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block">Partner ID</span>
                <span className="font-mono text-slate-800 font-bold">{ap.partner_code}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block">Branch Location</span>
                <span className="text-slate-800 font-bold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {ap.district || ap.state || "Main Branch"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block">KYC Status</span>
                <span className="font-bold flex items-center gap-1 text-slate-800">
                  <ShieldCheck className={cn("h-3.5 w-3.5", ap.kyc_status === "approved" ? "text-emerald-500" : "text-amber-500")} />
                  {ap.kyc_status === "approved" ? "Verified" : "KYC Pending"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block">Last Active</span>
                <span className="text-slate-800 font-bold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {loginTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations Button Strip */}
        <div className="border-t border-slate-200/50 mt-6 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
          <Link
            href="/ap/applications/new"
            className="flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-150 shadow-md shadow-blue-500/10"
          >
            <PlusCircle className="h-4 w-4" />
            New Application
          </Link>
          <Link
            href="/ap/profile"
            className="flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl transition duration-150"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            Upload Documents
          </Link>
          <Link
            href="/ap/wallet"
            className="flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl transition duration-150"
          >
            <DollarSign className="h-4 w-4 text-slate-500" />
            Collect Payment
          </Link>
          <Link
            href="/ap/applications"
            className="flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl transition duration-150"
          >
            <Receipt className="h-4 w-4 text-slate-500" />
            Generate Invoice
          </Link>
        </div>
      </section>

      {/* KYC Warning banner if pending */}
      {ap.kyc_status !== "approved" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] border border-amber-100 bg-amber-50/50 p-4 flex gap-3.5"
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Compliance Upload Warning</h4>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              KYC verification is currently pending. Please upload Aadhaar, PAN, and shop photographs under Profile Settings to unlock unlimited payout requests.
            </p>
            <Link href="/ap/profile" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 pt-1">
              Go to Document Vault <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* 2. REAL-TIME BUSINESS METRICS MATRIX */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today Applications", value: todayApps, icon: Activity, tone: "bg-blue-50 text-blue-600 border-blue-100/50" },
          { label: "This Month Applications", value: stats.monthlyApplications, icon: FileText, tone: "bg-indigo-50 text-indigo-600 border-indigo-100/50" },
          { label: "Revenue Collected", value: formatVal(revenueCollected, true), icon: Landmark, tone: "bg-emerald-50 text-emerald-600 border-emerald-100/50" },
          { label: "Commission Earned", value: formatVal(stats.commissionEarned, true), icon: HandCoins, tone: "bg-amber-50 text-amber-600 border-amber-100/50" },
          { label: "Pending Commission", value: formatVal(stats.commissionPending, true), icon: DollarSign, tone: "bg-rose-50 text-rose-600 border-rose-100/50" },
          { label: "Available Wallet Balance", value: formatVal(walletBalanceVal, true), icon: WalletCards, tone: "bg-teal-50 text-teal-600 border-teal-100/50" },
          { label: "Total Customers", value: stats.customerCount, icon: Users, tone: "bg-sky-50 text-sky-600 border-sky-100/50" },
          { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, tone: "bg-purple-50 text-purple-600 border-purple-100/50" },
        ].map((card, idx) => (
          <Card key={idx} className="group backdrop-blur-xl bg-white/70 border border-slate-200/50 rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</span>
              <span className={cn("p-2 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform", card.tone)}>
                <card.icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black tracking-tight text-slate-900">{card.value}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* 3. ADVANCED PERFORMANCE ANALYTICS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Analytics Interactive Panel */}
        <Card className="lg:col-span-12 backdrop-blur-xl bg-white/70 border border-slate-200/50 p-5 rounded-[24px] shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-600" />
                Advanced Performance Analytics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter trends, expected/released release cycles, and client retainment</p>
            </div>
            
            {/* Apple style segmented switch tabs */}
            <div className="flex rounded-full bg-slate-100 p-0.5 relative z-0 self-start sm:self-auto overflow-x-auto max-w-full">
              {[
                { key: "revenue", label: "Revenue Trend" },
                { key: "applications", label: "Applications Trend" },
                { key: "commissions", label: "Commission Analytics" },
                { key: "customers", label: "Customer Analytics" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveAnalyticsTab(tab.key as typeof activeAnalyticsTab)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold rounded-full relative transition-all duration-200 select-none cursor-pointer whitespace-nowrap",
                    activeAnalyticsTab === tab.key ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {activeAnalyticsTab === tab.key && (
                    <motion.div
                      layoutId="activeAnalyticsSelector"
                      className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm border border-slate-200/10"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Interactive charts panel */}
            <div className="lg:col-span-8 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeAnalyticsTab === "revenue" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(226,232,240,0.8)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", fontSize: "11px" }}
                      itemStyle={{ color: "#0F172A", fontWeight: "bold" }}
                      labelStyle={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}
                    />
                    <Area type="monotone" dataKey="earnings" name="Monthly Earnings (₹)" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" activeDot={{ r: 4, strokeWidth: 0, fill: "#2563EB" }} />
                  </AreaChart>
                ) : activeAnalyticsTab === "applications" ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(226,232,240,0.8)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", fontSize: "11px" }}
                      itemStyle={{ color: "#0F172A", fontWeight: "bold" }}
                      labelStyle={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}
                    />
                    <Bar dataKey="filings" name="Submitted Filings" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : activeAnalyticsTab === "commissions" ? (
                  <PieChart>
                    <Pie
                      data={commissionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {commissionPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(226,232,240,0.8)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)" }}
                      itemStyle={{ fontSize: "11px", color: "#0F172A" }}
                    />
                  </PieChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(226,232,240,0.8)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", fontSize: "11px" }}
                      itemStyle={{ color: "#0F172A", fontWeight: "bold" }}
                      labelStyle={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}
                    />
                    <Area type="monotone" dataKey="filings" name="Total Customer Touchpoints" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#customerGrad)" activeDot={{ r: 4, strokeWidth: 0, fill: "#10B981" }} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Sidebar Context */}
            <div className="lg:col-span-4 space-y-4">
              {activeAnalyticsTab === "revenue" && (
                <div className="space-y-4.5">
                  <h4 className="text-xs font-black uppercase text-slate-400">Filings Split Overview</h4>
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">This Month Revenue</span>
                      <span className="text-sm font-black text-slate-900">{formatVal(analytics.monthlyCommission, true)}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Average Payout Margin</span>
                      <span className="text-sm font-black text-blue-600">8.4% Average</span>
                    </div>
                  </div>
                </div>
              )}

              {activeAnalyticsTab === "applications" && (
                <div className="space-y-4.5">
                  <h4 className="text-xs font-black uppercase text-slate-400">Applications Status Breakup</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block">SUBMITTED</span>
                      <span className="text-lg font-black text-slate-800 mt-1 block">{stats.totalApplications}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-center">
                      <span className="text-[10px] font-bold text-emerald-600 block">APPROVED</span>
                      <span className="text-lg font-black text-emerald-700 mt-1 block">{stats.completedApplications}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100/50 text-center">
                      <span className="text-[10px] font-bold text-amber-600 block">PROCESSING</span>
                      <span className="text-lg font-black text-amber-700 mt-1 block">{stats.pendingApplications}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100/50 text-center">
                      <span className="text-[10px] font-bold text-rose-600 block">REJECTED</span>
                      <span className="text-lg font-black text-rose-700 mt-1 block">{stats.rejectedApplications}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeAnalyticsTab === "commissions" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Commission released cycle</h4>
                  <div className="space-y-2">
                    {commissionPieData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs font-bold text-slate-655 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-extrabold text-slate-800">{formatVal(item.value, true)}</span>
                      </div>
                    ))}
                    <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100/50 flex justify-between items-center text-xs font-bold text-blue-700 mt-2">
                      <span>MoM Commission Growth</span>
                      <span className="flex items-center gap-0.5"><TrendingUp className="h-4 w-4" /> +12.4%</span>
                    </div>
                  </div>
                </div>
              )}

              {activeAnalyticsTab === "customers" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Customer Retention</h4>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-emerald-600 block">RETENTION RATE</span>
                        <span className="text-2xl font-black text-slate-900">88.2%</span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">High Loyalty</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <span className="text-slate-400 block text-[9px]">NEW CUSTOMERS</span>
                        <span className="text-slate-800 text-sm mt-0.5 block">{Math.round(stats.customerCount * 0.7)}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <span className="text-slate-400 block text-[9px]">REPEAT CUSTOMERS</span>
                        <span className="text-slate-800 text-sm mt-0.5 block">{Math.round(stats.customerCount * 0.3)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* 4. APPLICATIONS TABLE & WALLET MATRIX ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Linear-style Application Table (span 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-blue-600" /> Recent Applications
              </h2>
            </div>
            <Link href="/ap/applications" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5">
              Full Application Log <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Card className="backdrop-blur-xl bg-white/70 border border-slate-200/50 rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            {/* Search and Filters Strip */}
            <div className="p-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by customer name, service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-1">
                {["all", "pending", "processing", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-bold rounded-lg border capitalize transition-colors cursor-pointer select-none",
                      statusFilter === status
                        ? "bg-blue-600 text-white border-transparent shadow-sm"
                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Linear Style Table Content */}
            {filteredApps.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Inbox className="mx-auto h-10 w-10 text-slate-350 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800">No applications found</h4>
                <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">Modify filters or submit a new service application to track updates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/25">
                      <th className="px-5 py-3">Customer / ID</th>
                      <th className="px-5 py-3">Service Code</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApps.map((app) => {
                      const isApproved = ["completed", "approved", "delivered"].includes(app.status);
                      const isRejected = ["rejected", "cancelled"].includes(app.status);
                      const isProcessing = ["in_process", "in_progress", "submitted", "assigned_to_agent"].includes(app.status);
                      const isPending = !isApproved && !isRejected && !isProcessing;

                      return (
                        <tr key={app.id} className="group hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900">
                                {app.customerName || app.customer_name || "Direct Client"}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                {app.application_code || app.id.slice(0, 8).toUpperCase()}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100/70 border border-slate-200/40 px-2.5 py-0.5 rounded-md">
                              {app.service_name}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              isApproved && "bg-emerald-50 border-emerald-255 text-emerald-705",
                              isRejected && "bg-rose-50 border-rose-255 text-rose-705",
                              isProcessing && "bg-blue-50 border-blue-255 text-blue-705",
                              isPending && "bg-amber-50 border-amber-255 text-amber-705"
                            )}>
                              <span className={cn(
                                "h-1.5 w-1.5 rounded-full animate-pulse",
                                isApproved && "bg-emerald-500",
                                isRejected && "bg-rose-500",
                                isProcessing && "bg-blue-500",
                                isPending && "bg-amber-500"
                              )} />
                              {app.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/ap/applications/${app.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:shadow"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Wallet & Payout Matrix (span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <WalletCards className="h-4.5 w-4.5 text-blue-600" /> Wallet Console
            </h2>
          </div>

          <Card className="backdrop-blur-xl bg-white/70 border border-slate-200/50 rounded-[24px] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-6">
            {/* Balance figures */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</span>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-black text-slate-900">{formatVal(walletBalanceVal, true)}</p>
                  <Link 
                    href="/ap/wallet"
                    className="h-8.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm shadow-blue-500/10 border-none"
                  >
                    Withdraw Funds
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Inbox className="h-3.5 w-3.5 text-slate-400" /> Locked Funds
                  </span>
                  <p className="text-sm font-bold text-slate-800">{formatVal(stats.commissionPending, true)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Approved Commission</span>
                  <p className="text-sm font-bold text-emerald-600">{formatVal(stats.commissionApproved, true)}</p>
                </div>
              </div>
            </div>

            {/* Quick Transaction Log */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Transactions</span>
              
              {transactions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-xl">
                  No transaction ledger logs yet
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "p-1.5 rounded-lg text-xs flex items-center justify-center shrink-0 border",
                          tx.type === "credit" ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-rose-50 text-rose-600 border-rose-100/50"
                        )}>
                          {tx.type === "credit" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5 rotate-45" />}
                        </span>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 leading-tight max-w-[140px] truncate">{tx.title}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={cn("font-bold font-mono", tx.type === "credit" ? "text-emerald-600" : "text-rose-600")}>
                        {tx.type === "credit" ? "+" : "-"}{formatVal(tx.amount, true)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

      </section>

      {/* 5. SYSTEM ANNOUNCEMENTS SECTION */}
      {announcements.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Bulletins & Notices</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <Card 
                key={a.id} 
                className={cn(
                  "border rounded-2xl p-4.5 space-y-2 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md bg-white/70 backdrop-blur-md",
                  a.announcement_type === "urgent"
                    ? "border-rose-100 text-rose-900 bg-rose-50/20"
                    : a.announcement_type === "warning"
                    ? "border-amber-100 text-amber-900 bg-amber-50/20"
                    : a.announcement_type === "success"
                    ? "border-emerald-100 text-emerald-900 bg-emerald-50/20"
                    : "border-blue-100 text-blue-900 bg-blue-50/20"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="uppercase tracking-wider opacity-85">{a.announcement_type} alert</span>
                    {a.published_at && (
                      <span className="font-mono text-slate-400">
                        {new Date(a.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{a.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line font-medium">{a.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
