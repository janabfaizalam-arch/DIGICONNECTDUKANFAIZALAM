"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Plus,
  WalletCards,
  Gift,
  FolderOpen,
  HelpCircle,
  UserRound,
  LogOut,
  Bell,
  Copy,
  Check,
  Share2,
  Send,
  Upload,
  ShieldCheck,
  X,
  Menu,
  Mail,
  Phone,
  Download,
  Sparkles,
  Eye,
  MessageCircle,
  ShieldAlert,
  Compass,
  Award,
  TrendingUp,
  UserPlus,
  ChevronRight,
  AlertCircle,
  CheckSquare,
  Clock
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import { ApplyServiceTrigger } from "@/components/service-selection-modal";
import { StatusBadge, PaymentBadge } from "@/components/portal/status-badge";
import type { CustomerDashboardApplication, CustomerDashboardStats } from "@/lib/customer-dashboard-data";
import { useToast } from "@/components/providers/toast-provider";

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: string;
  document_name?: string | null;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  storage_path?: string | null;
  status?: string | null;
  review_status?: string | null;
  uploaded_by_role?: string | null;
  is_final?: boolean | null;
  uploaded_at?: string | null;
  created_at: string;
}

export interface CustomerNotification {
  id: string;
  user_id: string;
  application_id?: string | null;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
  priority?: "critical" | "important" | "normal" | "completed";
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export interface ReferralItem {
  id: string;
  referred_user_id: string;
  referral_code: string;
  status: "pending" | "completed" | "rejected";
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
}

export interface ReferralSummaryData {
  code: string;
  link: string;
  referrals: ReferralItem[];
  total: number;
  pending: number;
  completed: number;
  rewardEarned: number;
}

export interface WalletSnapshotData {
  wallet: {
    balance?: number;
    balance_points: number;
    total_reward_earned: number;
    total_reward_redeemed: number;
    total_cashback_earned?: number;
    total_cashback_used?: number;
  } | null;
  transactions: WalletTransaction[];
  cashbackEarned: number;
  cashbackUsed: number;
  referralSummary: ReferralSummaryData | null;
}

export interface ProfileStatusData {
  profile: {
    dob?: string | null;
    gender?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    photo_url?: string | null;
    full_name?: string | null;
    mobile?: string | null;
    email?: string | null;
  } | null;
  complete: boolean;
  completion: {
    completed: number;
    total: number;
    percent: number;
  };
}

interface CustomerDashboardProps {
  applications: CustomerDashboardApplication[];
  stats: CustomerDashboardStats;
  profile: {
    name: string;
  };
  isProfileIncomplete?: boolean;
  walletSnapshot?: WalletSnapshotData | null;
  profileStatus?: ProfileStatusData | null;
  documents?: ApplicationDocument[];
  notifications?: CustomerNotification[];
  user: SupabaseUser;
}

type Tab = "dashboard" | "applications" | "wallet" | "referral" | "documents" | "support" | "profile";

const popularServices = [
  { slug: "cibil-credit-health", name: "CIBIL Credit Health Report", amount: 299, desc: "Check CIBIL report, analysis & fix expert guidelines.", badge: "Popular" },
  { slug: "eshram-card-registration", name: "eShram Card Registration", amount: 99, desc: "Submit unorganized worker profile & download card.", badge: "Gov Scheme" },
  { slug: "pvc-card-printing", name: "PVC Card Printing & Delivery", amount: 149, desc: "Print high-quality waterproof polymer smart cards.", badge: "Trending" },
  { slug: "gst-registration", name: "GST Registration & Filing", amount: 499, desc: "Create new GSTIN portal accounts and file tax.", badge: "Business" },
  { slug: "itr-filing", name: "Income Tax ITR Filing", amount: 999, desc: "File your annual taxes under expert CA consultation.", badge: "Tax Care" }
];

export function CustomerDashboard({
  applications,
  stats,
  profile,
  isProfileIncomplete = false,
  walletSnapshot = null,
  profileStatus = null,
  documents = [],
  notifications = [],
  user
}: CustomerDashboardProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Document upload state
  const [uploadAppId, setUploadAppId] = useState("");
  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Time based greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Safe currency helper
  const safeCurrency = (val: number | null | undefined) => {
    return formatCurrency(val ?? 0);
  };

  // Safe string initials helper
  const initials = useMemo(() => {
    const parts = profile.name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0)}${parts[1]?.charAt(0)}`.toUpperCase();
    }
    return profile.name.slice(0, 2).toUpperCase();
  }, [profile.name]);

  // Statistics counters
  const counters = useMemo(() => {
    const total = applications.length;
    let pending = 0;
    let processing = 0;
    let completed = 0;
    let rejected = 0;

    applications.forEach((app) => {
      const status = (app.status as string) === "in_process" ? "in_progress" : app.status;
      if (status === "completed" || status === "delivered") {
        completed++;
      } else if (status === "rejected" || status === "objection") {
        rejected++;
      } else if (status === "in_progress" || status === "assigned_to_agent" || status === "submitted") {
        processing++;
      } else {
        pending++;
      }
    });

    return { total, pending, processing, completed, rejected };
  }, [applications]);

  // Active Applications List (only those that are in process or pending action)
  const activeApplications = useMemo(() => {
    return applications.filter((app) => 
      !["completed", "delivered", "rejected", "cancelled"].includes(app.status)
    );
  }, [applications]);

  // Referral milestones calculations
  const referralSummary = walletSnapshot?.referralSummary || null;
  const invitesCount = referralSummary?.total ?? stats.totalReferrals ?? 0;
  const milestone = useMemo(() => {
    let currentLevel = 1;
    let nextGoal = 10;
    let levelName = "Bronze Tier";
    
    if (invitesCount >= 50) {
      currentLevel = 4;
      nextGoal = 100;
      levelName = "Platinum Tier";
    } else if (invitesCount >= 25) {
      currentLevel = 3;
      nextGoal = 50;
      levelName = "Gold Tier";
    } else if (invitesCount >= 10) {
      currentLevel = 2;
      nextGoal = 25;
      levelName = "Silver Tier";
    }

    const progress = Math.min((invitesCount / nextGoal) * 100, 100);
    return { currentLevel, nextGoal, levelName, progress };
  }, [invitesCount]);

  // Smart Notifications unread filter
  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.read_at).length;
  }, [notifications]);

  // Priority notification badge style mapping
  const getNotifPriorityBadge = (notif: CustomerNotification) => {
    const priority = notif.priority || (notif.title.toLowerCase().includes("rejected") || notif.title.toLowerCase().includes("failed") ? "critical" : notif.title.toLowerCase().includes("pending") ? "important" : "normal");
    switch (priority) {
      case "critical":
        return { label: "Action Required", bg: "bg-rose-500/15 border-rose-500/30 text-rose-400" };
      case "important":
        return { label: "Important", bg: "bg-orange-500/15 border-orange-500/30 text-orange-400" };
      case "completed":
        return { label: "Completed", bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" };
      default:
        return { label: "Update", bg: "bg-blue-500/15 border-blue-500/30 text-blue-400" };
    }
  };

  // Support phone expert routing logic
  const getSupportDetails = (serviceName?: string) => {
    if (!serviceName) {
      return { phone: "+917007595931", name: "General Support" };
    }
    const name = serviceName.toLowerCase();
    const keywords = ["cibil", "credit", "loan", "finance", "card", "score", "repair", "report"];
    if (keywords.some((k) => name.includes(k))) {
      return { phone: "+918287002983", name: "CIBIL & Finance Expert" };
    }
    return { phone: "+917007595931", name: "General Support" };
  };

  // 5-step stepper calculation and progress percentage
  const getTimelineSteps = (app: CustomerDashboardApplication) => {
    const status = (app.status as string) === "in_process" ? "in_progress" : app.status;
    const payStatus = app.payment_status;

    const isSubmitted = true;
    const isPaymentDone = payStatus === "paid" || payStatus === "verified" || !["payment_pending", "draft"].includes(status);
    const isDocsVerified = !["draft", "payment_pending", "submitted", "documents_required", "document_pending"].includes(status);
    const isProcessing = ["in_progress", "assigned_to_agent", "completed", "delivered"].includes(status);
    const isCompleted = ["completed", "delivered"].includes(status);

    let progressPercent = 20;
    if (isCompleted) progressPercent = 100;
    else if (isProcessing) progressPercent = 80;
    else if (isDocsVerified) progressPercent = 60;
    else if (isPaymentDone) progressPercent = 40;

    return {
      percent: progressPercent,
      steps: [
        { label: "Submitted", active: isSubmitted },
        { label: "Payment Done", active: isPaymentDone },
        { label: "Docs Verified", active: isDocsVerified },
        { label: "Processing", active: isProcessing },
        { label: "Completed", active: isCompleted }
      ]
    };
  };

  // Date filter functions
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= oneWeekAgo;
  };

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // Referral breakdown calculations
  const referralBreakdown = useMemo(() => {
    const refs = referralSummary?.referrals || [];
    
    const countToday = refs.filter(r => isToday(r.created_at)).length;
    const countWeek = refs.filter(r => isThisWeek(r.created_at)).length;
    const countMonth = refs.filter(r => isThisMonth(r.created_at)).length;
    const countLife = refs.length;

    const completedToday = refs.filter(r => r.status === "completed" && r.completed_at && isToday(r.completed_at)).length;
    const completedWeek = refs.filter(r => r.status === "completed" && r.completed_at && isThisWeek(r.completed_at)).length;
    const completedMonth = refs.filter(r => r.status === "completed" && r.completed_at && isThisMonth(r.completed_at)).length;
    const completedLife = refs.filter(r => r.status === "completed").length;

    const conversionRate = refs.length > 0 ? Math.round((completedLife / refs.length) * 100) : 0;

    return {
      today: { invites: countToday, completed: completedToday, rewards: completedToday * 100 },
      week: { invites: countWeek, completed: completedWeek, rewards: completedWeek * 100 },
      month: { invites: countMonth, completed: completedMonth, rewards: completedMonth * 100 },
      lifetime: { invites: countLife, completed: completedLife, rewards: completedLife * 100 },
      conversionRate
    };
  }, [referralSummary]);

  // Wallet breakdown calculations
  const walletBreakdown = useMemo(() => {
    const txs = walletSnapshot?.transactions || [];
    
    const thisMonthCashback = txs
      .filter(tx => tx.type === "cashback" && isThisMonth(tx.created_at))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const thisMonthReferrals = txs
      .filter(tx => ["referrer_bonus", "referral_bonus", "referrer_signup_bonus", "referrer_first_service_bonus"].includes(tx.type) && isThisMonth(tx.created_at))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingBalance = (referralSummary?.pending ?? 0) * 100;

    return {
      thisMonthCashback,
      thisMonthReferrals,
      pendingBalance
    };
  }, [walletSnapshot, referralSummary]);

  // Smart Recommendation rules
  const recommendedServices = useMemo(() => {
    const activeSlugs: string[] = applications.map(a => {
      const name = a.service_name.toLowerCase();
      if (name.includes("gst")) return "gst-registration";
      if (name.includes("itr") || name.includes("tax")) return "itr-filing";
      if (name.includes("cibil") || name.includes("credit")) return "cibil-credit-health";
      if (name.includes("pvc") || name.includes("card")) return "pvc-card-printing";
      if (name.includes("eshram") || name.includes("shram")) return "eshram-card-registration";
      return "";
    }).filter(Boolean);
    const appliedCibil = activeSlugs.includes("cibil-credit-health");
    const appliedGST = activeSlugs.includes("gst-registration");
    const appliedITR = activeSlugs.includes("itr-filing");

    const recs: { slug: string; name: string; amount: number; desc: string; badge: string; reason: string }[] = [];
    
    // Rule 1: If has ITR but no GST, recommend GST
    if (appliedITR && !appliedGST) {
      const gst = popularServices.find(s => s.slug === "gst-registration");
      if (gst) recs.push({ ...gst, reason: "Recommended for business tax mapping" });
    }
    
    // Rule 2: If no CIBIL check, recommend CIBIL
    if (!appliedCibil) {
      const cibil = popularServices.find(s => s.slug === "cibil-credit-health");
      if (cibil) recs.push({ ...cibil, reason: "Check bureau health scoring" });
    }

    // Rule 3: Always suggest PVC card as seasonal utility print
    const pvc = popularServices.find(s => s.slug === "pvc-card-printing");
    if (pvc) recs.push({ ...pvc, reason: "Order premium polymer cards" });

    // Fallbacks
    if (recs.length < 3) {
      popularServices.forEach(s => {
        if (!activeSlugs.includes(s.slug) && recs.length < 3 && !recs.find(r => r.slug === s.slug)) {
          recs.push({ ...s, reason: "Popular choice among customers" });
        }
      });
    }

    return recs;
  }, [applications]);

  // Share handlers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralSummary?.code || stats.code || "");
    setCopiedCode(true);
    toastSuccess("Referral code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralSummary?.link || stats.link || "");
    setCopiedLink(true);
    toastSuccess("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    const refLink = referralSummary?.link || stats.link || "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "DigiConnect Dukan",
          text: "Register on DigiConnect Dukan using my referral link & get immediate cashbacks on essential services!",
          url: refLink
        });
      } catch {
        console.warn("Share failed");
      }
    } else {
      handleCopyLink();
    }
  };

  // Sign out handle
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.auth.signOut();
      toastSuccess("Logged out successfully.");
      router.replace("/login/customer");
      router.refresh();
    } catch {
      toastError("Logout failed. Please try again.");
    }
  };

  // Drag and Drop files handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toastError("Invalid format. PDF, JPG, PNG or WebP files are allowed.");
      return;
    }
    if (file.size > maxSize) {
      toastError("File exceeds 5MB limit. Please compress it.");
      return;
    }

    setUploadFile(file);
    if (!uploadDocType) {
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setUploadDocType(baseName.replace(/[-_]/g, " "));
    }
  };

  const handleDocumentSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadAppId) {
      toastError("Please select an application.");
      return;
    }
    if (!uploadFile) {
      toastError("Please select a file.");
      return;
    }
    if (!uploadDocType.trim()) {
      toastError("Please enter a document name.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    
    const formData = new FormData();
    formData.append("documentType", uploadDocType.trim());
    formData.append("file", uploadFile);

    try {
      setUploadProgress(40);
      const res = await fetch(`/api/customer/applications/${uploadAppId}/documents`, {
        method: "POST",
        body: formData
      });
      setUploadProgress(80);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress(100);
      toastSuccess("Document uploaded successfully!");
      setUploadFile(null);
      setUploadDocType("");
      setUploadAppId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Document upload failed. Please try again.";
      toastError(errMsg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Close notifications popover on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notif-container")) {
        setShowNotifPopover(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#070d1e_0%,#03050c_100%)] text-slate-100 font-sans antialiased overflow-x-hidden md:flex">
      
      {/* 1. SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-950/80 backdrop-blur-xl border-r border-white/5 shrink-0 fixed h-full top-0 left-0 z-30 justify-between p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
            </div>
            <span className="font-heading text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DigiPortal
            </span>
          </div>

          <nav className="space-y-1.5" aria-label="Desktop sidebar navigation">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "applications", label: "My Applications", icon: FileText },
              { id: "wallet", label: "Wallet & Cashback", icon: WalletCards },
              { id: "referral", label: "Refer & Earn", icon: Gift },
              { id: "documents", label: "Documents Hub", icon: FolderOpen },
              { id: "support", label: "Support Center", icon: HelpCircle },
              { id: "profile", label: "Profile Settings", icon: UserRound }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as Tab);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/20 text-white shadow-lg shadow-blue-500/5 font-bold"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-400" : ""}`} />
                  {item.label}
                  {item.id === "applications" && counters.pending > 0 && (
                    <span className="ml-auto bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                      {counters.pending}
                    </span>
                  )}
                </button>
              );
            })}
            
            <ApplyServiceTrigger className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all duration-200 text-left">
              <Plus className="h-4.5 w-4.5" />
              New Application
            </ApplyServiceTrigger>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{profile.name}</p>
              <p className="text-[10px] font-medium text-slate-400 truncate">Customer</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all active:scale-[0.98]"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* 2. TOP STICKY GLASS HEADER */}
        <header className="sticky top-0 z-20 w-full px-4 py-3 bg-[#070d1e]/70 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs font-semibold">{getTimeGreeting()},</span>
                <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Verified Account
                </span>
              </div>
              <h1 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs">{profile.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell with unread counter */}
            <div className="relative notif-container">
              <button
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="p-2.5 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white transition duration-200 relative cursor-pointer"
                title="View Alerts"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 bg-rose-500 text-white font-black text-[9px] flex items-center justify-center rounded-full ring-2 ring-[#070d1e]">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
              
              {showNotifPopover && (
                <div className="absolute right-0 top-12 z-50 w-76 sm:w-80 rounded-[20px] border border-white/10 bg-slate-950 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-300 font-heading">Smart Alerts</p>
                    <span className="text-[10px] font-bold text-slate-500">{unreadNotifCount} Unread</span>
                  </div>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No recent alerts.</p>
                    ) : (
                      notifications.map((notif) => {
                        const badge = getNotifPriorityBadge(notif);
                        return (
                          <div key={notif.id} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition duration-150 text-xs space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="text-[9px] text-slate-600">
                                {new Date(notif.created_at).toLocaleDateString("en-IN", { dateStyle: "short" })}
                              </span>
                            </div>
                            <p className="font-bold text-slate-200">{notif.title}</p>
                            <p className="text-slate-400 leading-normal">{notif.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <ApplyServiceTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all duration-200">
              <Plus className="h-3.5 w-3.5" />
              Apply
            </ApplyServiceTrigger>
          </div>
        </header>

        {/* MOBILE DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 bg-slate-950 border-r border-white/5 p-6 flex flex-col justify-between h-full z-10 animate-in slide-in-from-left duration-250">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
                    </div>
                    <span className="font-heading text-lg font-bold text-white">DigiPortal</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1.5" aria-label="Mobile menu navigation">
                  {[
                    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                    { id: "applications", label: "My Applications", icon: FileText },
                    { id: "wallet", label: "Wallet & Cashback", icon: WalletCards },
                    { id: "referral", label: "Refer & Earn", icon: Gift },
                    { id: "documents", label: "Documents Hub", icon: FolderOpen },
                    { id: "support", label: "Support Center", icon: HelpCircle },
                    { id: "profile", label: "Profile Settings", icon: UserRound }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as Tab);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-blue-600/20 border border-blue-500/20 text-white font-bold"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN PANEL CONTENT VIEW */}
        <main className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl w-full mx-auto pb-24 md:pb-8">
          
          {/* PROFILE INCOMPLETE BANNER */}
          {isProfileIncomplete && (
            <div className="relative overflow-hidden rounded-[20px] border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4 shadow-lg backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%,rgba(249,115,22,0.1),transparent_35%)]" />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-orange-300">Complete Account Profile</p>
                  <p className="text-xs text-slate-400 leading-normal">
                    Update your mobile, PIN code, and location data to request new premium digital services without friction.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("profile")}
                className="h-9 px-4 rounded-full bg-orange-500 text-slate-950 hover:bg-orange-400 text-xs font-extrabold transition-all shrink-0 active:scale-95 shadow-md"
              >
                Complete Now
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD (OVERVIEW HUB) */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* DASHBOARD HERO - ABOVE THE FOLD VISIBILITY */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-5 md:p-6 text-white shadow-xl min-h-[160px] flex flex-col justify-between">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_90%_90%,rgba(249,115,22,0.14),transparent_30%)]" />
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      {getTimeGreeting()}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                      {profile.name}
                    </h2>
                    {activeApplications.length > 0 ? (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-orange-400 animate-spin" />
                        <span>You have <strong>{activeApplications.length}</strong> active applications in process.</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">All applications are up to date.</p>
                    )}
                  </div>

                  {/* ATF Right: Wallet point snapshot */}
                  <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 rounded-2xl shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Wallet Balance</p>
                      <p className="text-xl font-black text-emerald-400">
                        {safeCurrency(walletSnapshot?.wallet?.balance_points ?? stats.walletBalance)}
                      </p>
                      <p className="text-[8px] text-slate-400">Redeemable Points</p>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <button
                      onClick={() => setActiveTab("wallet")}
                      className="h-9 w-9 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition"
                      title="Redeem Wallet"
                    >
                      <WalletCards className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5 mt-4">
                  <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                    <span>Pending: <strong className="text-orange-400">{counters.pending}</strong></span>
                    <span>Processing: <strong className="text-blue-400">{counters.processing}</strong></span>
                    <span>Completed: <strong className="text-emerald-400">{counters.completed}</strong></span>
                  </div>
                  
                  <ApplyServiceTrigger className="h-9 px-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-black text-white hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">
                    Apply New Service
                  </ApplyServiceTrigger>
                </div>
              </div>

              {/* TACTILE 3D QUICK ACTIONS */}
              <section aria-label="3D Quick Actions" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                  { id: "new", label: "Apply Service", icon: Plus, gradient: "from-blue-600 to-indigo-600 shadow-blue-500/20", action: "modal" },
                  { id: "applications", label: "Track Application", icon: FileText, gradient: "from-slate-800 to-slate-900" },
                  { id: "documents", label: "Upload Documents", icon: Upload, gradient: "from-slate-800 to-slate-900" },
                  { id: "wallet", label: "Wallet Balance", icon: WalletCards, gradient: "from-slate-800 to-slate-900" },
                  { id: "referral", label: "Refer & Earn", icon: Gift, gradient: "from-slate-800 to-slate-900" },
                  { id: "support", label: "Help & Support", icon: HelpCircle, gradient: "from-slate-800 to-slate-900" }
                ].map((act) => {
                  const Icon = act.icon;
                  const isApply = act.action === "modal";

                  const CardBody = (
                    <div className="flex flex-col items-center justify-center text-center p-4.5 rounded-2xl border border-white/20 bg-slate-950/40 hover:bg-slate-950 transition duration-300 group hover:-translate-y-1 h-full min-h-[110px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.3)]">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${act.gradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-all`}>
                        <Icon className="h-5.5 w-5.5 text-white" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-200 group-hover:text-white tracking-wide">{act.label}</span>
                    </div>
                  );

                  if (isApply) {
                    return (
                      <ApplyServiceTrigger key={act.id} className="cursor-pointer block text-left">
                        {CardBody}
                      </ApplyServiceTrigger>
                    );
                  }

                  return (
                    <button
                      key={act.id}
                      onClick={() => setActiveTab(act.id as Tab)}
                      className="cursor-pointer block text-left w-full active:scale-98 transition-all"
                    >
                      {CardBody}
                    </button>
                  );
                })}
              </section>

              {/* 2-Column Grid (Main Details) */}
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                
                {/* Recent Applications List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Your Active Applications</h3>
                    <button onClick={() => setActiveTab("applications")} className="text-xs font-extrabold text-blue-400 hover:underline">
                      See All Applications &rarr;
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-3xl border border-white/5 space-y-4">
                      <p className="text-sm font-bold text-slate-400">No active applications found.</p>
                      <ApplyServiceTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-bold text-white">
                        Apply Now
                      </ApplyServiceTrigger>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applications.slice(0, 5).map((app) => {
                        const timeline = getTimelineSteps(app);
                        const supportDetails = getSupportDetails(app.service_name);
                        const whatsAppUrl = `https://api.whatsapp.com/send?phone=${supportDetails.phone}&text=${encodeURIComponent(`Hi, I need assistance with my application: ${app.service_name} (ID: ${app.id}). Status: ${app.status}`)}`;

                        return (
                          <div key={app.id} className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/10 transition space-y-4 shadow-md">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                  <Compass className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-extrabold text-white leading-tight">{app.service_name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-mono text-slate-500">ID: {app.id.slice(0, 8)}...</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(app.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={app.status} />
                                <PaymentBadge status={app.payment_status ?? "pending"} />
                              </div>
                            </div>

                            {/* TIMELINE PROGRESS TRACKER */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                <span>Progress Stage</span>
                                <span className="text-blue-400 font-extrabold">{timeline.percent}% Complete</span>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${timeline.percent}%` }}
                                />
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-[8px] font-bold text-slate-600 text-center">
                                {timeline.steps.map((st, sIdx) => (
                                  <span key={sIdx} className={st.active ? "text-blue-400" : ""}>
                                    {st.label}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Application CTAs */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                              <div className="text-xs font-black text-slate-200">
                                Amount: {formatCurrency(app.total_amount ?? app.amount)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/dashboard/applications/${app.id}`}
                                  className="inline-flex h-8 items-center justify-center gap-1 px-3 rounded-full border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-300 transition"
                                >
                                  <Eye className="h-3 w-3" />
                                  Details
                                </Link>

                                {["documents_required", "document_pending"].includes(app.status) && (
                                  <button
                                    onClick={() => {
                                      setUploadAppId(app.id);
                                      setActiveTab("documents");
                                    }}
                                    className="inline-flex h-8 items-center justify-center gap-1 px-3 rounded-full bg-orange-500 text-slate-950 font-black text-xs transition active:scale-95 shadow-sm"
                                  >
                                    <Upload className="h-3 w-3" />
                                    Upload Docs
                                  </button>
                                )}

                                {app.payment_status === "pending" && (
                                  <Link
                                    href={`/pay/application/${app.id}`}
                                    className="inline-flex h-8 items-center justify-center gap-1 px-3 rounded-full bg-blue-600 text-white font-black text-xs transition active:scale-95"
                                  >
                                    Pay Now
                                  </Link>
                                )}

                                <a
                                  href={whatsAppUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-8 items-center justify-center gap-1 px-3 rounded-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-bold border border-emerald-500/20"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Support
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column (Wallet & Referral Widgets) */}
                <div className="space-y-6">
                  
                  {/* Glass Wallet Box */}
                  <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                        <WalletCards className="h-4 w-4 text-blue-400" />
                        Wallet Snapshot
                      </span>
                      <button onClick={() => setActiveTab("wallet")} className="text-xs font-bold text-blue-400 hover:underline">
                        Ledger &rarr;
                      </button>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-white">
                          {safeCurrency(walletSnapshot?.wallet?.balance_points ?? stats.walletBalance)}
                        </p>
                        <span className="inline-flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          <TrendingUp className="h-3 w-3" /> +15% Growth
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1.5 leading-none">
                        &bull; 20% cashback ready for next service apply
                      </p>
                    </div>
                    <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-center text-xs">
                      <div>
                        <p className="text-slate-500 font-bold">Total Earned</p>
                        <p className="font-extrabold text-slate-200 mt-0.5">
                          {safeCurrency(walletSnapshot?.wallet?.total_reward_earned ?? stats.lifetimeEarning)}
                        </p>
                      </div>
                      <div className="border-l border-white/5">
                        <p className="text-slate-500 font-bold">Pending cashback</p>
                        <p className="font-extrabold text-orange-400 mt-0.5">
                          {safeCurrency(walletBreakdown.pendingBalance)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Glass Referral Box */}
                  <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                        <Gift className="h-4 w-4 text-orange-400" />
                        Refer & Earn
                      </span>
                      <button onClick={() => setActiveTab("referral")} className="text-xs font-bold text-orange-400 hover:underline">
                        Stats &rarr;
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400">Share code and earn ₹100 per signup</p>
                      <div className="flex items-center justify-between bg-white/5 rounded-xl p-2.5 border border-white/5">
                        <span className="font-mono text-sm font-bold text-white tracking-widest">
                          {referralSummary?.code || stats.code || "SYNCING"}
                        </span>
                        <button onClick={handleCopyCode} className="p-1 text-slate-400 hover:text-white relative">
                          {copiedCode ? <Check className="h-4 w-4 text-emerald-400 animate-scale" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Milestone ({milestone.levelName})</span>
                        <span>{invitesCount}/{milestone.nextGoal} Invites</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Smart Recommendations Grid */}
              <section aria-label="Smart Recommendations" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Compass className="h-4.5 w-4.5 text-blue-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Smart Recommendations</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recommendedServices.map((serv) => (
                    <div key={serv.slug} className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/10 hover:-translate-y-1 transition duration-300 flex flex-col justify-between h-full min-h-[160px]">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                            {serv.badge}
                          </span>
                          <span className="text-xs font-black text-emerald-400">{formatCurrency(serv.amount)}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-2.5 leading-tight">{serv.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-normal">{serv.desc}</p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{serv.reason}</span>
                        <ApplyServiceTrigger serviceSlug={serv.slug} className="h-8 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-extrabold text-white px-4 transition cursor-pointer">
                          Apply Now
                        </ApplyServiceTrigger>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}

          {/* TAB 2: MY APPLICATIONS LIST VIEW */}
          {activeTab === "applications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Track Applications</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Filter and review your service submissions ledger.</p>
                </div>
                <ApplyServiceTrigger className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white transition active:scale-95">
                  Apply Service
                </ApplyServiceTrigger>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-white/5 space-y-4">
                  <p className="text-sm font-bold text-slate-400">You haven&apos;t filed any applications yet.</p>
                  <p className="text-xs text-slate-500">Apply for a tax, insurance, or Gov ID service to get started.</p>
                  <ApplyServiceTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-xs font-bold text-white">
                    Apply New Service
                  </ApplyServiceTrigger>
                </div>
              ) : (
                <div className="grid gap-4">
                  {applications.map((app) => {
                    const timeline = getTimelineSteps(app);
                    const supportDetails = getSupportDetails(app.service_name);
                    const whatsAppUrl = `https://api.whatsapp.com/send?phone=${supportDetails.phone}&text=${encodeURIComponent(`Hi, I need assistance with my application: ${app.service_name} (ID: ${app.id}). Status: ${app.status}`)}`;

                    return (
                      <div key={app.id} className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/10 transition-all space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-extrabold text-white leading-normal">{app.service_name}</h3>
                            <p className="text-[10px] font-mono text-slate-500 mt-1">ID: {app.id}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Created: {new Date(app.created_at).toLocaleDateString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={app.status} />
                            <PaymentBadge status={app.payment_status ?? "pending"} />
                          </div>
                        </div>

                        {/* Interactive timeline progress representations */}
                        <div className="py-4 px-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                            <span>Timeline Steps</span>
                            <span className="text-blue-400">{timeline.percent}% Complete</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${timeline.percent}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {timeline.steps.map((st, sIdx) => (
                              <div key={sIdx} className="space-y-1.5 text-center">
                                <div className="flex items-center justify-center">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    st.active
                                      ? "bg-blue-600 text-white shadow-md"
                                      : "bg-white/10 text-slate-500"
                                  }`}>
                                    {sIdx + 1}
                                  </div>
                                </div>
                                <span className={`block text-[9px] font-bold truncate ${st.active ? "text-blue-400" : "text-slate-600"}`}>
                                  {st.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5 text-xs">
                          <span className="font-extrabold text-slate-200">
                            Service Cost: {formatCurrency(app.total_amount ?? app.amount)}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/applications/${app.id}`}
                              className="inline-flex h-8 items-center justify-center gap-1 px-4 rounded-full border border-white/10 hover:bg-white/5 font-bold text-slate-300 transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </Link>

                            {["documents_required", "document_pending"].includes(app.status) && (
                              <button
                                onClick={() => {
                                  setUploadAppId(app.id);
                                  setActiveTab("documents");
                                }}
                                className="inline-flex h-8 items-center justify-center gap-1 px-4 rounded-full bg-orange-500 text-slate-950 font-black transition active:scale-95"
                              >
                                <Upload className="h-3.5 w-3.5 animate-bounce" />
                                Upload Files
                              </button>
                            )}

                            {app.payment_status === "pending" && (
                              <Link
                                href={`/pay/application/${app.id}`}
                                className="inline-flex h-8 items-center justify-center gap-1 px-4 rounded-full bg-blue-600 text-white font-black transition active:scale-95"
                              >
                                Pay Invoice
                              </Link>
                            )}

                            <a
                              href={whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/20"
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp Help
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WALLET DASHBOARD */}
          {activeTab === "wallet" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-white">Wallet Overview</h2>
              
              {/* Detailed Financial balance blocks */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                
                {/* Available points */}
                <div className="p-5 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/10 border border-blue-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-3 relative overflow-hidden">
                  <div className="absolute top-3 right-3 h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Balance</p>
                  <p className="text-3xl font-black text-white">
                    {safeCurrency(walletSnapshot?.wallet?.balance_points ?? stats.walletBalance)}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold">&bull; Ready to redeem on next order</p>
                </div>

                {/* Pending balance */}
                <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-3 relative overflow-hidden">
                  <div className="absolute top-3 right-3 h-10 w-10 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-400">
                    <Clock className="h-5 w-5 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Balance</p>
                  <p className="text-3xl font-black text-orange-400">
                    {safeCurrency(walletBreakdown.pendingBalance)}
                  </p>
                  <p className="text-[10px] text-slate-500">Unlocks after referred user completes order</p>
                </div>

                {/* Cashback vs rewards summary */}
                <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-3 relative overflow-hidden sm:col-span-2 lg:col-span-1">
                  <div className="absolute top-3 right-3 h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Cashback</p>
                  <p className="text-3xl font-black text-amber-400">
                    {safeCurrency(walletSnapshot?.cashbackEarned ?? stats.lifetimeEarning)}
                  </p>
                  <div className="flex gap-4 text-[9px] font-bold text-slate-500">
                    <span>This Month: <strong>{safeCurrency(walletBreakdown.thisMonthCashback)}</strong></span>
                  </div>
                </div>

              </div>

              {/* Transactions Ledger */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Recent Transactions</h3>
                
                {!walletSnapshot?.transactions?.length ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-3xl border border-white/5 space-y-3">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">No transactions recorded yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {walletSnapshot.transactions.map((tx) => {
                      const isCredit = tx.amount > 0 && !["redeem", "expiry", "redemption"].includes(tx.type);
                      return (
                        <div key={tx.id} className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase text-slate-400 rounded">
                                {tx.type.replace(/_/g, " ")}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                tx.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-500"
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-200 mt-2 break-words leading-snug">{tx.description}</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {new Date(tx.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </p>
                          </div>
                          <span className={`text-sm font-black shrink-0 ${isCredit ? "text-emerald-400" : "text-orange-400"}`}>
                            {isCredit ? "+" : "-"} {safeCurrency(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: REFERRAL CENTER */}
          {activeTab === "referral" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-white">Referral Hub</h2>

              {/* Funnel Layout */}
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Referral Conversion Funnel</h3>
                
                <div className="grid gap-4 sm:grid-cols-4 text-center">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1 relative">
                    <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10 text-slate-600">
                      <ChevronRight className="h-4.5 w-4.5" />
                    </div>
                    <UserPlus className="h-6 w-6 text-blue-400 mx-auto" />
                    <p className="text-lg font-black text-white">{invitesCount}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Invites Sent</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1 relative">
                    <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10 text-slate-600">
                      <ChevronRight className="h-4.5 w-4.5" />
                    </div>
                    <CheckSquare className="h-6 w-6 text-indigo-400 mx-auto" />
                    <p className="text-lg font-black text-white">{referralSummary?.referrals?.length ?? 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Registered</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1 relative">
                    <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10 text-slate-600">
                      <ChevronRight className="h-4.5 w-4.5" />
                    </div>
                    <Award className="h-6 w-6 text-emerald-400 mx-auto" />
                    <p className="text-lg font-black text-white">{referralSummary?.completed ?? 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Completed Orders</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <TrendingUp className="h-6 w-6 text-amber-400 mx-auto" />
                    <p className="text-lg font-black text-emerald-400">{referralBreakdown.conversionRate}%</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Conversion Rate</p>
                  </div>
                </div>
              </div>

              {/* Timeframe breakdown grid table */}
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Performance Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-400">
                    <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-white/5">
                      <tr>
                        <th className="py-2.5">Timeframe</th>
                        <th className="py-2.5">Signups</th>
                        <th className="py-2.5">Completed Orders</th>
                        <th className="py-2.5 text-right">Rewards Unlocked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold text-slate-200">
                      <tr>
                        <td className="py-3">Today</td>
                        <td className="py-3">{referralBreakdown.today.invites}</td>
                        <td className="py-3">{referralBreakdown.today.completed}</td>
                        <td className="py-3 text-right text-emerald-400">+{safeCurrency(referralBreakdown.today.rewards)}</td>
                      </tr>
                      <tr>
                        <td className="py-3">This Week</td>
                        <td className="py-3">{referralBreakdown.week.invites}</td>
                        <td className="py-3">{referralBreakdown.week.completed}</td>
                        <td className="py-3 text-right text-emerald-400">+{safeCurrency(referralBreakdown.week.rewards)}</td>
                      </tr>
                      <tr>
                        <td className="py-3">This Month</td>
                        <td className="py-3">{referralBreakdown.month.invites}</td>
                        <td className="py-3">{referralBreakdown.month.completed}</td>
                        <td className="py-3 text-right text-emerald-400">+{safeCurrency(referralBreakdown.month.rewards)}</td>
                      </tr>
                      <tr>
                        <td className="py-3">Lifetime</td>
                        <td className="py-3">{referralBreakdown.lifetime.invites}</td>
                        <td className="py-3">{referralBreakdown.lifetime.completed}</td>
                        <td className="py-3 text-right text-emerald-400">+{safeCurrency(referralBreakdown.lifetime.rewards)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sharing Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Your Referral Code</p>
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 font-mono font-bold text-white text-base">
                    <span>{referralSummary?.code || stats.code || "SYNCING"}</span>
                    <button onClick={handleCopyCode} className="p-1 text-slate-400 hover:text-white relative cursor-pointer">
                      {copiedCode ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Referral Link</p>
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-slate-400 truncate">
                    <span className="truncate mr-4">{referralSummary?.link || stats.link || "SYNCING"}</span>
                    <button onClick={handleCopyLink} className="p-1 text-slate-400 hover:text-white relative shrink-0 cursor-pointer">
                      {copiedLink ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Working Shares */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Share Link Directly</h3>
                <div className="flex flex-wrap gap-2.5 animate-pulse-subtle">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join DigiConnect Dukan using my referral link & earn cashbacks on Gov ID & Tax services! ${referralSummary?.link || stats.link}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(referralSummary?.link || stats.link || "")}&text=${encodeURIComponent("Join DigiConnect Dukan and request digital applications with cashback bonus!")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <Send className="h-4 w-4" /> Telegram
                  </a>

                  <a
                    href={`sms:?&body=${encodeURIComponent(`Join DigiConnect Dukan using my link to file applications and get cashback rewards: ${referralSummary?.link || stats.link}`)}`}
                    className="inline-flex h-10 items-center justify-center gap-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
                  >
                    <Mail className="h-4 w-4" /> SMS
                  </a>

                  <button
                    onClick={handleShare}
                    className="inline-flex h-10 items-center justify-center gap-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" /> Native Share
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: DOCUMENT HUB */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-white">Documents Center</h2>
              
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Upload Required Files</h3>
                
                {applications.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    You do not have any active applications. Apply for a service to upload documents.
                  </p>
                ) : (
                  <form onSubmit={handleDocumentSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Application</label>
                        <select
                          value={uploadAppId}
                          onChange={(e) => setUploadAppId(e.target.value)}
                          required
                          className="h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-slate-100 outline-none focus:border-blue-500 transition"
                        >
                          <option value="" className="text-slate-950">Select Application...</option>
                          {applications.map((app) => (
                            <option key={app.id} value={app.id} className="text-slate-950">
                              {app.service_name} (ID: {app.id.slice(0, 8)}...)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Type / Name</label>
                        <input
                          type="text"
                          value={uploadDocType}
                          onChange={(e) => setUploadDocType(e.target.value)}
                          placeholder="e.g. Aadhar Card, PAN Card, Photo"
                          required
                          className="h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                        dragActive
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : uploadFile
                            ? "border-emerald-500/50 bg-emerald-500/5 text-slate-200"
                            : "border-white/10 hover:border-white/20 bg-white/5"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                      />
                      <Upload className={`h-8 w-8 ${uploadFile ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
                      <div>
                        {uploadFile ? (
                          <p className="text-xs font-bold text-emerald-400 truncate max-w-xs">{uploadFile.name}</p>
                        ) : (
                          <p className="text-xs font-bold text-slate-300">
                            Drag &amp; drop document or <span className="text-blue-400">click to browse</span>
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">PDF, JPG, PNG or WebP up to 5MB</p>
                      </div>
                    </div>

                    {isUploading && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Uploading file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploading || !uploadFile}
                      className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-extrabold text-white flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? "Uploading Document..." : "Submit File"}
                    </button>
                  </form>
                )}
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Your Uploaded Files</h3>
                
                {documents.length === 0 ? (
                  <p className="p-6 text-center text-xs font-semibold text-slate-500 bg-slate-950/20 rounded-2xl border border-white/5">
                    No files uploaded yet.
                  </p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {documents.map((doc) => {
                      const appRef = applications.find((a) => a.id === doc.application_id);
                      const isRejected = doc.status === "rejected" || doc.review_status === "rejected";
                      return (
                        <div key={doc.id} className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between gap-3 text-xs">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                {doc.document_type || "Customer Upload"}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                doc.status === "approved" || doc.review_status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : isRejected
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-white/5 text-slate-400"
                              }`}>
                                {doc.review_status || doc.status || "Pending Review"}
                              </span>
                            </div>
                            <p className="font-bold text-slate-200 truncate mt-1">{doc.file_name}</p>
                            {appRef && (
                              <p className="text-[10px] text-slate-500">For application: {appRef.service_name}</p>
                            )}
                            
                            {isRejected && (
                              <div className="p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 flex items-start gap-1.5 mt-1 text-[10px]">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <span className="text-rose-300 leading-normal font-bold">
                                  Rejection reason: File not clear or blurry. Please re-upload.
                                </span>
                              </div>
                            )}
                            
                            <p className="text-[9px] text-slate-600">
                              Uploaded: {new Date(doc.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </p>
                          </div>
                          <div className="flex gap-2 border-t border-white/5 pt-2 mt-1">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 font-bold text-slate-300 text-xs transition cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download File
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 6: SUPPORT CENTER */}
          {activeTab === "support" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-white">Support Center</h2>
              
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/5 space-y-4">
                <p className="text-xs text-slate-400 leading-normal">
                  Our professional finance experts and coordinators are available to answer queries regarding documents, taxes, and loan approvals.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { title: "CIBIL & Finance Expert", phone: "+91 8287002983", desc: "Expert coordinator for bureau scoring, loans, credit cards & audit repair." },
                    { title: "Primary Support Line", phone: "+91 7007595931", desc: "Coordinating status check updates, uploads assistance & portal login." },
                    { title: "Office Support Desk", phone: "+91 9305086491", desc: "General services, payments reconciliation, and print receipts query." }
                  ].map((sup, idx) => {
                    const rawPhone = sup.phone.replace(/[^0-9+]/g, "");
                    const whatsAppUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(`Hi, I need support regarding DigiConnect Dukan.`)}`;

                    return (
                      <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                            {sup.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal">{sup.desc}</p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${rawPhone}`}
                            className="flex-1 h-9 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-extrabold text-white transition active:scale-95 cursor-pointer"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call Expert
                          </a>
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 h-9 flex items-center justify-center gap-1 border border-emerald-500/20 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-xl text-xs font-bold text-emerald-400 transition cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>General Email Support:</span>
                  <a href="mailto:digiconnectdukan@rnos.in" className="font-extrabold text-blue-400 hover:underline">
                    digiconnectdukan@rnos.in
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-white">Profile Details</h2>

              <div className="p-6 rounded-3xl bg-slate-950/60 border border-white/5 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">{profile.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">UID: {user.id}</p>
                  </div>
                </div>

                <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Profile Completeness</span>
                    <span>{profileStatus?.completion?.percent ?? 40}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      style={{ width: `${profileStatus?.completion?.percent ?? 40}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-500 font-bold">Full Name</p>
                    <p className="font-extrabold text-slate-200 mt-1">{profileStatus?.profile?.full_name || profile.name}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-500 font-bold">Mobile Number</p>
                    <p className="font-extrabold text-slate-200 mt-1">{profileStatus?.profile?.mobile || user.phone || "Not Set"}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-500 font-bold">City / Location</p>
                    <p className="font-extrabold text-slate-200 mt-1">{profileStatus?.profile?.city || "Not Set"}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-500 font-bold">PIN Code</p>
                    <p className="font-extrabold text-slate-200 mt-1">{profileStatus?.profile?.pincode || "Not Set"}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/5">
                  <Link
                    href="/customer/profile"
                    className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    Edit Contact Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="h-10 px-5 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition active:scale-95"
                  >
                    Logout Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* 3. BOTTOM FLOATING NAV DOCK (MOBILE) */}
        <nav
          className="md:hidden fixed bottom-4 left-4 right-4 h-14 rounded-2xl bg-[#070d1e]/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.5)] z-40 flex items-center justify-around px-3"
          aria-label="Mobile navigation dock"
        >
          {[
            { id: "dashboard", label: "Home", icon: LayoutDashboard },
            { id: "applications", label: "Files", icon: FileText },
            { id: "wallet", label: "Wallet", icon: WalletCards },
            { id: "documents", label: "Files Hub", icon: FolderOpen },
            { id: "support", label: "Support", icon: HelpCircle }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                }}
                className={`flex flex-col items-center justify-center p-1.5 transition-all duration-200 active:scale-[0.9] ${
                  isActive ? "text-blue-400" : "text-slate-400"
                }`}
                aria-label={item.label}
              >
                <Icon className={`h-5 w-5 ${isActive ? "scale-105" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-black mt-1 tracking-wider uppercase">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </div>
  );
}
