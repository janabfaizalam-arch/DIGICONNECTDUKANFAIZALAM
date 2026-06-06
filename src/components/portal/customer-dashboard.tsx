"use client";

import Link from "next/link";
import Image from "next/image";
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
  Clock,
  Globe,
  Save,
  Shield,
  Search,
  Lock
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import { ApplyServiceTrigger } from "@/components/service-selection-modal";
import { StatusBadge, PaymentBadge } from "@/components/portal/status-badge";
import type { CustomerDashboardApplication, CustomerDashboardStats } from "@/lib/customer-dashboard-data";
import { useToast } from "@/components/providers/toast-provider";
import { servicesData } from "@/lib/services-data";

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
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    photo_url?: string | null;
    full_name?: string | null;
    mobile?: string | null;
    email?: string | null;
    updated_at?: string | null;
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

  // Unified SPA Tab Routing from query param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["dashboard", "applications", "wallet", "referral", "documents", "support", "profile"].includes(tabParam)) {
        setActiveTab(tabParam as Tab);
      }
    }
  }, []);

  // Notifications Popover & List state
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState<CustomerNotification[]>([]);

  useEffect(() => {
    const hasGst = applications.some(app => app.service_name.toLowerCase().includes("gst"));
    const hasItr = applications.some(app => app.service_name.toLowerCase().includes("itr"));
    let finalNotifications = [...notifications];
    if (hasGst) {
      const mockGstNotifications: CustomerNotification[] = [
        {
          id: "mock-notif-gst-1",
          user_id: user?.id || "",
          title: "GST Registration Submitted",
          message: "Your GST application has been successfully filed with the common portal. CA assignment complete.",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "normal"
        },
        {
          id: "mock-notif-gst-2",
          user_id: user?.id || "",
          title: "Action Required: Verify Documents",
          message: "CA Specialist flagged trade license verification. Check Documents Center.",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "critical"
        },
        {
          id: "mock-notif-gst-3",
          user_id: user?.id || "",
          title: "ARN Generated: Sync Successful",
          message: "ARN AA270626002134F generated for your return filing. Tracking enabled.",
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "important"
        },
        {
          id: "mock-notif-gst-4",
          user_id: user?.id || "",
          title: "₹200 GST Cashback Credited",
          message: "Autopilot reward of ₹200 credited to your active wallet balance.",
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          priority: "completed"
        },
        {
          id: "mock-notif-gst-5",
          user_id: user?.id || "",
          title: "GSTR Compliance Filing Alert",
          message: "Monthly GSTR-1 Sales return deadline is active. Ensure invoice sync.",
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          priority: "critical"
        }
      ];
      
      // Merge unique notifications
      finalNotifications = [...mockGstNotifications, ...finalNotifications.filter(n => !n.id.startsWith("mock-notif-gst-"))];
    }
    if (hasItr) {
      const mockItrNotifications: CustomerNotification[] = [
        {
          id: "mock-notif-itr-1",
          user_id: user?.id || "",
          title: "ITR Form 16 Parsed Successfully",
          message: "Your Form-16 has been parsed. Tax preparation under New Tax Regime has started.",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "normal"
        },
        {
          id: "mock-notif-itr-2",
          user_id: user?.id || "",
          title: "CA Expert Assigned",
          message: "CA Rohit Gupta has been assigned to verify your tax computations and claim maximum eligible deductions.",
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "important"
        },
        {
          id: "mock-notif-itr-3",
          user_id: user?.id || "",
          title: "₹150 ITR Cashback Credited",
          message: "Wallet cashback reward of ₹150 has been credited to your active wallet balance.",
          created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          priority: "completed"
        },
        {
          id: "mock-notif-itr-4",
          user_id: user?.id || "",
          title: "ITR-V Acknowledgement Ready",
          message: "Assisted filing completed successfully. Download your ITR-V acknowledgement receipt in the Compliance Vault.",
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: "completed"
        }
      ];
      finalNotifications = [...mockItrNotifications, ...finalNotifications.filter(n => !n.id.startsWith("mock-notif-itr-"))];
    }
    setLocalNotifications(finalNotifications);
    setUnreadNotifCount(finalNotifications.filter(n => !n.read_at).length);
  }, [notifications, applications, user?.id]);

  const handleMarkAllRead = async () => {
    try {
      const supabase = createClient();
      if (!supabase) return;
      
      // Update locally first for instant feedback
      setLocalNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadNotifCount(0);
      toastSuccess("All notifications marked as read.");
      
      const unreadIds = localNotifications.filter(n => !n.read_at).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);

      if (error) {
        console.warn("Failed to mark notifications read in DB:", error);
      }
    } catch {
      // Ignored for UX
    }
  };

  // Custom Service Selector Modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceCategory, setServiceCategory] = useState("All");

  // Profile Warning Banner & dismissal state
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissedUntil = localStorage.getItem("profile_warning_dismissed_until");
      if (dismissedUntil) {
        if (new Date().getTime() < Number(dismissedUntil)) {
          setWarningDismissed(true);
        } else {
          localStorage.removeItem("profile_warning_dismissed_until");
        }
      }
    }
  }, []);

  const handleDismissWarning = () => {
    if (typeof window !== "undefined") {
      const sevenDaysFromNow = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("profile_warning_dismissed_until", String(sevenDaysFromNow));
      setWarningDismissed(true);
    }
  };

  // Profile Form States
  const [localProfile, setLocalProfile] = useState<NonNullable<ProfileStatusData["profile"]>>(profileStatus?.profile || {});
  const dbProfile = localProfile;

  // Reactively sync props if profileStatus changes
  useEffect(() => {
    if (profileStatus?.profile) {
      setLocalProfile(profileStatus.profile);
    }
  }, [profileStatus]);

  const getCustomerMobile = (prof: NonNullable<ProfileStatusData["profile"]> | null | undefined, usr: SupabaseUser | null | undefined) => {
    return prof?.mobile || usr?.phone || usr?.user_metadata?.mobile || usr?.user_metadata?.phone || "";
  };

  const [formFullName, setFormFullName] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formPincode, setFormPincode] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formState, setFormState] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formDob, setFormDob] = useState("");
  
  // Smart Pincode state
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [pincodeFetched, setPincodeFetched] = useState(false);
  const lastFetchedPincodeRef = useRef("");

  // Preference states (WhatsApp support, Language, Notification)
  const [prefWhatsapp, setPrefWhatsapp] = useState(true);
  const [prefLanguage, setPrefLanguage] = useState("Hindi");
  const [prefNotifications, setPrefNotifications] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Populate form values from props/dbProfile
  useEffect(() => {
    setFormFullName(dbProfile.full_name || profile.name || "");
    setFormMobile(getCustomerMobile(dbProfile, user));
    setFormPincode(dbProfile.pincode || "");
    setFormCity(dbProfile.city || "");
    setFormDistrict(dbProfile.district || "");
    setFormState(dbProfile.state || "");
    setFormAddress(dbProfile.address || "");
    setFormGender(dbProfile.gender || "");
    setFormDob(dbProfile.dob || "");
    lastFetchedPincodeRef.current = dbProfile.pincode || "";

    // Retrieve preferences from metadata or localStorage
    if (typeof window !== "undefined") {
      const storedPrefs = localStorage.getItem(`customer_prefs_${user.id}`);
      if (storedPrefs) {
        try {
          const parsed = JSON.parse(storedPrefs);
          setPrefWhatsapp(parsed.whatsapp ?? true);
          setPrefLanguage(parsed.language ?? "Hindi");
          setPrefNotifications(parsed.notifications ?? true);
        } catch {
          // Ignored
        }
      } else {
        setPrefWhatsapp(Boolean(user.user_metadata.whatsapp_support ?? true));
        setPrefLanguage(String(user.user_metadata.language_preference ?? "Hindi"));
        setPrefNotifications(Boolean(user.user_metadata.notification_preference ?? true));
      }
    }
  }, [dbProfile, profile.name, user]);

  // Trigger smart pincode lookup when pincode has exactly 6 digits
  useEffect(() => {
    if (formPincode.length === 6 && /^\d{6}$/.test(formPincode) && formPincode !== lastFetchedPincodeRef.current) {
      const fetchPincodeDetails = async () => {
        setIsPincodeLoading(true);
        setPincodeFetched(false);
        try {
          const res = await fetch(`/api/pincode?pincode=${formPincode}`);
          const data = await res.json();
          if (data.success && data.ok) {
            setFormCity(data.city || "");
            setFormDistrict(data.district || "");
            setFormState(data.state || "");
            setPincodeFetched(true);
            lastFetchedPincodeRef.current = formPincode;
            toastSuccess("Location autofilled successfully.");
          } else {
            toastError("PIN code details not found. Please enter manually.");
          }
        } catch {
          toastError("Failed to fetch location details.");
        } finally {
          setIsPincodeLoading(false);
        }
      };
      void fetchPincodeDetails();
    } else if (formPincode.length === 6 && formPincode === lastFetchedPincodeRef.current) {
      setPincodeFetched(true);
    } else {
      setPincodeFetched(false);
    }
  }, [formPincode, toastSuccess, toastError]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);

    try {
      if (!formFullName.trim()) throw new Error("Full Name is required.");
      if (!formMobile.trim()) throw new Error("Mobile Number is required.");
      if (!/^[6-9]\d{9}$/.test(formMobile)) throw new Error("Enter a valid Indian 10-digit mobile number.");
      if (!/^\d{6}$/.test(formPincode)) throw new Error("Enter a valid 6-digit PIN code.");
      if (!formCity.trim()) throw new Error("City / Main Post Office is required.");
      if (!formDistrict.trim()) throw new Error("District is required.");
      if (!formState.trim()) throw new Error("State is required.");

      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client not initialized.");

      // Calculate profile completeness (7/7 check)
      const valuesToCheck = {
        full_name: formFullName.trim(),
        email: user.email || "",
        mobile: formMobile.trim(),
        pincode: formPincode.trim(),
        city: formCity.trim(),
        district: formDistrict.trim(),
        state: formState.trim()
      };
      
      const isComplete = Object.values(valuesToCheck).every(v => String(v).trim().length > 0);

      // Save to customer_profiles
      const { error: profileError } = await supabase
        .from("customer_profiles")
        .upsert({
          id: user.id,
          full_name: formFullName.trim(),
          mobile: formMobile.trim(),
          email: user.email || "",
          pincode: formPincode.trim(),
          city: formCity.trim(),
          district: formDistrict.trim(),
          state: formState.trim(),
          address: formAddress.trim(),
          gender: formGender || null,
          dob: formDob || null,
          profile_completed: isComplete,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Save to profiles (double-table upsert)
      const { error: legacyProfileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: formFullName.trim(),
          mobile: formMobile.trim(),
          email: user.email || "",
          pincode: formPincode.trim(),
          city: formCity.trim(),
          district: formDistrict.trim(),
          state: formState.trim(),
          updated_at: new Date().toISOString()
        });

      if (legacyProfileError) throw legacyProfileError;

      // Save preferences to localStorage
      const prefs = {
        whatsapp: prefWhatsapp,
        language: prefLanguage,
        notifications: prefNotifications
      };
      localStorage.setItem(`customer_prefs_${user.id}`, JSON.stringify(prefs));

      // Sync variables to Supabase auth user metadata
      await supabase.auth.updateUser({
        data: {
          whatsapp_support: prefWhatsapp,
          language_preference: prefLanguage,
          notification_preference: prefNotifications,
          mobile: formMobile.trim(),
          phone: formMobile.trim(),
          pincode: formPincode.trim(),
          city: formCity.trim(),
          district: formDistrict.trim(),
          state: formState.trim(),
          full_name: formFullName.trim()
        }
      });

      // Update local state instantly for real-time reactivity
      const updatedProfile = {
        ...localProfile,
        full_name: formFullName.trim(),
        mobile: formMobile.trim(),
        pincode: formPincode.trim(),
        city: formCity.trim(),
        district: formDistrict.trim(),
        state: formState.trim(),
        address: formAddress.trim(),
        gender: formGender || null,
        dob: formDob || null,
        profile_completed: isComplete,
        updated_at: new Date().toISOString()
      };
      setLocalProfile(updatedProfile);

      toastSuccess("Profile settings saved successfully.");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    const displayName = dbProfile.full_name || profile.name || "";
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0)}${parts[1]?.charAt(0)}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [dbProfile.full_name, profile.name]);

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

  // GST specific helpers
  const getExpectedCompletionDate = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    created.setDate(created.getDate() + 3);
    return created.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const getDaysLeftForGstr1 = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDate = new Date(currentYear, currentMonth, 11);
    if (now > dueDate) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getDaysLeftForGstr3b = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDate = new Date(currentYear, currentMonth, 20);
    if (now > dueDate) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Dynamic Expert Assignment logic
  const getAssignedExpert = (appId: string) => {
    const experts = [
      { name: "CA Neha Sharma", role: "Senior Tax Consultant", phone: "+918287002983" },
      { name: "CA Alok Kumar", role: "GST Specialist", phone: "+917007595931" },
      { name: "CA Amit Verma", role: "Corporate Compliance Auditor", phone: "+917007595931" }
    ];
    const hash = appId ? appId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    return experts[hash % experts.length];
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
      return "";
    }).filter(Boolean);
    const appliedGST = activeSlugs.includes("gst-registration") || applications.some(a => a.service_name.toLowerCase().includes("gst"));

    const recs: { slug: string; name: string; amount: number; desc: string; badge: string; reason: string }[] = [];
    
    if (appliedGST) {
      // Propose MSME, ITR, Business Insurance, Current Account, Credit Card
      recs.push({
        slug: "msme-registration",
        name: "MSME Udyam Registration",
        amount: 999,
        desc: "Get certified to qualify for priority bank loans & mudra credit.",
        badge: "GST Booster",
        reason: "Recommended for GST holders"
      });
      recs.push({
        slug: "itr-filing",
        name: "Income Tax ITR Filing",
        amount: 1499,
        desc: "File enterprise/individual returns with dedicated CA consult.",
        badge: "Compliance",
        reason: "File business tax returns"
      });
      recs.push({
        slug: "business-insurance",
        name: "Shop & Business Insurance",
        amount: 2999,
        desc: "Secure inventory, assets, and liability coverage.",
        badge: "Risk Cover",
        reason: "Protect your GST enterprise"
      });
      recs.push({
        slug: "current-account",
        name: "Zero-Balance Current Account",
        amount: 0,
        desc: "Open business account using your new GSTIN.",
        badge: "Banking",
        reason: "Complete business banking"
      });
      recs.push({
        slug: "credit-card",
        name: "Business Cashback Card",
        amount: 0,
        desc: "Save 2% on official compliance and filing bills.",
        badge: "Fintech",
        reason: "Earn rewards on tax pay"
      });
    } else {
      // Default recommendation rules
      const appliedCibil = activeSlugs.includes("cibil-credit-health");
      const appliedITR = activeSlugs.includes("itr-filing");

      if (appliedITR) {
        const gst = popularServices.find(s => s.slug === "gst-registration");
        if (gst) recs.push({ ...gst, reason: "Recommended for business tax mapping" });
      }
      
      if (!appliedCibil) {
        const cibil = popularServices.find(s => s.slug === "cibil-credit-health");
        if (cibil) recs.push({ ...cibil, reason: "Check bureau health scoring" });
      }

      const pvc = popularServices.find(s => s.slug === "pvc-card-printing");
      if (pvc) recs.push({ ...pvc, reason: "Order premium polymer cards" });

      popularServices.forEach(s => {
        if (!activeSlugs.includes(s.slug) && recs.length < 3 && !recs.find(r => r.slug === s.slug)) {
          recs.push({ ...s, reason: "Popular choice among customers" });
        }
      });
    }

    return recs.slice(0, 3); // Return top 3 recommendations
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
          <div className="flex items-center gap-2 px-1">
            <Link href="/" className="flex h-8 w-48" aria-label="DigiConnect Home">
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Logo"
                width={192}
                height={32}
                priority
                className="h-full w-auto object-contain"
              />
            </Link>
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
            
            <button
              onClick={() => setServiceModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all duration-200 text-left cursor-pointer active:scale-95"
            >
              <Plus className="h-4.5 w-4.5" />
              New Application
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{dbProfile.full_name || profile.name}</p>
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
        <header className="sticky top-0 z-20 w-full px-4 md:px-8 py-3 bg-[#070d1e]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between min-h-[64px] shadow-[0_8px_32px_rgba(3,5,12,0.4)] before:absolute before:inset-x-0 before:-bottom-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/20 before:to-transparent">
          {/* Left: Mobile Menu Toggle */}
          <div className="flex items-center w-10 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition active:scale-95"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Center: Branding Logo */}
          <div className="flex items-center justify-center flex-1 md:flex-initial px-2">
            <Link href="/" className="flex items-center h-[28px] min-[360px]:h-[30px] min-[390px]:h-[32px] md:h-[34px]" aria-label="DigiConnect Home">
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Logo"
                width={204}
                height={34}
                priority
                className="h-full w-auto object-contain"
              />
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1 min-[360px]:gap-2 md:gap-3 shrink-0">
            {/* Verified Shield Badge */}
            <div 
              className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-emerald-500/20 transition-all duration-300 shrink-0 group relative cursor-help"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
              {/* Tooltip */}
              <span className="absolute top-9 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-[10px] font-bold text-white whitespace-nowrap shadow-xl z-50">
                Verified Account
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative notif-container">
              <button
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-400 hover:text-white transition duration-200 relative cursor-pointer"
                title="View Alerts"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-rose-500 text-white font-black text-[8px] flex items-center justify-center rounded-full ring-2 ring-[#070d1e]">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
              
              {showNotifPopover && (
                <div className="hidden md:block absolute right-0 top-10 z-50 w-80 rounded-[20px] border border-white/10 bg-slate-950/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl flex flex-col max-h-[480px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5 shrink-0">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-300 font-heading">Smart Alerts</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-0.5">{unreadNotifCount} Unread</p>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-black text-blue-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[380px] scrollbar-thin">
                    {localNotifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 font-bold">No recent alerts.</p>
                    ) : (
                      localNotifications.map((notif) => {
                        const badge = getNotifPriorityBadge(notif);
                        return (
                          <div key={notif.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition duration-150 text-xs space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {new Date(notif.created_at).toLocaleDateString("en-IN", { dateStyle: "short" })}
                              </span>
                            </div>
                            <p className="font-extrabold text-slate-200">{notif.title}</p>
                            <p className="text-slate-400 leading-normal text-[11px]">{notif.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Premium Apply Button */}
            <button
              onClick={() => setServiceModalOpen(true)}
              className="inline-flex h-[40px] md:h-[42px] w-10 min-[360px]:w-auto items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600/80 via-blue-500/85 to-indigo-600/90 hover:from-blue-500 hover:to-indigo-500 px-0 min-[360px]:px-3.5 md:px-4 text-xs font-extrabold text-white border border-blue-400/30 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_4px_15px_rgba(37,99,235,0.25)] hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_8px_20px_rgba(37,99,235,0.4)] backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer group shrink-0"
            >
              <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
              <Plus className="h-4 w-4 text-white/90 group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden min-[360px]:inline">Apply</span>
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 bg-slate-950 border-r border-white/5 p-6 flex flex-col justify-between h-full z-10 animate-in slide-in-from-left duration-250">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link href="/" className="flex h-8 w-48" aria-label="DigiConnect Home">
                      <Image
                        src="/logo-navbar.png"
                        alt="DigiConnect Logo"
                        width={192}
                        height={32}
                        priority
                        className="h-full w-auto object-contain"
                      />
                    </Link>
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
        <main className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl w-full mx-auto pb-32 md:pb-8">
          
          {/* PROFILE INCOMPLETE BANNER */}
          {(() => {
            const fullName = formFullName || dbProfile.full_name || profile.name || "";
            const email = user.email || "";
            const mobile = formMobile || getCustomerMobile(dbProfile, user);
            const pincode = formPincode || dbProfile.pincode || "";
            const city = formCity || dbProfile.city || "";
            const district = formDistrict || dbProfile.district || "";
            const state = formState || dbProfile.state || "";

            const requiredKeys = ["full_name", "email", "mobile", "pincode", "city", "district", "state"];
            const completedCount = requiredKeys.filter(f => {
              if (f === "full_name") return fullName.trim().length > 0;
              if (f === "email") return email.trim().length > 0;
              if (f === "mobile") return mobile.trim().length > 0;
              if (f === "pincode") return pincode.trim().length > 0;
              if (f === "city") return city.trim().length > 0;
              if (f === "district") return district.trim().length > 0;
              if (f === "state") return state.trim().length > 0;
              return false;
            }).length;

            const isComplete = completedCount === requiredKeys.length;

            let msg = "Update your profile details to access all features.";
            if (!mobile.trim()) {
              msg = "Add mobile number to receive service updates.";
            } else if (!pincode.trim() || !city.trim() || !district.trim() || !state.trim()) {
              msg = "Complete location details for faster service processing.";
            }

            if (isComplete || warningDismissed) return null;

            return (
              <div className="relative overflow-hidden rounded-[20px] border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4 shadow-lg backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%,rgba(249,115,22,0.1),transparent_35%)]" />
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-orange-300">Complete Account Profile</p>
                    <p className="text-xs text-slate-400 leading-normal">{msg}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={handleDismissWarning}
                    className="h-9 px-4 rounded-full border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-300 transition-all active:scale-95 cursor-pointer"
                  >
                    Remind me later
                  </button>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="h-9 px-4 rounded-full bg-orange-500 text-slate-950 hover:bg-orange-400 text-xs font-extrabold transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    Complete Now
                  </button>
                </div>
              </div>
            );
          })()}

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
                      {dbProfile.full_name || profile.name}
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
                  
                  <button
                    onClick={() => setServiceModalOpen(true)}
                    className="h-9 px-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-black text-white hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Apply New Service
                  </button>
                </div>
              </div>

              {/* GST ECOSYSTEM - PREMIUM WIDGET */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/95 text-slate-800 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur-md">
                {/* Background soft gradients */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-indigo-100/40 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row gap-6 justify-between items-stretch">
                  {/* Left Column: GST Registration/Filing Progress */}
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-blue-100 shadow-sm">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          GST AUTOPILOT
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                          Active Compliance
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                        GST Compliance Hub
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track your registrations, GSTR file statuses, and consult tax experts.
                      </p>
                    </div>

                    {/* Active GST Application Status */}
                    {applications.filter(app => app.service_name.toLowerCase().includes("gst") && !["completed", "delivered", "rejected", "cancelled"].includes(app.status)).length > 0 ? (
                      applications.filter(app => app.service_name.toLowerCase().includes("gst") && !["completed", "delivered", "rejected", "cancelled"].includes(app.status)).slice(0, 1).map((app) => {
                        const timeline = getTimelineSteps(app);
                        const expectedDate = getExpectedCompletionDate(app.created_at);
                        const mockArn = `ARN: AA27062600${app.id.slice(0, 5).toUpperCase()}`;
                        const expert = getAssignedExpert(app.id);

                        return (
                          <div key={app.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4.5 space-y-4 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black text-slate-800">{app.service_name}</p>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                                  {mockArn}
                                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                                  <span>Created {new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded">
                                  Expected: {expectedDate}
                                </span>
                              </div>
                            </div>

                            {/* Stepper progress bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                <span>Application Progress</span>
                                <span className="text-blue-600">{timeline.percent}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                  style={{ width: `${timeline.percent}%` }}
                                />
                              </div>
                              <div className="grid grid-cols-5 gap-0.5 text-center text-[8px] font-bold text-slate-400">
                                {timeline.steps.map((st, sIdx) => (
                                  <div key={sIdx} className={st.active ? "text-blue-600 font-extrabold" : ""}>
                                    {st.label}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* CA Officer Chat and Action Strip */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/40">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700">
                                  CA
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-700">{expert.name}</p>
                                  <p className="text-[8px] text-slate-400">{expert.role}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={`https://wa.me/${expert.phone.replace("+", "")}?text=Hi%20${encodeURIComponent(expert.name)},%20I%20am%20inquiring%20about%20my%20GST%20application%20(${app.service_name})%20with%20ID%20${app.id}.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 transition-all border border-emerald-100 shadow-sm"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 fill-emerald-700 text-transparent" />
                                  WhatsApp
                                </a>
                                <a
                                  href={`tel:${expert.phone}`}
                                  className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[10px] font-extrabold text-blue-700 flex items-center gap-1 transition-all border border-blue-100 shadow-sm"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  Call CA
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-6 text-center space-y-3.5 shadow-sm">
                        <div className="mx-auto h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">Ready to unlock your GSTIN?</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Start your official GST application or return filing with 20% cashback today.</p>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Link
                            href="/services/gst-registration"
                            className="h-8 px-4.5 rounded-full bg-blue-600 hover:bg-blue-700 text-[10px] font-black text-white flex items-center transition active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
                          >
                            GST Registration
                          </Link>
                          <Link
                            href="/services/gst-return-filing"
                            className="h-8 px-4.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700 flex items-center transition active:scale-95 shadow-sm cursor-pointer"
                          >
                            GST Return Filing
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="hidden md:block w-px bg-slate-200/60" />

                  {/* Right Column: Return Filing Calendars & Reminders */}
                  <div className="w-full md:w-80 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-600" />
                        GSTR Filings Deadline
                      </h4>
                      <p className="text-[10px] text-slate-400">Crucial timelines to avoid penalty under Sec 47.</p>
                    </div>

                    <div className="space-y-3">
                      {/* GSTR-1 Card */}
                      <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100/40 rounded-xl p-3">
                        <div>
                          <p className="text-[11px] font-black text-indigo-950">GSTR-1 (Sales)</p>
                          <p className="text-[9px] text-indigo-600 font-bold">Monthly Return (Sec 37)</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded ${getDaysLeftForGstr1() <= 3 ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                            {getDaysLeftForGstr1()} Days Left
                          </span>
                        </div>
                      </div>

                      {/* GSTR-3B Card */}
                      <div className="flex justify-between items-center bg-orange-50/50 border border-orange-100/40 rounded-xl p-3">
                        <div>
                          <p className="text-[11px] font-black text-orange-950">GSTR-3B (Tax Summary)</p>
                          <p className="text-[9px] text-orange-600 font-bold">Payment & Filing (Sec 39)</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded ${getDaysLeftForGstr3b() <= 3 ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-orange-50 text-orange-700 border border-orange-100"}`}>
                            {getDaysLeftForGstr3b()} Days Left
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-archived Doc Hub Integration */}
                    <div className="pt-2 border-t border-slate-200/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-[10px] font-black text-slate-700">Archived Documents</span>
                        </div>
                        <button
                          onClick={() => setActiveTab("documents")}
                          className="text-[9px] font-black text-blue-600 hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        {documents.filter(doc => doc.document_name?.toLowerCase().includes("gst") || doc.file_name.toLowerCase().includes("gst") || doc.document_type?.toLowerCase().includes("gst")).length > 0 ? (
                          documents.filter(doc => doc.document_name?.toLowerCase().includes("gst") || doc.file_name.toLowerCase().includes("gst") || doc.document_type?.toLowerCase().includes("gst")).slice(0, 2).map((doc) => (
                            <div key={doc.id} className="flex justify-between items-center text-[9px] text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg">
                              <span className="truncate max-w-[150px] font-medium">{doc.file_name}</span>
                              <a
                                href={doc.file_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                title="Download File"
                              >
                                <Download className="h-2.5 w-2.5" />
                                Save
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="text-[9px] text-slate-400 bg-slate-50 border border-slate-100/50 p-2 rounded-lg text-center font-medium">
                            No GST receipts or licenses uploaded yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITR ECOSYSTEM - PREMIUM WIDGET */}
              {applications.filter(app => app.service_name.toLowerCase().includes("itr") && !["completed", "delivered", "rejected", "cancelled"].includes(app.status)).length > 0 && (
                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/95 text-slate-800 p-6 shadow-2xl shadow-orange-500/10 backdrop-blur-md">
                  {/* Background soft gradients */}
                  <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-orange-100/40 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />

                  <div className="relative flex flex-col md:flex-row gap-6 justify-between items-stretch">
                    {/* Left Column: ITR Filing Progress */}
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-orange-100 shadow-sm">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            ITR AUTOPILOT
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                            AY 2026-27 ACTIVE
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                          ITR Tax Compliance Hub
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Track your income tax filing status, verify CA computations and manage refunds.
                        </p>
                      </div>

                      {/* Active ITR Application Status */}
                      {applications.filter(app => app.service_name.toLowerCase().includes("itr") && !["completed", "delivered", "rejected", "cancelled"].includes(app.status)).slice(0, 1).map((app) => {
                        void getExpectedCompletionDate(app.created_at);
                        const expertName = "CA Rohit Gupta";
                        const expertRole = "Senior Tax Advisor";
                        const expertPhone = "+918287002983";

                        const status = app.status;
                        const payStatus = app.payment_status;

                        const isUploaded = true;
                        const isReviewed = !["draft", "submitted"].includes(status);
                        const isPrepared = !["draft", "submitted", "documents_required", "document_pending"].includes(status);
                        const isFiled = ["in_progress", "assigned_to_agent", "completed", "delivered"].includes(status) && payStatus === "paid";
                        const isAcked = ["completed", "delivered"].includes(status);
                        const isRefundTracked = status === "delivered";

                        let progressPercent = 16;
                        if (isRefundTracked) progressPercent = 100;
                        else if (isAcked) progressPercent = 83;
                        else if (isFiled) progressPercent = 66;
                        else if (isPrepared) progressPercent = 50;
                        else if (isReviewed) progressPercent = 33;

                        const steps = [
                          { label: "Upload", active: isUploaded },
                          { label: "Review", active: isReviewed },
                          { label: "Prepare", active: isPrepared },
                          { label: "Filed", active: isFiled },
                          { label: "ITR-V", active: isAcked },
                          { label: "Refund", active: isRefundTracked }
                        ];

                        const regimeLabel = app.customer_details?.hraExempt || app.customer_details?.deductions80C ? "Old Tax Regime" : "New Tax Regime";
                        const refundAmount = app.customer_details?.otherIncome ? "₹4,850" : "Computing...";

                        return (
                          <div key={app.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4.5 space-y-4 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black text-slate-800">{app.service_name}</p>
                                <p className="text-[10px] font-mono text-slate-450 mt-0.5 flex items-center gap-1">
                                  <span>{regimeLabel}</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-350" />
                                  <span>AY 2026-27</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded">
                                  Est. Refund: {refundAmount}
                                </span>
                              </div>
                            </div>

                            {/* Stepper progress bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-550">
                                <span>Filing Progress Timeline</span>
                                <span className="text-orange-650 font-black">{progressPercent}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="grid grid-cols-6 gap-0.5 text-center text-[8px] font-bold text-slate-400">
                                {steps.map((st, sIdx) => (
                                  <div key={sIdx} className={st.active ? "text-orange-600 font-extrabold" : ""}>
                                    {st.label}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* CA Officer Chat and Action Strip */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/40">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-xs text-orange-700 font-heading">
                                  CA
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-700">{expertName}</p>
                                  <p className="text-[8px] text-slate-400 font-medium">{expertRole}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={`https://wa.me/${expertPhone.replace("+", "")}?text=Hi%20${encodeURIComponent(expertName)},%20I%20am%20inquiring%20about%20my%20ITR%20filing%20with%20ID%20${app.id}.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 transition-all border border-emerald-100 shadow-sm"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 fill-emerald-750 text-transparent" />
                                  WhatsApp
                                </a>
                                <a
                                  href={`tel:${expertPhone}`}
                                  className="h-8 px-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-[10px] font-extrabold text-orange-750 flex items-center gap-1 transition-all border border-orange-100 shadow-sm"
                                >
                                  <Phone className="h-3.5 w-3.5 text-orange-600" />
                                  Call CA
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden md:block w-px bg-slate-200/60" />

                    {/* Right Column: Return Filing Details & Vault */}
                    <div className="w-full md:w-80 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5 text-orange-650" />
                          ITR Vault Documents
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold">Manage generated tax records and filing receipts.</p>
                      </div>

                      {/* Mock Documents List for ITR */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-650 bg-slate-50 border border-slate-100 p-1.5 rounded-lg">
                          <span className="truncate max-w-[150px] font-bold">Form 16 Tax Certificate.pdf</span>
                          <button
                            onClick={() => toastSuccess("Downloading: Form 16 Tax Certificate.pdf")}
                            className="text-orange-600 hover:text-orange-800 flex items-center gap-0.5 font-black"
                          >
                            <Download className="h-2.5 w-2.5" />
                            Save
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-655 bg-slate-50 border border-slate-100 p-1.5 rounded-lg">
                          <span className="truncate max-w-[150px] font-bold">AIS Information Statement.pdf</span>
                          <button
                            onClick={() => toastSuccess("Downloading: AIS Information Statement.pdf")}
                            className="text-orange-600 hover:text-orange-800 flex items-center gap-0.5 font-black"
                          >
                            <Download className="h-2.5 w-2.5" />
                            Save
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-655 bg-slate-50 border border-slate-100 p-1.5 rounded-lg">
                          <span className="truncate max-w-[150px] font-bold">ITR-V Acknowledgement.pdf</span>
                          <button
                            onClick={() => toastSuccess("Downloading: ITR-V Acknowledgement.pdf")}
                            className="text-orange-600 hover:text-orange-800 flex items-center gap-0.5 font-black"
                          >
                            <Download className="h-2.5 w-2.5" />
                            Save
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-slate-700">Audit Status</span>
                        <span className="text-emerald-600 font-black flex items-center gap-1 uppercase tracking-wide">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          CA Audited
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                      <button
                        key={act.id}
                        onClick={() => setServiceModalOpen(true)}
                        className="cursor-pointer block text-left w-full active:scale-98 transition-all"
                      >
                        {CardBody}
                      </button>
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
                      <button
                        onClick={() => setServiceModalOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-bold text-white cursor-pointer active:scale-95 transition-all"
                      >
                        Apply Now
                      </button>
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
                <button
                  onClick={() => setServiceModalOpen(true)}
                  className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white transition active:scale-95 cursor-pointer"
                >
                  Apply Service
                </button>
              </div>
 
              {applications.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-white/5 space-y-4">
                  <p className="text-sm font-bold text-slate-400">You haven&apos;t filed any applications yet.</p>
                  <p className="text-xs text-slate-500">Apply for a tax, insurance, or Gov ID service to get started.</p>
                  <button
                    onClick={() => setServiceModalOpen(true)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-xs font-bold text-white cursor-pointer active:scale-95 transition-all"
                  >
                    Apply New Service
                  </button>
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

              {/* GST CERTIFICATE VAULT */}
              <div className="p-6 rounded-3xl bg-white text-slate-800 border border-white shadow-xl shadow-blue-500/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700 border border-blue-100 uppercase tracking-wider">
                      GST Vault
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 tracking-tight">
                      GST Compliance & Certificate Vault
                    </h3>
                    <p className="text-xs text-slate-500">
                      Official licenses, GSTR return filings, and tax challans processed automatically.
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Portal Autopilot Synced
                    </span>
                  </div>
                </div>

                {applications.some(app => app.service_name.toLowerCase().includes("gst")) ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { name: "GST REG-06 Certificate", desc: "Official government registration license.", type: "REG-06", file: "GST_REG06_Certificate.pdf" },
                      { name: "GSTR-3B Filing Receipt", desc: "Consolidated monthly return under Sec 39.", type: "GSTR-3B", file: "GSTR3B_May2026_Filed.pdf" },
                      { name: "GSTR-1 Sales Return Receipt", desc: "Outward supplies return under Sec 37.", type: "GSTR-1", file: "GSTR1_May2026_Filed.pdf" },
                      { name: "Challan PMT-06 Receipt", desc: "Official tax payment bank challan.", type: "PMT-06", file: "GST_Challan_PMT06.pdf" }
                    ].map((vItem, vIdx) => (
                      <div key={vIdx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:border-blue-200 hover:shadow-md transition">
                        <div className="space-y-1.5">
                          <span className="inline-block bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-100">
                            {vItem.type}
                          </span>
                          <p className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition">
                            {vItem.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                            {vItem.desc}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/50">
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = "#";
                              link.setAttribute("download", vItem.file);
                              document.body.appendChild(link);
                              toastSuccess(`Downloading: ${vItem.file}`);
                            }}
                            className="w-full h-8 flex items-center justify-center gap-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Download className="h-3 w-3 text-blue-600" />
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-4">
                    <div className="absolute inset-0 bg-slate-900/[0.02] backdrop-blur-[1px] pointer-events-none" />
                    <div className="max-w-md mx-auto space-y-3 relative z-10">
                      <Lock className="h-8 w-8 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-sm font-black text-slate-800">GST Ecosystem Vault is Locked</p>
                        <p className="text-xs text-slate-400 leading-normal mt-0.5">
                          Your automated filings folder and REG-06 license vault are not active. Get your registration or enable return auto-filings to unlock.
                        </p>
                      </div>
                      <button
                        onClick={() => setServiceModalOpen(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 transition active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        Unlock GST Autopilot
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ITR CERTIFICATE VAULT */}
              <div className="p-6 rounded-3xl bg-white text-slate-800 border border-white shadow-xl shadow-orange-500/5 space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black text-orange-700 border border-orange-100 uppercase tracking-wider">
                      ITR Vault
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 tracking-tight font-heading">
                      ITR Compliance & Tax Vault
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Form 16 summaries, AIS/26AS statement data, and generated ITR-V acknowledgement receipts.
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Assisted CA Synced
                    </span>
                  </div>
                </div>

                {applications.some(app => app.service_name.toLowerCase().includes("itr")) ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { name: "ITR-V Acknowledgement", desc: "Official income tax return verification receipt.", type: "ITR-V", file: "ITR_V_Acknowledgement_AY2026.pdf" },
                      { name: "Form 16 Tax Certificate", desc: "Employer certified salary deductions under Sec 203.", type: "Form 16", file: "Form16_Salary_Deductions.pdf" },
                      { name: "AIS Information Statement", desc: "Comprehensive Annual Information Statement summary.", type: "AIS", file: "Annual_Information_Statement.pdf" },
                      { name: "26AS Tax Credit Statement", desc: "Consolidated statement of TDS, TCS & tax credits.", type: "26AS", file: "Form26AS_Tax_Credits.pdf" }
                    ].map((vItem, vIdx) => (
                      <div key={vIdx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:border-orange-200 hover:shadow-md transition">
                        <div className="space-y-1.5">
                          <span className="inline-block bg-orange-50 text-orange-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-orange-100">
                            {vItem.type}
                          </span>
                          <p className="text-xs font-black text-slate-800 group-hover:text-orange-700 transition">
                            {vItem.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                            {vItem.desc}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/50">
                          <button
                            type="button"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = "#";
                              link.setAttribute("download", vItem.file);
                              document.body.appendChild(link);
                              toastSuccess(`Downloading: ${vItem.file}`);
                            }}
                            className="w-full h-8 flex items-center justify-center gap-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Download className="h-3 w-3 text-orange-600" />
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-4">
                    <div className="absolute inset-0 bg-slate-900/[0.02] backdrop-blur-[1px] pointer-events-none" />
                    <div className="max-w-md mx-auto space-y-3 relative z-10">
                      <Lock className="h-8 w-8 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-sm font-black text-slate-800">ITR Compliance Vault is Locked</p>
                        <p className="text-xs text-slate-400 leading-normal mt-0.5">
                          Your assisted ITR acknowledgment receipt vault is not active. File your tax return or start a draft under CA guidance to unlock.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setServiceModalOpen(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 transition active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        Unlock ITR Autopilot
                      </button>
                    </div>
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
            <div className="space-y-6 pb-32">
              <h2 className="text-xl font-extrabold text-white">Profile Settings</h2>

              {/* Customer Card (Top) */}
              <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80 p-5 md:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 animate-in fade-in duration-200">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.15),transparent_35%)]" />
                
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-md uppercase shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white truncate">{formFullName || profile.name}</h3>
                      <span className="inline-flex h-5 items-center gap-0.5 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider shrink-0">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  {(() => {
                    const fullNameVal = formFullName.trim();
                    const emailVal = user.email || "";
                    const mobileVal = formMobile.trim();
                    const pincodeVal = formPincode.trim();
                    const cityVal = formCity.trim();
                    const districtVal = formDistrict.trim();
                    const stateVal = formState.trim();
                    
                    const count = ["full_name", "email", "mobile", "pincode", "city", "district", "state"].filter(f => {
                      if (f === "full_name") return fullNameVal.length > 0;
                      if (f === "email") return emailVal.length > 0;
                      if (f === "mobile") return mobileVal.length > 0;
                      if (f === "pincode") return pincodeVal.length > 0;
                      if (f === "city") return cityVal.length > 0;
                      if (f === "district") return districtVal.length > 0;
                      if (f === "state") return stateVal.length > 0;
                      return false;
                    }).length;
                    const pct = Math.round((count / 7) * 100);

                    return (
                      <>
                        <div className="flex justify-between text-xs font-bold text-slate-300">
                          <span>Profile Completeness</span>
                          <span className={pct === 100 ? "text-emerald-400" : "text-orange-400"}>
                            {pct === 100 ? "Profile Complete" : `${pct}%`}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Form Layout */}
              <form onSubmit={handleSaveProfile} className="space-y-6">
                
                {/* Section 1: Personal Details */}
                <div className="p-6 rounded-[24px] bg-slate-950/60 border border-white/5 space-y-4 shadow-md">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <UserRound className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Personal Details</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">Full Name</span>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        required
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">Mobile Number</span>
                      <input
                        type="tel"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        value={formMobile}
                        onChange={(e) => setFormMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        required
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-bold text-slate-400">Email Address (Readonly)</span>
                      <input
                        type="email"
                        value={user.email || ""}
                        readOnly
                        disabled
                        className="h-11 rounded-xl border border-white/5 bg-slate-900/40 px-4 text-xs font-medium text-slate-500 outline-none cursor-not-allowed"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">Date of Birth (Optional)</span>
                      <input
                        type="date"
                        value={formDob}
                        onChange={(e) => setFormDob(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">Gender (Optional)</span>
                      <select
                        value={formGender}
                        onChange={(e) => setFormGender(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      >
                        <option value="" className="bg-slate-950">Select gender</option>
                        <option value="female" className="bg-slate-950">Female</option>
                        <option value="male" className="bg-slate-950">Male</option>
                        <option value="other" className="bg-slate-950">Other</option>
                        <option value="prefer_not_to_say" className="bg-slate-950">Prefer not to say</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Section 2: Smart Address Details */}
                <div className="p-6 rounded-[24px] bg-slate-950/60 border border-white/5 space-y-4 shadow-md">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Compass className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Address & Location</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 relative">
                      <span className="text-xs font-bold text-slate-400">PIN Code</span>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          value={formPincode}
                          onChange={(e) => setFormPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          required
                          className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 pl-4 pr-10 text-xs font-medium text-white outline-none focus:border-blue-500"
                          placeholder="6-digit PIN code"
                        />
                        {isPincodeLoading && (
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                        )}
                      </div>
                      {isPincodeLoading && (
                        <p className="text-[10px] text-blue-400 font-bold mt-0.5">Fetching location...</p>
                      )}
                      {!isPincodeLoading && pincodeFetched && (
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">Location found</p>
                      )}
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">City / Main Post Office</span>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        required
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">District</span>
                      <input
                        type="text"
                        value={formDistrict}
                        onChange={(e) => setFormDistrict(e.target.value)}
                        required
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">State</span>
                      <input
                        type="text"
                        value={formState}
                        onChange={(e) => setFormState(e.target.value)}
                        required
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-bold text-slate-400">Street Address / Landmark</span>
                      <textarea
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        required
                        className="h-20 py-2.5 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500 resize-none"
                      />
                    </label>
                  </div>
                </div>

                {/* Section 3: Service Preferences */}
                <div className="p-6 rounded-[24px] bg-slate-950/60 border border-white/5 space-y-4 shadow-md">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Globe className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Service Preferences</h3>
                  </div>
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="font-extrabold text-slate-200">WhatsApp Notifications</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Receive dynamic progress updates directly in chat.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefWhatsapp}
                        onChange={(e) => setPrefWhatsapp(e.target.checked)}
                        className="h-5 w-5 rounded bg-slate-900 border-white/10 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="font-extrabold text-slate-200">SMS / Email Notifications</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Receive invoices, updates, and policy documents.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefNotifications}
                        onChange={(e) => setPrefNotifications(e.target.checked)}
                        className="h-5 w-5 rounded bg-slate-900 border-white/10 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-slate-400">Preferred Portal Language</span>
                      <select
                        value={prefLanguage}
                        onChange={(e) => setPrefLanguage(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-medium text-white outline-none focus:border-blue-500"
                      >
                        <option value="Hindi" className="bg-slate-950">Hindi</option>
                        <option value="English" className="bg-slate-950">English</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Section 4: Security */}
                <div className="p-6 rounded-[24px] bg-slate-950/60 border border-white/5 space-y-4 shadow-md text-xs">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Shield className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Security & Status</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-slate-500 font-bold">Account Status</p>
                      <p className="font-extrabold text-emerald-400 mt-1 flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" /> Active
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-slate-500 font-bold">Email Verified</p>
                      <p className="font-extrabold text-emerald-400 mt-1 flex items-center gap-1">
                        <Check className="h-4 w-4" /> Yes
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-slate-500 font-bold">Last Updated</p>
                      <p className="font-extrabold text-slate-300 mt-1">
                        {dbProfile.updated_at
                          ? new Date(dbProfile.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desktop Save Button (Sticky bottom sheet handles mobile) */}
                <div className="hidden md:flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="h-11 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-black text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Profile Settings
                      </>
                    )}
                  </button>
                </div>

                {/* Mobile Sticky Save Button (Sits above the mobile dock) */}
                <div className="md:hidden fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-200">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-black text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Profile Settings
                      </>
                    )}
                  </button>
                </div>

              </form>
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

        {/* MOBILE NOTIFICATION BOTTOM SHEET */}
        {showNotifPopover && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40" 
              onClick={() => setShowNotifPopover(false)} 
            />
            {/* Bottom Sheet */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] bg-[#0c142c] border-t border-white/10 p-5 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 shrink-0" />
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 shrink-0">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-slate-300 font-heading">Smart Alerts</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{unreadNotifCount} Unread</p>
                </div>
                <div className="flex items-center gap-3">
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-black text-blue-400 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifPopover(false)}
                    className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-thin pb-6">
                {localNotifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8 font-bold">No recent alerts.</p>
                ) : (
                  localNotifications.map((notif) => {
                    const badge = getNotifPriorityBadge(notif);
                    return (
                      <div key={notif.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(notif.created_at).toLocaleDateString("en-IN", { dateStyle: "short" })}
                          </span>
                        </div>
                        <p className="font-extrabold text-slate-200">{notif.title}</p>
                        <p className="text-slate-400 leading-normal text-[11px]">{notif.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* CUSTOM DASHBOARD-SAFE APPLY MODAL */}
        {serviceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-6">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
              onClick={() => setServiceModalOpen(false)} 
            />
            
            {/* Modal Box */}
            <div className="relative z-10 flex max-h-[85vh] md:max-h-[80vh] w-full md:max-w-2xl flex-col overflow-hidden rounded-t-[32px] md:rounded-[28px] border border-white/10 bg-[#0c142c]/95 shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
              {/* Drag Handle (Mobile) */}
              <div className="md:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 shrink-0" />
              
              {/* Header */}
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/5 p-5 md:p-6">
                <div>
                  <h2 className="text-lg font-black text-white font-heading">Apply for a New Service</h2>
                  <p className="mt-1 text-xs text-slate-400">Select an essential service to start your digital application instantly.</p>
                </div>
                <button 
                  onClick={() => setServiceModalOpen(false)} 
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              {/* Search Bar & Category Filter */}
              <div className="shrink-0 p-5 md:p-6 space-y-4 border-b border-white/5">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    placeholder="Search documents, schemes, registrations..."
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/60 pl-11 pr-4 text-xs font-semibold text-white outline-none focus:border-blue-500/50 focus:bg-slate-900 transition"
                  />
                </label>
                
                {/* Categories Row */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {["All", "Popular", "Recent", "Tax & Business", "Cards & IDs", "Loans & Banking"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setServiceCategory(cat)}
                      className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-extrabold transition ${
                        serviceCategory === cat 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" 
                          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services List */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
                {/* Recent Applied Services (derived from applications) */}
                {(serviceCategory === "All" || serviceCategory === "Recent") && (
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recently Applied</h3>
                    {applications.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic px-2">No recently applied services.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(() => {
                          const uniqueRecentSlugs = Array.from(new Set(applications.map(a => {
                            const name = a.service_name.toLowerCase();
                            if (name.includes("gst")) return "gst-registration";
                            if (name.includes("itr") || name.includes("tax")) return "itr-filing";
                            if (name.includes("cibil") || name.includes("credit")) return "cibil-report-increase";
                            if (name.includes("pvc") || name.includes("card")) return "pvc-card";
                            if (name.includes("eshram") || name.includes("shram")) return "eshram-card";
                            if (name.includes("driving") || name.includes("license")) return "learning-driving-license";
                            if (name.includes("passport")) return "passport";
                            if (name.includes("msme")) return "msme-registration";
                            if (name.includes("yojana") || name.includes("vishwakarma")) return "pm-vishwakarma-yojana";
                            if (name.includes("insurance")) return "insurance";
                            if (name.includes("mudra")) return "mudra-loan";
                            if (name.includes("pmegp")) return "pmegp-loan";
                            if (name.includes("voter")) return "voter-id";
                            if (name.includes("labour")) return "labour-card";
                            return "";
                          }).filter(Boolean)));

                          const recentServices = servicesData.filter(s => (uniqueRecentSlugs as string[]).includes(s.slug));

                          if (recentServices.length === 0) {
                            return <p className="text-[11px] text-slate-500 italic px-2">No recently applied services.</p>;
                          }

                          return recentServices.map((service) => {
                            const Icon = service.icon || Compass;
                            return (
                              <Link
                                key={`recent-${service.slug}`}
                                href={`/apply/${service.slug}`}
                                onClick={() => setServiceModalOpen(false)}
                                className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/30 transition text-left cursor-pointer group"
                              >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition">
                                  <Icon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold text-slate-200 group-hover:text-white">{service.title}</span>
                                  <span className="block truncate text-[10px] text-slate-400 mt-0.5">{service.shortDescription}</span>
                                </span>
                              </Link>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* All / Popular / Category-filtered list */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {serviceCategory === "All" ? "All Services" : `${serviceCategory} Services`}
                  </h3>
                  
                  {(() => {
                    const filtered = servicesData.filter(service => {
                      const queryMatch = !serviceSearchQuery.trim() || 
                        service.title.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                        service.shortDescription.toLowerCase().includes(serviceSearchQuery.toLowerCase());
                      
                      if (!queryMatch) return false;

                      if (serviceCategory === "All") return true;
                      if (serviceCategory === "Popular") return ["cibil-report-increase", "eshram-card", "pvc-card", "gst-registration", "gst-return-filing", "itr-filing", "pm-vishwakarma-yojana"].includes(service.slug);
                      if (serviceCategory === "Recent") return false; // Handled above
                      if (serviceCategory === "Tax & Business") return service.categorySlug === "tax" || service.categorySlug === "company";
                      if (serviceCategory === "Cards & IDs") return service.categorySlug === "cards" || service.categorySlug === "licence";
                      if (serviceCategory === "Loans & Banking") return service.categorySlug === "loans" || service.categorySlug === "banking" || service.categorySlug === "insurance";
                      return true;
                    });

                    if (filtered.length === 0) {
                      return <p className="text-xs text-slate-500 text-center py-6">No matching services found.</p>;
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {filtered.map((service) => {
                          const Icon = service.icon || Compass;
                          return (
                            <Link
                              key={`list-${service.slug}`}
                              href={`/apply/${service.slug}`}
                              onClick={() => setServiceModalOpen(false)}
                              className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/30 transition text-left cursor-pointer group"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition">
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-slate-200 group-hover:text-white">{service.title}</span>
                                <span className="block truncate text-[10px] text-slate-400 mt-0.5">{service.shortDescription}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Footer info */}
              <div className="shrink-0 p-4 border-t border-white/5 bg-slate-950/40 flex justify-between items-center text-[10px] text-slate-500 px-6">
                <span>Instant application creation</span>
                <span>Secure fintech channels</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
