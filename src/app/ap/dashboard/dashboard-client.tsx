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
  ArrowUpRight
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
  CartesianGrid
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AgencyPartner {
  id: string;
  full_name: string;
  partner_code: string;
  partner_type: string;
  kyc_status: string;
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
  
  // Chart view: "earnings" | "growth" | "distribution"
  const [activeChartTab, setActiveChartTab] = useState<"earnings" | "growth" | "distribution">("earnings");

  // Application search & filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </div>
    );
  }

  // Format Helper that ensures database NULL/Undefined values show correctly instead of falling back to fake defaults
  const formatVal = (val: number | null | undefined, isCurrency = false, emptyText = "—") => {
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

  const appDistributionData = [
    { name: "Approved", value: analytics.completedApplications || 0, color: "#10B981" },
    { name: "Processing", value: analytics.pendingApplications || 0, color: "#2563EB" },
    { name: "Rejected", value: stats.rejectedApplications || 0, color: "#EF4444" },
  ];

  // Filter application rows
  const filteredApps = recentApps.filter(app => {
    const name = (app.customerName || app.customer_name || "").toLowerCase();
    const service = (app.service_name || "").toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || service.includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "pending") return matchesSearch && app.status === "pending";
    if (statusFilter === "approved") return matchesSearch && (app.status === "approved" || app.status === "completed");
    if (statusFilter === "rejected") return matchesSearch && (app.status === "rejected" || app.status === "cancelled");
    if (statusFilter === "processing") return matchesSearch && app.status === "processing";
    return matchesSearch;
  });

  const hasCommissions = analytics.monthlyCommission !== null && analytics.monthlyCommission > 0;
  const walletBalanceVal = analytics.walletBalance !== null ? analytics.walletBalance : stats.walletBalance;

  return (
    <div className="space-y-6 pb-12 text-[#0F172A]">
      
      {/* 1. HERO SECTION (Above Fold) */}
      <section className="backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Partner details only - NO fake commission stats or counters */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0F172A]">{ap.full_name}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                {ap.tier?.name || "AP Starter"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#64748B]">
              <span className="font-semibold">ID: <strong className="font-mono text-[#0F172A] font-semibold">{ap.partner_code}</strong></span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="capitalize">{ap.partner_type.replace("_", " ")}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="inline-flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full animate-pulse", ap.kyc_status === "approved" ? "bg-[#10B981]" : "bg-[#F59E0B]")} />
                <span className="capitalize font-semibold text-[#0F172A]">{ap.kyc_status === "approved" ? "Active" : "KYC Pending"}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* KYC Alert Panel */}
      {ap.kyc_status !== "approved" && (
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] border border-amber-100 bg-amber-50/45 p-4 flex gap-3.5"
        >
          <AlertTriangle className="h-5 w-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Verification Notice</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Withdrawal limits are capped until onboarding papers are vetted. Please review upload parameters.
            </p>
            <Link href="/ap/profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 pt-1">
              Complete Upload <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.section>
      )}

      {/* 2. SMART KPI SECTION */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Wallet Balance */}
        <Card className="group backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[20px] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:-translate-y-1 hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Wallet Balance</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/30 group-hover:scale-105 transition-transform">
              <WalletCards className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {formatVal(walletBalanceVal, true)}
            </p>
            <Link 
              href="/ap/wallet"
              className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              View Wallet Console
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Earnings */}
        <Card className="group backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[20px] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:-translate-y-1 hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Monthly Earnings</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/30 group-hover:scale-105 transition-transform">
              <HandCoins className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {hasCommissions ? formatVal(analytics.monthlyCommission, true) : "Commission data will appear here"}
            </p>
            {hasCommissions && (
              <p className="text-[10px] font-semibold text-[#64748B]">
                Today: {formatVal(analytics.todayCommission, true)}
              </p>
            )}
          </div>
        </Card>

        {/* Card 3: Applications */}
        <Card className="group backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[20px] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:-translate-y-1 hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Total Applications</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/30 group-hover:scale-105 transition-transform">
              <FileText className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {analytics.totalApplications !== null && analytics.totalApplications > 0 ? (
                formatVal(analytics.totalApplications)
              ) : (
                "No applications submitted"
              )}
            </p>
            {analytics.totalApplications !== null && analytics.totalApplications > 0 && (
              <p className="text-[10px] font-semibold text-[#64748B]">
                {formatVal(analytics.completedApplications)} approved • {formatVal(analytics.pendingApplications)} pending
              </p>
            )}
          </div>
        </Card>

        {/* Card 4: Support Tickets */}
        <Card className="group backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[20px] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:-translate-y-1 hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Active Tickets</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-650 border border-indigo-100/30 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {analytics.activeTickets !== null && analytics.activeTickets > 0 ? (
                formatVal(analytics.activeTickets)
              ) : (
                "No active support tickets"
              )}
            </p>
            {analytics.activeTickets !== null && analytics.activeTickets > 0 && (
              <p className="text-[10px] font-semibold text-[#64748B]">Avg. response ~15 mins</p>
            )}
          </div>
        </Card>
      </section>

      {/* 3. CHARTS & QUICK ACTIONS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Stripe-style Chart Card */}
        <Card className="lg:col-span-8 backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] p-5 rounded-[24px] shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">Performance Metrics</h3>
                <p className="text-xs text-[#64748B]">Interactive billing & application volume analysis</p>
              </div>
              
              {/* Apple-style Segmented Switcher for Charts */}
              <div className="flex rounded-full bg-slate-100 p-0.5 relative z-0">
                {(["earnings", "growth", "distribution"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveChartTab(tab)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-full relative transition-all duration-200 select-none cursor-pointer",
                      activeChartTab === tab ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    {activeChartTab === tab && (
                      <motion.div
                        layoutId="activeChartSelector"
                        className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm border border-slate-900/05"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="capitalize">{tab === "earnings" ? "Earnings" : tab === "growth" ? "App Filings" : "Services"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive chart display area */}
            <div className="h-60 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === "earnings" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.08}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(15,23,42,0.06)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", fontSize: "11px" }}
                      itemStyle={{ color: "#0F172A", fontWeight: "bold" }}
                      labelStyle={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}
                    />
                    <Area type="monotone" dataKey="earnings" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#earningsGrad)" activeDot={{ r: 4, strokeWidth: 0, fill: "#2563EB" }} />
                  </AreaChart>
                ) : activeChartTab === "growth" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.08}/>
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(15,23,42,0.06)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", fontSize: "11px" }}
                      itemStyle={{ color: "#0F172A", fontWeight: "bold" }}
                      labelStyle={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}
                    />
                    <Area type="monotone" dataKey="filings" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#growthGrad)" activeDot={{ r: 4, strokeWidth: 0, fill: "#F97316" }} />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={appDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {appDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "rgba(15,23,42,0.06)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(15,23,42,0.03)" }}
                      itemStyle={{ fontSize: "11px", color: "#0F172A" }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-semibold border-t border-slate-100 pt-4 mt-4">
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>Commission is calculated in real-time. Automated payouts trigger directly into the wallet.</span>
          </div>
        </Card>

        {/* Right: Quick Action Hub (Exactly 4 actions) */}
        <Card className="lg:col-span-4 backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] p-5 rounded-[24px] shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex flex-col justify-between">
          <div className="space-y-4 h-full flex flex-col">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">Quick Operations</h3>
              <p className="text-xs text-[#64748B]">Immediate agency actions</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 my-auto py-2">
              {/* Action 1: New Application */}
              <Link
                href="/ap/applications/new"
                className="group flex flex-col justify-between p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100/30 hover:border-blue-200 transition-all duration-200 h-[104px]"
              >
                <span className="p-2 w-9 h-9 rounded-xl bg-blue-100/60 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <PlusCircle className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">New Filing</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Submit customer</p>
                </div>
              </Link>

              {/* Action 2: Add Customer */}
              <Link
                href="/ap/customers"
                className="group flex flex-col justify-between p-4 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/30 hover:border-emerald-200 transition-all duration-200 h-[104px]"
              >
                <span className="p-2 w-9 h-9 rounded-xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Customers</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Manage details</p>
                </div>
              </Link>

              {/* Action 3: Payout Console (Redirect instead of mock Razorpay) */}
              <Link
                href="/ap/wallet"
                className="group flex flex-col justify-between p-4 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100/30 hover:border-amber-200 transition-all duration-200 h-[104px]"
              >
                <span className="p-2 w-9 h-9 rounded-xl bg-amber-100/60 text-amber-655 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <DollarSign className="h-4.5 w-4.5 text-amber-600" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Wallet Console</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Payouts & logs</p>
                </div>
              </Link>

              {/* Action 4: Support Desk */}
              <Link
                href="/ap/support"
                className="group flex flex-col justify-between p-4 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/30 hover:border-indigo-200 transition-all duration-200 h-[104px]"
              >
                <span className="p-2 w-9 h-9 rounded-xl bg-indigo-100/60 text-indigo-650 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Support Desk</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Lodge ticket</p>
                </div>
              </Link>
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
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#2563EB]" /> Recent Applications
              </h2>
            </div>
            <Link href="/ap/applications" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5">
              Full Log <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <Card className="backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            {/* Search and Filters Strip */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Filter by customer, service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none transition-colors"
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
                        ? "bg-[#2563EB] text-white border-transparent"
                        : "bg-white text-[#64748B] border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Linear Style Table Content */}
            {filteredApps.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Inbox className="mx-auto h-10 w-10 text-slate-350 animate-pulse" />
                <h4 className="text-xs font-bold text-[#0F172A]">No applications submitted</h4>
                <p className="text-xs text-[#64748B]">Start submitting applications to view analytics.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-slate-50/25">
                      <th className="px-5 py-3">Customer / ID</th>
                      <th className="px-5 py-3">Service Code</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApps.map((app) => {
                      const isApproved = app.status === "completed" || app.status === "approved";
                      const isRejected = app.status === "rejected" || app.status === "cancelled";
                      const isProcessing = app.status === "processing";
                      const isPending = !isApproved && !isRejected && !isProcessing;

                      return (
                        <tr key={app.id} className="group hover:bg-slate-50/45 transition-colors">
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-[#0F172A]">
                                {app.customerName || app.customer_name || "Direct Client"}
                              </p>
                              <p className="text-[10px] font-mono text-[#64748B]">
                                {app.application_code || app.id.slice(0, 8)}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100/70 border border-slate-200/40 px-2 py-0.5 rounded-md">
                              {app.service_name}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              isApproved && "bg-emerald-50 border-emerald-200 text-emerald-700",
                              isRejected && "bg-rose-50 border-rose-200 text-rose-700",
                              isProcessing && "bg-blue-50 border-blue-200 text-blue-700",
                              isPending && "bg-amber-50 border-amber-200 text-amber-700"
                            )}>
                              <span className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isApproved && "bg-[#10B981]",
                                isRejected && "bg-[#EF4444]",
                                isProcessing && "bg-[#2563EB]",
                                isPending && "bg-[#F59E0B]"
                              )} />
                              {app.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/ap/applications/${app.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-all cursor-pointer"
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
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-[#2563EB]" /> Wallet & Payouts
            </h2>
          </div>

          <Card className="backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[24px] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-6">
            {/* Balance figures */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Available Balance</span>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-black text-[#0F172A]">{formatVal(walletBalanceVal, true)}</p>
                  <Link 
                    href="/ap/wallet"
                    className="h-8 px-3 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors border-none"
                  >
                    Withdraw
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                    <Inbox className="h-3 w-3" /> Locked Funds
                  </span>
                  <p className="text-sm font-bold text-[#0F172A]">{formatVal(stats.commissionPending, true)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Approved Commission</span>
                  <p className="text-sm font-bold text-[#10B981]">{formatVal(stats.commissionApproved, true)}</p>
                </div>
              </div>
            </div>

            {/* Quick Transaction Log */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Recent Transactions</span>
              
              {transactions.length === 0 ? (
                <div className="py-6 text-center text-[#64748B] text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-900/02 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "p-1.5 rounded-lg text-xs flex items-center justify-center shrink-0",
                          tx.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {tx.type === "credit" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5 rotate-45" />}
                        </span>
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#0F172A] leading-tight max-w-[140px] truncate">{tx.title}</p>
                          <p className="text-[9px] text-[#64748B] font-semibold">{new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={cn("font-bold font-mono", tx.type === "credit" ? "text-[#10B981]" : "text-[#EF4444]")}>
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
            <Bell className="h-4 w-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">Bulletins & Notices</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <Card 
                key={a.id} 
                className={cn(
                  "border rounded-2xl p-4.5 space-y-2 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md",
                  a.announcement_type === "urgent"
                    ? "border-rose-100 bg-rose-50/10 text-rose-900"
                    : a.announcement_type === "warning"
                    ? "border-amber-100 bg-amber-50/10 text-amber-900"
                    : a.announcement_type === "success"
                    ? "border-emerald-100 bg-emerald-50/10 text-emerald-900"
                    : "border-blue-100 bg-blue-50/10 text-blue-900"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="uppercase tracking-wider opacity-80">{a.announcement_type}</span>
                    {a.published_at && (
                      <span className="font-mono text-slate-400">
                        {new Date(a.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-[#0F172A] leading-snug">{a.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">{a.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
