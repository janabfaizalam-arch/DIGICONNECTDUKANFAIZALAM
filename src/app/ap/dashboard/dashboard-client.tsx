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
  Plus,
  ChevronRight,
  Info,
  DollarSign,
  MessageSquare,
  X,
  TrendingUp,
  Search,
  Lock,
  HandCoins,
  ShieldCheck,
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
import { motion, AnimatePresence } from "framer-motion";
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

interface APDashboardClientProps {
  ap: AgencyPartner;
  stats: APDashboardStats;
  recentApps: RecentApp[];
  announcements: Announcement[];
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "credit" | "debit";
  status: "success" | "pending" | "failed";
  date: string;
}

const MONTHLY_EARNINGS_DATA = [
  { name: "Jan", earnings: 4200, filings: 12 },
  { name: "Feb", earnings: 5800, filings: 18 },
  { name: "Mar", earnings: 7100, filings: 22 },
  { name: "Apr", earnings: 9500, filings: 31 },
  { name: "May", earnings: 14500, filings: 45 },
  { name: "Jun", earnings: 18200, filings: 58 },
];

export function APDashboardClient({ ap, stats, recentApps, announcements }: APDashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  
  // Wallet Recharge sheet
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);
  const [walletBalance, setWalletBalance] = useState(stats.walletBalance);

  // Active support tickets and transactions
  const [supportTicketsCount, setSupportTicketsCount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Chart view: "earnings" | "growth" | "distribution"
  const [activeChartTab, setActiveChartTab] = useState<"earnings" | "growth" | "distribution">("earnings");

  // Application search & filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
    
    // Load active tickets count
    const savedTickets = localStorage.getItem("digiticket_tickets");
    if (savedTickets) {
      try {
        const parsed = JSON.parse(savedTickets);
        setSupportTicketsCount(parsed.filter((t: { status: string }) => t.status !== "Closed").length);
      } catch {
        setSupportTicketsCount(2);
      }
    } else {
      setSupportTicketsCount(2);
    }

    // Load Wallet Balance
    const savedBalance = localStorage.getItem("digipartner_wallet_balance");
    if (savedBalance) {
      setWalletBalance(parseFloat(savedBalance));
    }

    // Load Transaction History or set initial
    const savedTx = localStorage.getItem("digipartner_transactions");
    if (savedTx) {
      try {
        setTransactions(JSON.parse(savedTx));
      } catch {
        // Safe fallback
      }
    } else {
      const initialTx: Transaction[] = [
        { id: "tx-1", title: "Commission Payout Credit", amount: 4500, type: "credit", status: "success", date: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: "tx-2", title: "Wallet Recharge - UPI", amount: 2000, type: "credit", status: "success", date: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: "tx-3", title: "Processing Fee - App #A209B", amount: -150, type: "debit", status: "success", date: new Date(Date.now() - 86400000 * 7).toISOString() }
      ];
      setTransactions(initialTx);
      localStorage.setItem("digipartner_transactions", JSON.stringify(initialTx));
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </div>
    );
  }

  // Handle Quick Wallet Recharge
  const handleRechargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsRecharging(true);
    setTimeout(() => {
      const newBal = walletBalance + amount;
      setWalletBalance(newBal);
      localStorage.setItem("digipartner_wallet_balance", newBal.toString());
      
      // Update transaction list
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: "Wallet Recharge - Razorpay",
        amount: amount,
        type: "credit",
        status: "success",
        date: new Date().toISOString()
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem("digipartner_transactions", JSON.stringify(updatedTx));

      // Post notification
      const savedNotifs = localStorage.getItem("digiticket_notifications");
      if (savedNotifs) {
        try {
          const parsed = JSON.parse(savedNotifs);
          const newNotif = {
            id: `notif-recharge-${Date.now()}`,
            title: "Wallet Recharged Successfully",
            description: `Successfully added Rs. ${amount.toFixed(2)} to your wallet balance.`,
            category: "Wallet & Payouts",
            type: "success",
            createdAt: new Date().toISOString(),
            isRead: false,
            linkUrl: "/ap/wallet",
            actionLabel: "Check Wallet"
          };
          localStorage.setItem("digiticket_notifications", JSON.stringify([newNotif, ...parsed]));
        } catch {
          // Safe fallback
        }
      }

      setIsRecharging(false);
      setIsRechargeOpen(false);
      setRechargeAmount("");
    }, 1500);
  };

  const appDistributionData = [
    { name: "Approved", value: stats.completedApplications || 10, color: "#10B981" },
    { name: "Processing", value: stats.pendingApplications || 4, color: "#2563EB" },
    { name: "Rejected", value: stats.rejectedApplications || 1, color: "#EF4444" },
  ];

  const formatCurrencyLocal = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);
  };

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

  return (
    <div className="space-y-6 pb-12 text-[#0F172A]">
      
      {/* 1. HERO SECTION (Above Fold) */}
      <section className="backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Partner details */}
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

          {/* Right: Performance strip above fold */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-8">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Wallet Balance</span>
              <p className="text-base font-bold text-[#0F172A]">{formatCurrencyLocal(walletBalance)}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Today&apos;s Commission</span>
              <p className="text-base font-bold text-[#10B981]">+₹1,250</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Pending Tasks</span>
              <p className="text-base font-bold text-[#F59E0B]">{stats.pendingApplications} Apps</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Growth Status</span>
              <div className="flex items-center gap-1 text-[#2563EB]">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">+18.2%</span>
              </div>
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
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">{formatCurrencyLocal(walletBalance)}</p>
            <button 
              onClick={() => setIsRechargeOpen(true)}
              className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              Recharge wallet
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </Card>

        {/* Card 2: Earnings */}
        <Card className="group backdrop-blur-xl bg-white/75 border border-[rgba(15,23,42,0.06)] rounded-[20px] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:-translate-y-1 hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Earned Payouts</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/30 group-hover:scale-105 transition-transform">
              <HandCoins className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {formatCurrencyLocal((stats.commissionApproved ?? 0) + (stats.totalPaidPayout ?? 0))}
            </p>
            <p className="text-[10px] font-semibold text-[#64748B]">
              {formatCurrencyLocal(stats.commissionPending ?? 0)} pending audit
            </p>
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
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">{stats.totalApplications}</p>
            <p className="text-[10px] font-semibold text-[#64748B]">
              {stats.completedApplications} approved & active
            </p>
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
            <p className="text-2xl font-bold tracking-tight text-[#0F172A]">{supportTicketsCount}</p>
            <p className="text-[10px] font-semibold text-[#64748B]">Avg. response ~15 mins</p>
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
                  <AreaChart data={MONTHLY_EARNINGS_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
                  <AreaChart data={MONTHLY_EARNINGS_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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

              {/* Action 3: Recharge Wallet */}
              <button
                onClick={() => setIsRechargeOpen(true)}
                className="group flex flex-col justify-between p-4 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100/30 hover:border-amber-200 text-left transition-all duration-200 h-[104px] cursor-pointer"
              >
                <span className="p-2 w-9 h-9 rounded-xl bg-amber-100/60 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <DollarSign className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Add Funds</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Wallet credits</p>
                </div>
              </button>

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
                <Inbox className="mx-auto h-10 w-10 text-slate-350" />
                <h4 className="text-xs font-bold text-[#0F172A]">No records located</h4>
                <p className="text-xs text-[#64748B]">Adjust search inputs or apply new filings to view records.</p>
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
                  <p className="text-2xl font-black text-[#0F172A]">{formatCurrencyLocal(walletBalance)}</p>
                  <button 
                    onClick={() => setIsRechargeOpen(true)}
                    className="h-8 px-3 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border-none transition-colors"
                  >
                    Recharge
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked Funds
                  </span>
                  <p className="text-sm font-bold text-[#0F172A]">{formatCurrencyLocal(stats.commissionPending ?? 0)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Approved Commission</span>
                  <p className="text-sm font-bold text-[#10B981]">{formatCurrencyLocal(stats.commissionApproved ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Quick Transaction Log */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Recent Transactions</span>
              
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
                      {tx.type === "credit" ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
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

      {/* 6. MODALS & BOTTOM SHEETS WITH ANNIHILATED OVERLAYS */}
      <AnimatePresence>
        {isRechargeOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              onClick={() => setIsRechargeOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Bottom Sheet Modal Container */}
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { y: "100%", opacity: 0.5 },
                visible: { 
                  y: 0, 
                  opacity: 1,
                  transition: { type: "spring", damping: 25, stiffness: 350 } 
                },
                exit: { 
                  y: "100%", 
                  opacity: 0.5,
                  transition: { duration: 0.15 } 
                }
              }}
              className="relative w-full rounded-t-[32px] md:rounded-[24px] bg-white border border-slate-200/50 shadow-2xl p-6 md:p-8 max-h-[85vh] md:max-w-md overflow-hidden z-10"
            >
              {/* Drag handle visible only on mobile */}
              <div className="h-1 w-12 rounded-full bg-slate-200 mx-auto mb-5 md:hidden" />

              <button
                onClick={() => setIsRechargeOpen(false)}
                className="absolute right-6 top-6 md:top-8 text-slate-400 hover:text-slate-800 p-1 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 border border-emerald-100 text-[10px] font-bold text-emerald-700 rounded-full uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" /> Secure Recharge
                </div>
                <h3 className="text-base font-extrabold text-[#0F172A] mt-1.5">Recharge Account Wallet</h3>
                <p className="text-xs text-[#64748B]">
                  Processing is handled securely via our verified Razorpay API integration.
                </p>
              </div>

              <form onSubmit={handleRechargeSubmit} className="space-y-4.5 mt-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="100000"
                    placeholder="Minimum ₹100"
                    value={rechargeAmount}
                    onChange={e => setRechargeAmount(e.target.value)}
                    className="w-full h-12 rounded-[16px] bg-slate-50 px-4 text-xs font-semibold text-[#0F172A] border border-slate-200 focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRecharging}
                  className="w-full h-12 rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  {isRecharging ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Initializing Gateway...
                    </>
                  ) : (
                    "Initiate Razorpay Transfer"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
