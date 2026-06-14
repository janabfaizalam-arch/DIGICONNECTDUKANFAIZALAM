"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  HandCoins,
  WalletCards,
  Users,
  PlusCircle,
  ArrowRight,
  Bell,
  Sparkles,
  Plus,
  Cpu,
  Check,
  Zap,
  ChevronRight,
  Info,
  DollarSign,
  MessageSquare,
  X
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
  Cell
} from "recharts";

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
  
  // Wallet Recharge Dialog
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);
  const [walletBalance, setWalletBalance] = useState(stats.walletBalance);

  // Quick Lead Capture Modal
  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [leadService, setLeadService] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // AI Beta Queue
  const [isInBetaQueue, setIsInBetaQueue] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);

  // Support ticket counter (simulated from local storage)
  const [supportTicketsCount, setSupportTicketsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Load local storage items to determine count of tickets and custom balance
    const savedTickets = localStorage.getItem("digiticket_tickets");
    if (savedTickets) {
      try {
        const parsed = JSON.parse(savedTickets);
        setSupportTicketsCount(parsed.filter((t: { status: string }) => t.status !== "Closed").length);
      } catch {
        // Safe fallback
      }
    } else {
      setSupportTicketsCount(2); // Mock count
    }

    const savedBalance = localStorage.getItem("digipartner_wallet_balance");
    if (savedBalance) {
      setWalletBalance(parseFloat(savedBalance));
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Handle Quick Wallet Recharge
  const handleRechargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsRecharging(true);
    // Simulate Razorpay gateway loader
    setTimeout(() => {
      const newBal = walletBalance + amount;
      setWalletBalance(newBal);
      localStorage.setItem("digipartner_wallet_balance", newBal.toString());
      setIsRecharging(false);
      setIsRechargeOpen(false);
      setRechargeAmount("");
      
      // Post a transaction alert into notification console if we can
      const savedNotifs = localStorage.getItem("digiticket_notifications");
      if (savedNotifs) {
        try {
          const parsed = JSON.parse(savedNotifs);
          const newNotif = {
            id: `notif-recharge-${Date.now()}`,
            title: "Wallet Recharged Successfully",
            description: `Successfully added Rs. ${amount.toFixed(2)} to your wallet balance via Razorpay gateway.`,
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
    }, 2000);
  };

  // Handle Quick Lead Capture
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadMobile.trim()) return;

    setIsSubmittingLead(true);

    // Call CRM route to add lead
    try {
      const res = await fetch("/api/ap/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          mobile: leadMobile,
          serviceId: leadService || null,
          source: "Direct Portal Dashboard",
          notes: "Quick lead captured from AP Dashboard workspace."
        })
      });

      if (res.ok) {
        setLeadName("");
        setLeadMobile("");
        setLeadService("");
        setIsLeadOpen(false);
        
        // Notify
        alert("Lead captured and added to CRM sheets successfully.");
      } else {
        alert("Failed to save lead. Please try again.");
      }
    } catch {
      alert("Error submitting lead.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Join AI Beta Queue
  const handleJoinBetaQueue = () => {
    setIsQueueing(true);
    setTimeout(() => {
      setIsQueueing(false);
      setIsInBetaQueue(true);
    }, 1500);
  };

  // Dynamic distribution chart data for applications
  const appDistributionData = [
    { name: "Completed", value: stats.completedApplications || 10, color: "#10b981" },
    { name: "Processing", value: stats.pendingApplications || 4, color: "#3b82f6" },
    { name: "Cancelled/Rejected", value: stats.rejectedApplications || 1, color: "#f43f5e" },
  ];

  const formatCurrencyLocal = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3.5 py-1.5 border border-blue-500/20 text-xs font-bold text-blue-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              DigiPartner Hub • Live Workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent sm:text-4xl md:text-5xl">
              {ap.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
              <span className="rounded bg-white/5 px-2.5 py-1 border border-white/5 font-semibold text-slate-300">
                Partner ID: {ap.partner_code}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
              <span className="font-semibold text-indigo-400 capitalize bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                {ap.partner_type.replace("_", " ")}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
              <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/5 px-2 py-0.5 border border-amber-500/10 rounded">
                {ap.tier?.name || "AP Starter"} Tier
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => setIsRechargeOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 border border-white/10 hover:bg-slate-800 px-5 font-bold text-white transition-all text-sm"
            >
              <WalletCards className="h-4.5 w-4.5 text-emerald-400" /> Wallet Recharge
            </button>
            <Link
              href="/ap/applications/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 font-bold text-white shadow-lg shadow-indigo-950/40 hover:from-blue-500 hover:to-indigo-500 transition-all text-sm"
            >
              <PlusCircle className="h-4.5 w-4.5" /> New Application
            </Link>
          </div>
        </div>
      </section>

      {/* KYC Alert */}
      {ap.kyc_status !== "approved" && (
        <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 md:p-5 backdrop-blur-md">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-300">KYC Verification Underway: {ap.kyc_status.toUpperCase()}</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed font-semibold">
                Your agency partner profile and automated withdrawal privileges will unlock fully once documents are verified by our compliance verifiers.
              </p>
              <Link href="/ap/profile" className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-yellow-400 hover:text-yellow-300">
                Go to Document Upload
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Stats Matrix Grid */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Wallet Balance Card */}
        <Card className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-900/30 p-5 backdrop-blur-md shadow-lg shadow-blue-950/5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Wallet Balance</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <WalletCards className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {formatCurrencyLocal(walletBalance)}
          </p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">Instant gateway settle ready</p>
        </Card>

        {/* Total Earned Commission Card */}
        <Card className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-5 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Earned Payouts</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HandCoins className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {formatCurrencyLocal((stats.commissionApproved ?? 0) + (stats.totalPaidPayout ?? 0))}
          </p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{formatCurrencyLocal(stats.commissionPending ?? 0)} pending review</p>
        </Card>

        {/* Completed Services Card */}
        <Card className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-5 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Services</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {stats.completedApplications}
          </p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{stats.totalApplications} total applications filed</p>
        </Card>

        {/* Active Support Tickets Card */}
        <Card className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-5 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Tickets</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <MessageSquare className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {supportTicketsCount}
          </p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">Average response time ~15 mins</p>
        </Card>
      </section>

      {/* Analytics Recharts workspace */}
      <section className="grid gap-6 lg:grid-cols-12">
        
        {/* Area Chart: Commission earnings trend */}
        <Card className="lg:col-span-8 border border-white/5 bg-slate-900/40 p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-white text-base">Monthly Earnings Growth</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">Commission & Application Volume Trend</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5 text-[10px] font-bold text-slate-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> Commission Credits (INR)
              </div>
            </div>
            
            {/* Chart frame */}
            <div className="h-64 mt-6 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_EARNINGS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#64748b", fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#earningsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold border-t border-white/5 pt-4 mt-2">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>Charts indicate cumulative growth across services. Next settlement batch scheduled for Tuesday morning.</span>
          </div>
        </Card>

        {/* Pie/Donut Chart: Applications breakdown */}
        <Card className="lg:col-span-4 border border-white/5 bg-slate-900/40 p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-white text-base">Application Ratios</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">Verifications breakdown</p>

            <div className="h-48 mt-4 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {appDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px" }}
                    itemStyle={{ fontSize: "11px", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Central text */}
              <div className="absolute text-center">
                <p className="text-2xl font-black text-white">{stats.totalApplications || 15}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Applications</p>
              </div>
            </div>

            {/* Labels and legends */}
            <div className="space-y-2.5 mt-4">
              {appDistributionData.map((d, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-300">{d.name}</span>
                  </div>
                  <span className="text-white font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

      </section>

      {/* Quick Action Matrix */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-white">Partner Quick Operations</h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {/* Action: New App */}
          <Link
            href="/ap/applications/new"
            className="group p-4 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 transition-all flex flex-col justify-between min-h-[100px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
              <PlusCircle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">New Submission</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Apply for customer</p>
            </div>
          </Link>

          {/* Action: Add Customer */}
          <Link
            href="/ap/customers"
            className="group p-4 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 transition-all flex flex-col justify-between min-h-[100px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Add Customer</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Save customer logs</p>
            </div>
          </Link>

          {/* Action: Add Lead CRM */}
          <button
            onClick={() => setIsLeadOpen(true)}
            className="group text-left p-4 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 transition-all flex flex-col justify-between min-h-[100px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
              <Plus className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Log CRM Lead</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Track follow-ups</p>
            </div>
          </button>

          {/* Action: Wallet Recharge */}
          <button
            onClick={() => setIsRechargeOpen(true)}
            className="group text-left p-4 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 transition-all flex flex-col justify-between min-h-[100px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <WalletCards className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Recharge Wallet</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Digital payment credits</p>
            </div>
          </button>

          {/* Action: Open Support Ticket */}
          <Link
            href="/ap/support"
            className="group p-4 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 transition-all flex flex-col justify-between min-h-[100px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Lodge Support Ticket</p>
              <p className="text-[10px] text-slate-500 mt-0.5">KYC / refund desk</p>
            </div>
          </Link>
        </div>
      </section>

      {/* AI Assistant Integration (AI Readiness Hooks) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400 animate-pulse" /> DigiPartner AI Beta Suite
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Modern, AI-driven automation layers upcoming in DigiConnect Dukan</p>
          </div>

          {!isInBetaQueue ? (
            <button
              onClick={handleJoinBetaQueue}
              disabled={isQueueing}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 font-bold text-white transition-all text-xs"
            >
              {isQueueing ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Requesting...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 fill-current" /> Join Beta Queue
                </>
              )}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 text-xs font-bold text-emerald-400">
              <Check className="h-4 w-4" /> Position #109 Registered
            </div>
          )}
        </div>

        {/* AI widgets grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card: AI Copilot */}
          <Card className="relative overflow-hidden border border-white/5 bg-slate-900/20 p-5 rounded-2xl group">
            <span className="absolute right-3 top-3 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-extrabold text-indigo-400 tracking-wider uppercase">
              Soon
            </span>
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-200">AI Application Copilot</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Scan customer documents over WhatsApp, and let our LLM parse and fill forms in 3 seconds.
              </p>
            </div>
          </Card>

          {/* Card: AI Lead Scorer */}
          <Card className="relative overflow-hidden border border-white/5 bg-slate-900/20 p-5 rounded-2xl group">
            <span className="absolute right-3 top-3 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-extrabold text-indigo-400 tracking-wider uppercase">
              Soon
            </span>
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-200">AI Lead Scorer</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Analyze CRM records to predict which inquiries are highly likely to convert, maximizing commission.
              </p>
            </div>
          </Card>

          {/* Card: AI OCR Compliance */}
          <Card className="relative overflow-hidden border border-white/5 bg-slate-900/20 p-5 rounded-2xl group">
            <span className="absolute right-3 top-3 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-extrabold text-indigo-400 tracking-wider uppercase">
              Soon
            </span>
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-200">Document Compliance OCR</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Instantly flag blurry photos, incorrect Aadhaar/PAN formats, or signature issues prior to filing.
              </p>
            </div>
          </Card>

          {/* Card: AI Demand Analytics */}
          <Card className="relative overflow-hidden border border-white/5 bg-slate-900/20 p-5 rounded-2xl group">
            <span className="absolute right-3 top-3 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-extrabold text-indigo-400 tracking-wider uppercase">
              Soon
            </span>
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-200">Revenue Demand Analytics</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Predict high-demand regional services for the upcoming week based on local transaction volume trends.
              </p>
            </div>
          </Card>

        </div>
      </section>

      {/* Recent Applications & Announcements row */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Recent Applications */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Recent Applications Log
            </h2>
            <Link href="/ap/applications" className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300">
              View All Log <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Card className="overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-md rounded-2xl">
            {recentApps.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="mt-4 text-sm font-bold text-slate-300">No applications yet</h3>
                <p className="mt-1 text-xs text-slate-500">Submit your first application to earn commission!</p>
                <Link
                  href="/ap/applications/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-4 py-2 border border-blue-500/20 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all"
                >
                  Submit Application
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentApps.map((app) => (
                  <div key={app.id} className="p-4 hover:bg-white/5 transition-all duration-150">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">{app.customerName || app.customer_name}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-600" />
                          <span className="text-xs text-slate-400 font-semibold">{app.service_name}</span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-500">
                          Code: {app.application_code || app.id.slice(0, 8)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize border ${
                            app.status === "completed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : app.status === "rejected" || app.status === "cancelled"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}
                        >
                          {app.status.replace("_", " ")}
                        </span>

                        <Link
                          href={`/ap/applications/${app.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 transition-all"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Announcements & Bulletins */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            Bulletins & Updates
          </h2>

          <Card className="overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-md rounded-2xl p-4 space-y-3">
            {announcements.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                No system updates at this time.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3.5 space-y-1.5 bg-slate-950/30 ${
                      a.announcement_type === "urgent"
                        ? "border-rose-500/30 text-rose-200"
                        : a.announcement_type === "warning"
                        ? "border-amber-500/30 text-amber-200"
                        : a.announcement_type === "success"
                        ? "border-emerald-500/30 text-emerald-200"
                        : "border-blue-500/30 text-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="uppercase tracking-wide opacity-75">{a.announcement_type}</span>
                      {a.published_at && (
                        <span className="text-slate-500 font-mono">
                          {new Date(a.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-xs text-white leading-snug">{a.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-line">{a.body}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Wallet Recharge Dialog Modal */}
      {isRechargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsRechargeOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 rounded-full">
                <DollarSign className="h-3 w-3" /> Secure Payment
              </div>
              <h2 className="text-lg font-extrabold text-white mt-1.5">Recharge Balance</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter amount to credit. Processing is managed through Razorpay.
              </p>
            </div>

            <form onSubmit={handleRechargeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (INR)</label>
                <input
                  type="number"
                  required
                  min="100"
                  max="100000"
                  placeholder="Minimum Rs. 100"
                  value={rechargeAmount}
                  onChange={e => setRechargeAmount(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-slate-200 border border-white/5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isRecharging}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isRecharging ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting Gateway...
                  </>
                ) : (
                  "Initiate Razorpay Pay"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CRM Quick Lead Capture Modal */}
      {isLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsLeadOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2 py-0.5 border border-purple-500/20 text-[10px] font-bold text-purple-400">
                CRM Capture Box
              </div>
              <h2 className="text-lg font-extrabold text-white mt-1.5">Capture Lead Quick</h2>
              <p className="text-xs text-slate-400 mt-1">
                Save prospective clients, mobile inquiries and requested service categories.
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-slate-200 border border-white/5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  value={leadMobile}
                  onChange={e => setLeadMobile(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-slate-200 border border-white/5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requested Service (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CM Yuva Scheme, GST Filing"
                  value={leadService}
                  onChange={e => setLeadService(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-slate-200 border border-white/5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLead}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md flex items-center justify-center"
              >
                {isSubmittingLead ? "Saving Lead..." : "Save Lead to CRM"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
