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
  Phone,
  Download,
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
  Search,
  Lock,
  ArrowRight
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import { StatusBadge, PaymentBadge } from "@/components/portal/status-badge";
import type { CustomerDashboardApplication, CustomerDashboardStats } from "@/lib/customer-dashboard-data";
import { useToast } from "@/components/providers/toast-provider";
import { servicesData } from "@/lib/services-data";
import { CustomerVault } from "@/components/portal/customer-vault";

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

type Tab = "dashboard" | "applications" | "wallet" | "referral" | "documents" | "support" | "profile" | "vault";

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

  // Search service autocomplete in header
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Notifications Popover & List state
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState<CustomerNotification[]>([]);

  // Sticky header translucent backdrop transition state
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 12);

      // Scroll hides/shows top app bar
      const delta = currentScrollY - lastScrollY.current;
      if (delta > 15 && currentScrollY > 60) {
        setHeaderHidden(true);
      } else if (delta < -10) {
        setHeaderHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reactively track tab parameter changes in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["dashboard", "applications", "wallet", "referral", "documents", "support", "profile", "vault"].includes(tabParam)) {
        setActiveTab(tabParam as Tab);
      } else {
        setActiveTab("dashboard");
      }
    }
  }, []);

  const navigateToTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "dashboard") {
      router.push("/customer/dashboard");
    } else {
      router.push(`/customer/dashboard?tab=${tab}`);
    }
  };

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
      // Ignored
    }
  };

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceCategory, setServiceCategory] = useState("All");

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
  
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [pincodeFetched, setPincodeFetched] = useState(false);
  const lastFetchedPincodeRef = useRef("");

  const [prefWhatsapp, setPrefWhatsapp] = useState(true);
  const [prefLanguage, setPrefLanguage] = useState("Hindi");
  const [prefNotifications, setPrefNotifications] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

      const prefs = {
        whatsapp: prefWhatsapp,
        language: prefLanguage,
        notifications: prefNotifications
      };
      localStorage.setItem(`customer_prefs_${user.id}`, JSON.stringify(prefs));

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

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
      toastSuccess("Logged out successfully.");
    } catch {
      toastError("Failed to logout.");
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const safeCurrency = (val: number | null | undefined) => {
    return formatCurrency(val ?? 0);
  };

  const initials = useMemo(() => {
    const displayName = dbProfile.full_name || profile.name || "";
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0)}${parts[1]?.charAt(0)}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [dbProfile.full_name, profile.name]);

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

  const activeApplications = useMemo(() => {
    return applications.filter((app) => 
      !["completed", "delivered", "rejected", "cancelled"].includes(app.status)
    );
  }, [applications]);

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

  const getNotifPriorityBadge = (notif: CustomerNotification) => {
    const priority = notif.priority || (notif.title.toLowerCase().includes("rejected") || notif.title.toLowerCase().includes("failed") ? "critical" : notif.title.toLowerCase().includes("pending") ? "important" : "normal");
    switch (priority) {
      case "critical":
        return { label: "Action Required", bg: "bg-rose-50 text-rose-600 border-rose-100" };
      case "important":
        return { label: "Important", bg: "bg-amber-50 text-amber-600 border-amber-100" };
      case "completed":
        return { label: "Completed", bg: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      default:
        return { label: "Update", bg: "bg-blue-50 text-blue-600 border-blue-100" };
    }
  };

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

  const getAssignedExpert = (appId: string) => {
    const experts = [
      { name: "CA Neha Sharma", role: "Senior Tax Consultant", phone: "+918287002983" },
      { name: "CA Alok Kumar", role: "GST Specialist", phone: "+917007595931" },
      { name: "CA Amit Verma", role: "Corporate Compliance Auditor", phone: "+917007595931" }
    ];
    const hash = appId ? appId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    return experts[hash % experts.length];
  };

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
        { label: "Payment", active: isPaymentDone },
        { label: "Docs Verified", active: isDocsVerified },
        { label: "Processing", active: isProcessing },
        { label: "Completed", active: isCompleted }
      ]
    };
  };

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

  const referralBreakdown = useMemo(() => {
    const refs = referralSummary?.referrals || [];
    const countToday = refs.filter(r => isToday(r.created_at)).length;
    const countWeek = refs.filter(r => isThisWeek(r.created_at)).length;
    const countMonth = refs.filter(r => isThisMonth(r.created_at)).length;

    const completedRefs = refs.filter(r => r.status === "completed");
    const completedToday = completedRefs.filter(r => isToday(r.created_at)).length;
    const completedWeek = completedRefs.filter(r => isThisWeek(r.created_at)).length;
    const completedMonth = completedRefs.filter(r => isThisMonth(r.created_at)).length;

    const rewardsToday = completedToday * 100;
    const rewardsWeek = completedWeek * 100;
    const rewardsMonth = completedMonth * 100;
    const rewardsLifetime = referralSummary?.rewardEarned ?? stats.lifetimeEarning ?? 0;

    const totalReg = refs.length;
    const totalComp = completedRefs.length;
    const conversion = totalReg > 0 ? Math.round((totalComp / totalReg) * 100) : 0;

    return {
      today: { invites: countToday, completed: completedToday, rewards: rewardsToday },
      week: { invites: countWeek, completed: completedWeek, rewards: rewardsWeek },
      month: { invites: countMonth, completed: completedMonth, rewards: rewardsMonth },
      lifetime: { invites: totalReg, completed: totalComp, rewards: rewardsLifetime },
      conversionRate: conversion
    };
  }, [referralSummary, stats.lifetimeEarning]);

  const walletBreakdown = useMemo(() => {
    const txs = walletSnapshot?.transactions || [];
    
    let pendingBalance = 0;
    let thisMonthCashback = 0;

    txs.forEach((tx) => {
      if (tx.status === "pending") {
        pendingBalance += tx.amount;
      }
      if (isThisMonth(tx.created_at) && tx.amount > 0 && tx.status === "active" && tx.type.includes("cashback")) {
        thisMonthCashback += tx.amount;
      }
    });

    return { pendingBalance, thisMonthCashback };
  }, [walletSnapshot]);

  // Document Drag and Drop
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
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleDocumentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadAppId || !uploadDocType || !uploadFile) {
      toastError("Please select application, document name, and choose a file.");
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not initialized.");

      const fileExt = uploadFile.name.split(".").pop();
      const randomId = Math.random().toString(36).substring(2, 15);
      const storagePath = `portal-uploads/${user.id}/${uploadAppId}/${randomId}.${fileExt}`;

      setUploadProgress(40);
      const { error: storageError } = await supabase.storage
        .from("application-documents")
        .upload(storagePath, uploadFile, {
          cacheControl: "3600",
          upsert: true
        });

      if (storageError) throw storageError;
      setUploadProgress(70);

      const { data: publicUrlData } = supabase.storage
        .from("application-documents")
        .getPublicUrl(storagePath);

      if (!publicUrlData?.publicUrl) throw new Error("Failed to resolve uploaded file public URL.");

      const { error: dbError } = await supabase
        .from("application_documents")
        .insert({
          application_id: uploadAppId,
          document_type: uploadDocType.trim(),
          file_name: uploadFile.name,
          file_url: publicUrlData.publicUrl,
          file_type: uploadFile.type,
          storage_path: storagePath,
          status: "pending",
          review_status: "pending",
          uploaded_by_role: "customer"
        });

      if (dbError) {
        await supabase.storage.from("application-documents").remove([storagePath]);
        throw dbError;
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

  const handleCopyCode = () => {
    const code = referralSummary?.code || stats.code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toastSuccess("Referral code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const link = referralSummary?.link || stats.link;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toastSuccess("Referral link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = async () => {
    const link = referralSummary?.link || stats.link;
    if (navigator.share && link) {
      try {
        await navigator.share({
          title: "Join DigiConnect Dukan",
          text: "Register and file premium tax/government services to claim referral cashbacks!",
          url: link
        });
      } catch {
        // Share cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Header Search Autocomplete logic
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return servicesData.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery]);

  // Click outside notifications popover & search dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notif-container")) {
        setShowNotifPopover(false);
      }
      if (!target.closest(".search-container")) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // AI recommendations data
  const recommendedServices = useMemo(() => {
    const hasGst = applications.some(app => app.service_name.toLowerCase().includes("gst"));
    const hasItr = applications.some(app => app.service_name.toLowerCase().includes("itr"));
    const hasMsme = applications.some(app => app.service_name.toLowerCase().includes("msme"));

    const recs = [];
    if (hasGst && !hasItr) {
      const itr = servicesData.find(s => s.slug === "itr-filing");
      if (itr) recs.push(itr);
    }
    if (hasItr && !hasGst) {
      const gst = servicesData.find(s => s.slug === "gst-registration");
      if (gst) recs.push(gst);
    }
    if (hasMsme && !hasGst) {
      const gst = servicesData.find(s => s.slug === "gst-registration");
      if (gst) recs.push(gst);
    }

    // Fallbacks if no matching usage
    if (recs.length === 0) {
      const defaults = ["cibil-credit-health", "gst-registration", "itr-filing"];
      defaults.forEach(slug => {
        const serv = servicesData.find(s => s.slug === slug);
        if (serv) recs.push(serv);
      });
    }

    return recs;
  }, [applications]);

  // Earned milestones indicators
  const achievements = useMemo(() => {
    const items = [
      { id: "first_app", title: "First Application", desc: "First service submitted successfully", icon: "🚀", unlocked: applications.length > 0 },
      { id: "first_ref", title: "First Referral", desc: "Referred a friend to DigiConnect", icon: "👥", unlocked: invitesCount > 0 },
      { id: "cashback_1000", title: "₹1000 Milestone", desc: "Earned more than ₹1000 cashback", icon: "💰", unlocked: (walletSnapshot?.wallet?.total_reward_earned ?? 0) >= 1000 },
      { id: "app_heavy", title: "Elite Comply", desc: "Completed 5 applications in portal", icon: "🏆", unlocked: counters.completed >= 5 }
    ];
    return items;
  }, [applications, invitesCount, walletSnapshot, counters.completed]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased overflow-x-hidden md:flex">
      
      {/* 1. SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white/70 backdrop-blur-xl border-r border-slate-100 shrink-0 fixed h-full top-0 left-0 z-30 justify-between p-6 shadow-sm">
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

          <nav className="space-y-1" aria-label="Desktop sidebar navigation">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "applications", label: "My Applications", icon: FileText },
              { id: "wallet", label: "Wallet & Cashback", icon: WalletCards },
              { id: "referral", label: "Refer & Earn", icon: Gift },
              { id: "documents", label: "Documents Hub", icon: FolderOpen },
              { id: "vault", label: "Secure Vault", icon: ShieldCheck },
              { id: "support", label: "Support Center", icon: HelpCircle },
              { id: "profile", label: "Profile Settings", icon: UserRound }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateToTab(item.id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? "bg-blue-50/70 border border-blue-100 text-blue-700 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-600" : ""}`} />
                  {item.label}
                  {item.id === "applications" && counters.pending > 0 && (
                    <span className="ml-auto bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                      {counters.pending}
                    </span>
                  )}
                </button>
              );
            })}
            
            <button
              onClick={() => setServiceModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 text-left cursor-pointer active:scale-95"
            >
              <Plus className="h-4.5 w-4.5 text-blue-600" />
              New Application
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{dbProfile.full_name || profile.name}</p>
              <p className="text-[10px] font-medium text-slate-400 truncate">Customer Account</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* 2. TOP STICKY HEADER */}
        <header className={`sticky top-0 z-20 w-full px-4 md:px-8 py-3 flex items-center justify-between min-h-[64px] transition-all duration-300 ${
          headerHidden ? "-translate-y-full shadow-none" : ""
        } ${
          scrolled ? "bg-white/72 backdrop-blur-xl border-b border-slate-100/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)]" : "bg-transparent border-b border-transparent"
        }`}>
          {/* Left: Mobile Menu Toggle */}
          <div className="flex items-center w-10 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Center: Branding & Welcome Greeting */}
          <div className="flex items-center gap-4 flex-1 md:flex-initial px-2">
            <div className="hidden md:flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 leading-none">{getTimeGreeting()}</p>
                <p className="text-sm font-extrabold text-slate-800 mt-1">Welcome back, {dbProfile.full_name?.split(" ")[0] || profile.name.split(" ")[0]}</p>
              </div>
            </div>
            
            {/* Branding for mobile layout */}
            <Link href="/" className="md:hidden flex items-center h-[26px] min-[360px]:h-[28px] min-[390px]:h-[30px]" aria-label="DigiConnect Home">
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Logo"
                width={180}
                height={30}
                priority
                className="h-full w-auto object-contain"
              />
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1.5 min-[360px]:gap-2.5 md:gap-4 shrink-0">
            {/* Autocomplete Search Container */}
            <div className="relative search-container hidden sm:block w-48 lg:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search service..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full h-8.5 pl-9 pr-3 rounded-full bg-slate-100 border-none text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
              
              {showSearchDropdown && filteredServices.length > 0 && (
                <div className="absolute right-0 top-10 w-72 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg z-50 animate-in fade-in duration-150">
                  <p className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-wider">Suggested Services</p>
                  <div className="space-y-0.5">
                    {filteredServices.map(s => (
                      <Link
                        key={s.slug}
                        href={`/apply/${s.slug}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition"
                      >
                        <span className="h-6.5 w-6.5 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                          <Compass className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">{s.shortDescription}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Verification Shield */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-all duration-300 shrink-0 group relative cursor-help">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              <span className="absolute top-9 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[10px] font-bold text-white whitespace-nowrap shadow-xl z-50">
                Verified Account
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative notif-container">
              <button
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition relative cursor-pointer"
                title="View Alerts"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-rose-500 text-white font-black text-[8px] flex items-center justify-center rounded-full ring-2 ring-white">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
              
              {showNotifPopover && (
                <div className="hidden md:block absolute right-0 top-10 z-50 w-80 rounded-[20px] border border-slate-100 bg-white p-4 shadow-lg backdrop-blur-xl flex flex-col max-h-[480px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5 shrink-0">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-800">Smart Alerts</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{unreadNotifCount} Unread</p>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[380px] scrollbar-thin">
                    {localNotifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 font-bold">No recent alerts.</p>
                    ) : (
                      localNotifications.map((notif) => {
                        const badge = getNotifPriorityBadge(notif);
                        return (
                          <div key={notif.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition duration-150 text-xs space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(notif.created_at).toLocaleDateString("en-IN", { dateStyle: "short" })}
                              </span>
                            </div>
                            <p className="font-extrabold text-slate-800 leading-snug">{notif.title}</p>
                            <p className="text-slate-500 leading-normal text-[11px]">{notif.message}</p>
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
              className="inline-flex h-[36px] w-8 min-[360px]:w-auto items-center justify-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-0 min-[360px]:px-4 text-xs font-bold text-white border border-blue-500 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4 text-white" />
              <span className="hidden min-[360px]:inline">New Order</span>
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 bg-white border-r border-slate-100 p-6 flex flex-col justify-between h-full z-10 animate-in slide-in-from-left duration-200">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex h-7 w-40 animate-pulse-subtle" aria-label="DigiConnect Home" onClick={() => setMobileMenuOpen(false)}>
                    <Image
                      src="/logo-navbar.png"
                      alt="DigiConnect Logo"
                      width={160}
                      height={28}
                      priority
                      className="h-full w-auto object-contain"
                    />
                  </Link>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1" aria-label="Mobile menu navigation">
                  {[
                    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                    { id: "applications", label: "My Applications", icon: FileText },
                    { id: "wallet", label: "Wallet & Cashback", icon: WalletCards },
                    { id: "referral", label: "Refer & Earn", icon: Gift },
                    { id: "documents", label: "Documents Hub", icon: FolderOpen },
                    { id: "vault", label: "Secure Vault", icon: ShieldCheck },
                    { id: "support", label: "Support Center", icon: HelpCircle },
                    { id: "profile", label: "Profile Settings", icon: UserRound }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateToTab(item.id as Tab);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-slate-500 hover:bg-slate-50"
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
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
              <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/40 p-4 shadow-sm backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-800">Complete Account Profile</p>
                    <p className="text-xs text-slate-500 leading-normal">{msg}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={handleDismissWarning}
                    className="h-8.5 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-600 transition-all active:scale-95 cursor-pointer"
                  >
                    Remind Later
                  </button>
                  <button
                    onClick={() => navigateToTab("profile")}
                    className="h-8.5 px-3.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 text-[11px] font-extrabold transition-all active:scale-95 shadow-sm cursor-pointer"
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
              
              {/* SMART DASHBOARD HERO */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-tr from-white via-blue-50/20 to-indigo-50/10 p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-stretch">
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[9px] font-black uppercase text-blue-700 tracking-wider">
                      {milestone.levelName}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      {dbProfile.full_name || profile.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Member since: {dbProfile.updated_at ? new Date(dbProfile.updated_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "June 2026"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Wallet Balance</p>
                      <p className="text-xl font-extrabold text-slate-900">
                        {safeCurrency(walletSnapshot?.wallet?.balance_points ?? stats.walletBalance)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Referral Income</p>
                      <p className="text-xl font-extrabold text-slate-900">
                        {safeCurrency(referralSummary?.rewardEarned ?? stats.lifetimeEarning)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Completed Orders</p>
                      <p className="text-xl font-extrabold text-slate-900">{counters.completed}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Pending Files</p>
                      <p className="text-xl font-extrabold text-slate-900 text-amber-500">{counters.pending + counters.processing}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0 flex flex-col justify-between w-full md:w-56 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Verification Status</p>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-black text-slate-700">KYC Completed</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Verification Progress</span>
                      <span className="text-blue-600">100%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK ACTION CENTER */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                  {[
                    { label: "New Order", desc: "Apply Service", icon: Plus, color: "bg-blue-50 text-blue-600 border-blue-100", action: () => setServiceModalOpen(true) },
                    { label: "Track Files", desc: "Timeline logs", icon: FileText, color: "bg-indigo-50 text-indigo-600 border-indigo-100", action: () => navigateToTab("applications") },
                    { label: "My Wallet", desc: "Cashbacks", icon: WalletCards, color: "bg-emerald-50 text-emerald-600 border-emerald-100", action: () => navigateToTab("wallet") },
                    { label: "Refer & Earn", desc: "Invite links", icon: Gift, color: "bg-orange-50 text-orange-600 border-orange-100", action: () => navigateToTab("referral") },
                    { label: "Support Desk", desc: "24/7 CA help", icon: HelpCircle, color: "bg-teal-50 text-teal-600 border-teal-100", action: () => navigateToTab("support") }
                  ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={idx}
                        onClick={card.action}
                        className="p-4 rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-md shadow-sm hover:border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer flex flex-col justify-between h-28 active:scale-95 group"
                      >
                        <div className={`h-8 w-8 rounded-xl border flex items-center justify-center ${card.color} group-hover:scale-105 transition`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 leading-none">{card.label}</p>
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{card.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* APPLICATION COMMAND CENTER (RECENT ACTIVE SHEETS) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Application Command Center</h3>
                  {applications.length > 3 && (
                    <button onClick={() => navigateToTab("applications")} className="text-[11px] font-bold text-blue-600 hover:underline">
                      See all ({applications.length})
                    </button>
                  )}
                </div>

                {activeApplications.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-slate-100 rounded-3xl space-y-3 shadow-sm">
                    <p className="text-xs font-bold text-slate-400">All submissions are completed or checked.</p>
                    <button
                      onClick={() => setServiceModalOpen(true)}
                      className="h-8.5 px-4 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm"
                    >
                      New Application
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {activeApplications.slice(0, 3).map((app) => {
                      const timeline = getTimelineSteps(app);
                      const expert = getAssignedExpert(app.id);
                      const isOlympiad = app.service_slug === "csc-olympiad";
                      const formData = app.form_data as Record<string, string | number | undefined> | null;
                      const studentName = isOlympiad ? String(formData?.studentName || app.customer_details?.name || "Student") : "";
                      const studentClass = isOlympiad ? String(formData?.studentClass || "") : "";
                      
                      if (isOlympiad) {
                        return (
                          <div key={app.id} className="rounded-2xl border border-white/10 bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 p-4 shadow-lg text-slate-100 flex flex-col justify-between h-[230px] hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[8.5px] font-mono text-cyan-400/60 uppercase">PASS: {app.id.slice(0, 10).toUpperCase()}</span>
                                <div className="flex gap-1">
                                  <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    Olympiad Pass
                                  </span>
                                  <StatusBadge status={app.status} />
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white group-hover:text-cyan-400 transition">{app.service_name}</h4>
                                <p className="text-[9px] text-slate-400 mt-0.5">
                                  Candidate: <span className="font-extrabold text-slate-200">{studentName}</span> (Class {studentClass})
                                </p>
                              </div>
                            </div>
                            <div className="py-2 px-2.5 bg-slate-950/40 border border-white/5 rounded-xl space-y-1.5">
                              <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                <span>Verification Pipeline</span>
                                <span className="text-cyan-400 font-extrabold">{timeline.percent}%</span>
                              </div>
                              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${timeline.percent}%` }} />
                              </div>
                              <p className="text-[8.5px] text-slate-500 leading-normal truncate">Support coordinator assigned</p>
                            </div>
                            <div className="flex gap-2 pt-2.5 border-t border-white/5 shrink-0">
                              <Link
                                href={`/dashboard/applications/${app.id}`}
                                className="flex-1 h-8 flex items-center justify-center gap-1 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold text-slate-300 transition"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" /> Pass Details
                              </Link>
                              <a
                                href={`https://api.whatsapp.com/send?phone=${expert.phone.replace("+", "")}&text=${encodeURIComponent(`Hi, I need assistance with my application: ${app.service_name} (ID: ${app.id}).`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900/40 flex items-center justify-center shrink-0 transition"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={app.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between h-[230px] hover:border-slate-200 hover:shadow-md transition">
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[9px] font-mono text-slate-400 truncate">ID: {app.id.slice(0, 10)}...</span>
                              <StatusBadge status={app.status} />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1">{app.service_name}</h4>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                Created: {new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </div>

                          <div className="py-2 px-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500">
                              <span>Compliance Timeline</span>
                              <span className="text-blue-600 font-extrabold">{timeline.percent}%</span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${timeline.percent}%` }} />
                            </div>
                            <p className="text-[8.5px] text-slate-400 leading-normal truncate">Agent: {expert.name}</p>
                          </div>

                          <div className="flex gap-2 pt-2.5 border-t border-slate-100 shrink-0">
                            <Link
                              href={`/dashboard/applications/${app.id}`}
                              className="flex-1 h-8 flex items-center justify-center gap-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </Link>
                            <a
                              href={`https://api.whatsapp.com/send?phone=${expert.phone.replace("+", "")}&text=${encodeURIComponent(`Hi, I need assistance with my application: ${app.service_name} (ID: ${app.id}).`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 flex items-center justify-center shrink-0 transition"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SERVICE RECOMMENDATIONS ENGINE */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">AI-Assisted Recommendations</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {recommendedServices.map((service) => (
                    <div key={service.slug} className="rounded-2xl border border-slate-100 bg-white/70 p-4.5 shadow-sm hover:shadow-md hover:border-slate-200 transition flex flex-col justify-between h-[156px]">
                      <div>
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[8.5px] font-black text-blue-700 tracking-wide uppercase border border-blue-100">
                          {service.badge || "Recommended"}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-2 line-clamp-1">{service.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1 line-clamp-2">{service.shortDescription}</p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-2">
                        <span className="text-[10px] font-extrabold text-orange-600">{service.offerPrice || "CA Consultation"}</span>
                        <Link
                          href={`/apply/${service.slug}`}
                          className="h-7.5 px-3 rounded-full bg-blue-600 hover:bg-blue-700 text-[10px] font-extrabold text-white flex items-center gap-1 transition"
                        >
                          Apply <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REWARDS & ACHIEVEMENTS & SECURITY */}
              <div className="grid gap-6 md:grid-cols-[2fr_1.1fr]">
                
                {/* Rewards & Gamification */}
                <div className="p-5 rounded-3xl border border-slate-100 bg-white/60 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rewards & Milestones</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {achievements.map((badge) => (
                      <div key={badge.id} className={`p-3.5 rounded-2xl border flex gap-3 items-center ${
                        badge.unlocked ? "bg-white border-slate-200/80" : "bg-slate-50/50 border-slate-100 opacity-60"
                      }`}>
                        <span className="text-xl shrink-0">{badge.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 truncate">{badge.title}</p>
                          <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{badge.desc}</p>
                        </div>
                        {badge.unlocked ? (
                          <span className="ml-auto text-emerald-500 font-extrabold text-[10px]">✓</span>
                        ) : (
                          <span className="ml-auto text-slate-300 font-bold text-[10px]">🔒</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust & Security Center */}
                <div className="p-5 rounded-3xl border border-slate-100 bg-white/60 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Security & Access Log</h3>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Verified Email</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Yes
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Session Status</span>
                        <span className="font-bold text-slate-700">Encrypted SSL</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-400 font-medium">Last Login</span>
                        <span className="font-bold text-slate-600">Today, {new Date().toLocaleDateString("en-IN", { hour: "numeric", minute: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigateToTab("profile")}
                    className="h-8 w-full rounded-xl border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition"
                  >
                    View Security Settings
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MY APPLICATIONS LIST */}
          {activeTab === "applications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Track Applications</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Filter and review your service submissions ledger.</p>
                </div>
                <button
                  onClick={() => setServiceModalOpen(true)}
                  className="h-8.5 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                >
                  New Order
                </button>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl space-y-4">
                  <p className="text-sm font-bold text-slate-400">You haven&apos;t filed any applications yet.</p>
                  <button
                    onClick={() => setServiceModalOpen(true)}
                    className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-xs font-bold text-white cursor-pointer active:scale-95"
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

                    if (app.service_slug === "csc-olympiad") {
                      const formData = app.form_data as Record<string, string | number | undefined> | null;
                      const subjects = formData?.selectedSubjects 
                        ? String(formData.selectedSubjects).split(",").map((s) => s.trim()).filter(Boolean)
                        : [];
                      
                      const studentName = (formData?.studentName || app.customer_details?.name || "Student") as string;
                      const studentClass = String(formData?.studentClass || "N/A");
                      const schoolName = (formData?.schoolName || "N/A") as string;
                      const schoolBoard = (formData?.schoolBoard || "N/A") as string;
                      const examSession = (formData?.session || "Academic Session 2026-2027") as string;
                      
                      const isApproved = ["approved", "completed", "delivered"].includes(app.status);
                      const isCompleted = ["completed", "delivered"].includes(app.status);
                      
                      return (
                        <div key={app.id} className="rounded-3xl p-6 border border-slate-200/80 bg-gradient-to-tr from-cyan-50/40 via-white to-blue-50/40 shadow-lg relative overflow-hidden text-slate-700 hover:border-blue-400/40 transition-all duration-350 space-y-4 group">
                          {/* Ambient glow mesh */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
                          
                          <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[8.5px] font-black uppercase text-white tracking-wider shadow-sm select-none">
                                  CSC Olympiad {examSession}
                                </span>
                                <span className="text-[8.5px] font-mono text-blue-600 font-bold uppercase tracking-widest">Digital Entry Pass</span>
                              </div>
                              <h3 className="text-base font-black text-slate-900 tracking-tight mt-1.5 group-hover:text-blue-600 transition">
                                {app.service_name}
                              </h3>
                              <p className="text-[10px] font-mono text-slate-500">Application ID: {app.id}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Submitted: {new Date(app.created_at).toLocaleDateString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatusBadge status={app.status} />
                              <PaymentBadge status={app.payment_status ?? "pending"} />
                            </div>
                          </div>

                          {/* Candidate & Exam Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 text-xs text-slate-500 relative z-10">
                            <div className="space-y-1">
                              <p className="text-[9px] font-bold uppercase text-slate-400">Candidate Name</p>
                              <p className="font-extrabold text-slate-800">{studentName}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-bold uppercase text-slate-400">Class & Board</p>
                              <p className="font-extrabold text-slate-800">Class {studentClass} ({schoolBoard})</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-bold uppercase text-slate-400">School Name</p>
                              <p className="font-extrabold text-slate-800 truncate" title={schoolName}>{schoolName}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-bold uppercase text-slate-400">Exam Window</p>
                              <p className="font-extrabold text-blue-600">Dec 2026 (Online)</p>
                            </div>
                          </div>

                          {/* Selected Subjects Pill Box */}
                          <div className="space-y-1.5 relative z-10">
                            <p className="text-[9px] font-bold uppercase text-slate-400 px-1">Registered Subjects ({subjects.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                              {subjects.map((sub, sIdx) => (
                                <span key={sIdx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/50 text-[11px] font-bold text-blue-700">
                                  <Compass className="h-3 w-3 text-blue-600" />
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Barcode Simulator to enhance Apple Wallet aesthetics */}
                          <div className="py-2.5 flex flex-col items-center justify-center border-t border-b border-slate-200/60 bg-slate-50/50 relative z-10">
                            <div className="h-6 w-56 flex items-center justify-center gap-[1.5px] opacity-75">
                              {Array.from({ length: 48 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className="h-full bg-slate-850" 
                                  style={{ 
                                    width: i % 4 === 0 ? "2.5px" : i % 3 === 0 ? "1px" : "1.5px",
                                    opacity: i % 7 === 0 ? 0.3 : 1
                                  }} 
                                />
                              ))}
                            </div>
                            <span className="text-[8px] font-mono text-slate-500 tracking-[0.25em] mt-1 uppercase">*{app.id.slice(0, 12).toUpperCase()}*</span>
                          </div>

                          {/* Actions Section */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs relative z-10">
                            <span className="font-black text-slate-900">
                              Paid Amount: {formatCurrency(app.total_amount ?? app.amount)}
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Prep Material Download */}
                              <a
                                href={`/api/csc-olympiad/prep-material?id=${app.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 transition duration-150 cursor-pointer select-none"
                              >
                                <Compass className="h-3.5 w-3.5 text-blue-650" /> Prep Study Material
                              </a>

                              {/* Admit Card Download */}
                              {isApproved ? (
                                <a
                                  href={`/api/csc-olympiad/admit-card?id=${app.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold transition shadow-lg shadow-blue-500/15 duration-150 cursor-pointer select-none"
                                >
                                  <Download className="h-3.5 w-3.5" /> Admit Card
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-slate-50 text-slate-400 border border-slate-200/60 cursor-not-allowed text-[11px] font-bold"
                                  title="Admit Card will be available after registration review/approval."
                                >
                                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Admit Card (Awaiting)
                                </button>
                              )}

                              {/* Certificate Download */}
                              {isCompleted ? (
                                <a
                                  href={`/api/csc-olympiad/certificate?id=${app.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition shadow-lg shadow-emerald-500/15 duration-150 cursor-pointer select-none"
                                >
                                  <Award className="h-3.5 w-3.5" /> Certificate
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-slate-50 text-slate-400 border border-slate-200/60 cursor-not-allowed text-[11px] font-bold"
                                  title="Certificate will be issued post final examination."
                                >
                                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Certificate (Awaiting)
                                </button>
                              )}

                              <a
                                href={whatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/60 transition duration-150 cursor-pointer"
                              >
                                <MessageCircle className="h-4 w-4 text-emerald-600" /> Support Desk
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={app.id} className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 leading-normal">{app.service_name}</h3>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">ID: {app.id}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Created: {new Date(app.created_at).toLocaleDateString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={app.status} />
                            <PaymentBadge status={app.payment_status ?? "pending"} />
                          </div>
                        </div>

                        {/* Interactive timeline progress representations */}
                        <div className="py-4 px-4 rounded-xl bg-slate-50 border border-slate-100/50 space-y-3">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                            <span>Compliance Timeline</span>
                            <span className="text-blue-600">{timeline.percent}% Complete</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${timeline.percent}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {timeline.steps.map((st, sIdx) => (
                              <div key={sIdx} className="space-y-1 text-center">
                                <div className="flex items-center justify-center">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    st.active
                                      ? "bg-blue-600 text-white shadow-sm"
                                      : "bg-slate-200 text-slate-400"
                                  }`}>
                                    {sIdx + 1}
                                  </div>
                                </div>
                                <span className={`block text-[9.5px] font-bold truncate ${st.active ? "text-blue-600" : "text-slate-400"}`}>
                                  {st.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
                          <span className="font-extrabold text-slate-700">
                            Service Cost: {formatCurrency(app.total_amount ?? app.amount)}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/applications/${app.id}`}
                              className="inline-flex h-8 items-center justify-center gap-1 px-4 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-slate-600 transition"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </Link>

                            {["documents_required", "document_pending"].includes(app.status) && (
                              <button
                                onClick={() => {
                                  setUploadAppId(app.id);
                                  navigateToTab("documents");
                                }}
                                className="inline-flex h-8 items-center justify-center gap-1 px-4 rounded-full bg-orange-500 text-white font-black transition active:scale-95 cursor-pointer"
                              >
                                <Upload className="h-3.5 w-3.5 animate-bounce" /> Upload Files
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
                              className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold border border-emerald-100"
                            >
                              <MessageCircle className="h-4 w-4" /> WhatsApp Support
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Wallet Overview</h2>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-5 rounded-3xl border border-slate-100 bg-gradient-to-tr from-blue-50/50 to-indigo-50/50 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-3.5 right-3.5 h-9 w-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                    <WalletCards className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</p>
                  <p className="text-3xl font-black text-slate-900 leading-none">
                    {safeCurrency(walletSnapshot?.wallet?.balance_points ?? stats.walletBalance)}
                  </p>
                  <p className="text-[9.5px] text-emerald-600 font-bold">&bull; Ready to redeem on next order</p>
                </div>

                <div className="p-5 rounded-3xl border border-slate-100 bg-white/70 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-3.5 right-3.5 h-9 w-9 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center shadow-sm">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Balance</p>
                  <p className="text-3xl font-black text-orange-500 leading-none">
                    {safeCurrency(walletBreakdown.pendingBalance)}
                  </p>
                  <p className="text-[9.5px] text-slate-400">Unlocks after referred user completes order</p>
                </div>

                <div className="p-5 rounded-3xl border border-slate-100 bg-white/70 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-3.5 right-3.5 h-9 w-9 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shadow-sm">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Cashback</p>
                  <p className="text-3xl font-black text-amber-500 leading-none">
                    {safeCurrency(walletSnapshot?.cashbackEarned ?? stats.lifetimeEarning)}
                  </p>
                  <p className="text-[9.5px] text-slate-400">This Month: <strong>{safeCurrency(walletBreakdown.thisMonthCashback)}</strong></p>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Recent Transactions</h3>
                
                {!walletSnapshot?.transactions?.length ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 space-y-2">
                    <AlertCircle className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">No transactions recorded yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {walletSnapshot.transactions.map((tx) => {
                      const isCredit = tx.amount > 0 && !["redeem", "expiry", "redemption"].includes(tx.type);
                      return (
                        <div key={tx.id} className="p-4 rounded-xl border border-slate-100 bg-white/80 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="bg-slate-100 px-2 py-0.5 text-[8.5px] font-black uppercase text-slate-500 rounded">
                                {tx.type.replace(/_/g, " ")}
                              </span>
                              <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                tx.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 mt-1.5 leading-snug">{tx.description}</p>
                            <p className="text-[9.5px] text-slate-400 mt-0.5">
                              {new Date(tx.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </p>
                          </div>
                          <span className={`text-sm font-black shrink-0 ${isCredit ? "text-emerald-600" : "text-orange-600"}`}>
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Referral Hub</h2>

              {/* Conversion Funnel */}
              <div className="p-5 rounded-3xl border border-slate-100 bg-white/60 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Conversion Funnel</h3>
                
                <div className="grid gap-4 sm:grid-cols-4 text-center">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 relative">
                    <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10 text-slate-300">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <UserPlus className="h-5 w-5 text-blue-600 mx-auto" />
                    <p className="text-lg font-black text-slate-900">{invitesCount}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Invites Sent</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 relative">
                    <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10 text-slate-300">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <CheckSquare className="h-5 w-5 text-indigo-600 mx-auto" />
                    <p className="text-lg font-black text-slate-900">{referralSummary?.referrals?.length ?? 0}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Registered</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 relative">
                    <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10 text-slate-300">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <Award className="h-5 w-5 text-emerald-600 mx-auto" />
                    <p className="text-lg font-black text-slate-900">{referralSummary?.completed ?? 0}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Completed Orders</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <TrendingUp className="h-5 w-5 text-amber-600 mx-auto" />
                    <p className="text-lg font-black text-emerald-600">{referralBreakdown.conversionRate}%</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Conversion Rate</p>
                  </div>
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="p-5 rounded-3xl border border-slate-100 bg-white/70 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Performance Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5">Timeframe</th>
                        <th className="py-2.5">Signups</th>
                        <th className="py-2.5">Completed Orders</th>
                        <th className="py-2.5 text-right">Rewards Unlocked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {[
                        { label: "Today", data: referralBreakdown.today },
                        { label: "This Week", data: referralBreakdown.week },
                        { label: "This Month", data: referralBreakdown.month },
                        { label: "Lifetime", data: referralBreakdown.lifetime }
                      ].map((row) => (
                        <tr key={row.label}>
                          <td className="py-3 font-bold text-slate-800">{row.label}</td>
                          <td className="py-3">{row.data.invites}</td>
                          <td className="py-3">{row.data.completed}</td>
                          <td className="py-3 text-right text-emerald-600 font-extrabold">+{safeCurrency(row.data.rewards)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code sharing widget */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-2xl border border-slate-100 bg-white/80 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Your Referral Code</p>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono font-bold text-slate-800 text-sm">
                    <span>{referralSummary?.code || stats.code || "SYNCING"}</span>
                    <button onClick={handleCopyCode} className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer">
                      {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-100 bg-white/80 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Referral Link</p>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500 truncate">
                    <span className="truncate mr-4">{referralSummary?.link || stats.link || "SYNCING"}</span>
                    <button onClick={handleCopyLink} className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer shrink-0">
                      {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Social sharing buttons */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-white/60 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Share Link Directly</h3>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join DigiConnect Dukan using my referral link & earn cashbacks on Gov ID & Tax services! ${referralSummary?.link || stats.link}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(referralSummary?.link || stats.link || "")}&text=${encodeURIComponent("Join DigiConnect Dukan and request digital applications with cashback bonus!")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <Send className="h-4 w-4" /> Telegram
                  </a>

                  <button
                    onClick={handleShare}
                    className="inline-flex h-9 items-center justify-center gap-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white transition cursor-pointer"
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Documents Center</h2>
              
              <div className="p-5 rounded-3xl border border-slate-100 bg-white/70 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Upload Required Files</h3>
                
                {applications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
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
                          className="h-10 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
                        >
                          <option value="">Select Application...</option>
                          {applications.map((app) => (
                            <option key={app.id} value={app.id}>
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
                          className="h-10 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
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
                          ? "border-blue-500 bg-blue-50/50 text-slate-800"
                          : uploadFile
                            ? "border-emerald-300 bg-emerald-50/30 text-slate-800"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                      />
                      <Upload className={`h-8 w-8 ${uploadFile ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} />
                      <div>
                        {uploadFile ? (
                          <p className="text-xs font-bold text-emerald-600 truncate max-w-xs">{uploadFile.name}</p>
                        ) : (
                          <p className="text-xs font-bold text-slate-600">
                            Drag &amp; drop document or <span className="text-blue-600">click to browse</span>
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG or WebP up to 5MB</p>
                      </div>
                    </div>

                    {isUploading && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Uploading file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploading || !uploadFile}
                      className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-extrabold text-white flex items-center justify-center gap-2 transition active:scale-95 shadow-sm cursor-pointer border-none"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? "Uploading File..." : "Submit File"}
                    </button>
                  </form>
                )}
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Uploaded Checklist</h3>
                
                {documents.length === 0 ? (
                  <p className="p-6 text-center text-xs font-semibold text-slate-400 bg-white rounded-2xl border border-slate-100">
                    No files uploaded yet.
                  </p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {documents.map((doc) => {
                      const appRef = applications.find((a) => a.id === doc.application_id);
                      const isRejected = doc.status === "rejected" || doc.review_status === "rejected";
                      return (
                        <div key={doc.id} className="p-4 rounded-xl border border-slate-100 bg-white/80 flex flex-col justify-between gap-3 text-xs">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="bg-blue-50 border border-blue-100 text-blue-600 text-[8.5px] font-black uppercase px-2 py-0.5 rounded">
                                {doc.document_type || "Customer Upload"}
                              </span>
                              <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                doc.status === "approved" || doc.review_status === "approved"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : isRejected
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : "bg-slate-50 text-slate-500"
                              }`}>
                                {doc.review_status || doc.status || "Pending Review"}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 truncate mt-1">{doc.file_name}</p>
                            {appRef && (
                              <p className="text-[9.5px] text-slate-400">For application: {appRef.service_name}</p>
                            )}
                            
                            {isRejected && (
                              <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 flex items-start gap-1.5 mt-1 text-[9.5px]">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <span className="text-rose-600 leading-normal font-bold">
                                  Rejection reason: File not clear or blurry. Please re-upload.
                                </span>
                              </div>
                            )}
                            
                            <p className="text-[9px] text-slate-400">
                              Uploaded: {new Date(doc.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </p>
                          </div>
                          <div className="flex gap-2 border-t border-slate-100 pt-2 mt-1">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 font-bold text-slate-600 text-[10px] transition cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-blue-600" /> Download Document
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GST CERTIFICATE VAULT */}
              <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[9px] font-black text-blue-700 border border-blue-100 uppercase tracking-wider">
                      GST Vault
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1.5 tracking-tight">
                      GST Compliance & Certificate Vault
                    </h3>
                    <p className="text-xs text-slate-500">
                      Official licenses, GSTR return filings, and tax challans processed automatically.
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Autopilot Synced
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
                      <div key={vIdx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-between h-40 shadow-sm group hover:border-blue-200 transition">
                        <div className="space-y-1.5">
                          <span className="inline-block bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-100">
                            {vItem.type}
                          </span>
                          <p className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition">
                            {vItem.name}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            {vItem.desc}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/55">
                          <button
                            onClick={() => {
                              toastSuccess(`Downloading: ${vItem.file}`);
                            }}
                            className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[9.5px] font-black hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Download className="h-3 w-3 text-blue-600" /> Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-3">
                    <div className="max-w-md mx-auto space-y-2 relative z-10">
                      <Lock className="h-6 w-6 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-xs font-black text-slate-800">GST Ecosystem Vault is Locked</p>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                          Your automated filings folder and REG-06 license vault are not active. Apply for a GST registration to unlock.
                        </p>
                      </div>
                      <button
                        onClick={() => setServiceModalOpen(true)}
                        className="inline-flex h-8 items-center gap-1 rounded-full bg-blue-600 px-4 text-[10px] font-black text-white hover:bg-blue-700 transition active:scale-95 shadow-sm cursor-pointer border-none"
                      >
                        Unlock GST Vault
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Support Center</h2>
              
              <div className="p-5 rounded-3xl border border-slate-100 bg-white/70 space-y-4">
                <p className="text-xs text-slate-500 leading-normal font-semibold">
                  Our professional CA tax specialists and coordinators are available to resolve documentation checks, payment questions, and application status doubts.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { title: "CIBIL & Finance Coordinator", phone: "+91 8287002983", desc: "Consultant for bureau score analysis, loans, card verification, and improvements." },
                    { title: "Primary Support Line", phone: "+91 7007595931", desc: "Status checking details, document upload issues, and generic tax enquiries." },
                    { title: "Office Support Desk", phone: "+91 9305086491", desc: "General billing reconciliation, print receipts, and invoice discrepancies." }
                  ].map((sup, idx) => {
                    const rawPhone = sup.phone.replace(/[^0-9+]/g, "");
                    const whatsAppUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(`Hi, I need support regarding DigiConnect Dukan.`)}`;

                    return (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-white/50 space-y-3 shadow-sm">
                        <div>
                          <h3 className="text-xs font-black text-slate-800">{sup.title}</h3>
                          <p className="text-[10.5px] text-slate-400 mt-1 leading-normal font-medium">{sup.desc}</p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${rawPhone}`}
                            className="flex-1 h-8.5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call Expert
                          </a>
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 h-8.5 flex items-center justify-center gap-1.5 border border-emerald-100 bg-emerald-50 hover:bg-emerald-100/50 rounded-xl text-xs font-bold text-emerald-600 transition cursor-pointer"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>General Support Email:</span>
                  <a href="mailto:support@rnos.in" className="font-extrabold text-blue-600 hover:underline">
                    support@rnos.in
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <div className="space-y-6 pb-20">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Profile Settings</h2>

              <div className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-white/70 p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black text-white shadow-md uppercase shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-800 truncate">{formFullName || profile.name}</h3>
                      <span className="inline-flex h-5 items-center gap-0.5 px-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[200px]">
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
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Profile Completion</span>
                          <span className={pct === 100 ? "text-emerald-600" : "text-orange-500"}>
                            {pct === 100 ? "100%" : `${pct}%`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
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
                
                {/* Personal Details */}
                <div className="p-6 rounded-[24px] bg-white border border-slate-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <UserRound className="h-4.5 w-4.5 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Personal Details</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name</span>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        required
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mobile Number</span>
                      <input
                        type="tel"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        value={formMobile}
                        onChange={(e) => setFormMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        required
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Address (Readonly)</span>
                      <input
                        type="email"
                        value={user.email || ""}
                        readOnly
                        disabled
                        className="h-10 rounded-xl border border-slate-200/50 bg-slate-50 px-3.5 text-xs font-medium text-slate-400 outline-none cursor-not-allowed"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date of Birth (Optional)</span>
                      <input
                        type="date"
                        value={formDob}
                        onChange={(e) => setFormDob(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gender (Optional)</span>
                      <select
                        value={formGender}
                        onChange={(e) => setFormGender(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      >
                        <option value="">Select gender</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Address Details */}
                <div className="p-6 rounded-[24px] bg-white border border-slate-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Compass className="h-4.5 w-4.5 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Address & Location</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 relative">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">PIN Code</span>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          value={formPincode}
                          onChange={(e) => setFormPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          required
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3.5 pr-10 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                          placeholder="6-digit PIN"
                        />
                        {isPincodeLoading && (
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                        )}
                      </div>
                      {!isPincodeLoading && pincodeFetched && (
                        <p className="text-[9.5px] text-emerald-600 font-bold mt-0.5">Location verified</p>
                      )}
                    </label>

                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">City / Main Post Office</span>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        required
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">District</span>
                      <input
                        type="text"
                        value={formDistrict}
                        onChange={(e) => setFormDistrict(e.target.value)}
                        required
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">State</span>
                      <input
                        type="text"
                        value={formState}
                        onChange={(e) => setFormState(e.target.value)}
                        required
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Street Address / Landmark</span>
                      <textarea
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        required
                        className="h-20 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition resize-none"
                      />
                    </label>
                  </div>
                </div>

                {/* Service Preferences */}
                <div className="p-6 rounded-[24px] bg-white border border-slate-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Globe className="h-4.5 w-4.5 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Preferences</h3>
                  </div>
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-extrabold text-slate-700">WhatsApp Updates</p>
                        <p className="text-[9.5px] text-slate-400 mt-0.5">Receive transaction logs and CA queries in chat.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefWhatsapp}
                        onChange={(e) => setPrefWhatsapp(e.target.checked)}
                        className="h-4.5 w-4.5 rounded bg-slate-100 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-extrabold text-slate-700">Email & SMS Alerts</p>
                        <p className="text-[9.5px] text-slate-400 mt-0.5">Receive monthly tax reminders and verified invoices.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefNotifications}
                        onChange={(e) => setPrefNotifications(e.target.checked)}
                        className="h-4.5 w-4.5 rounded bg-slate-100 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Preferred Support Language</span>
                      <select
                        value={prefLanguage}
                        onChange={(e) => setPrefLanguage(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                      >
                        <option value="Hindi">Hindi</option>
                        <option value="English">English</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full md:w-auto h-11 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-black text-white shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-none"
                  >
                    {isSavingProfile ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving Profile...
                      </span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Settings
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: SECURE VAULT */}
          {activeTab === "vault" && (
            <CustomerVault user={user} />
          )}

        </main>

        {/* MOBILE NOTIFICATION BOTTOM SHEET */}
        {showNotifPopover && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40" 
              onClick={() => setShowNotifPopover(false)} 
            />
            {/* Bottom Sheet */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-white border-t border-slate-100 p-5 shadow-lg max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800">Smart Alerts</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">{unreadNotifCount} Unread</p>
                </div>
                <div className="flex items-center gap-3">
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-black text-blue-600 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifPopover(false)}
                    className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 pb-6 scrollbar-thin">
                {localNotifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8 font-bold">No recent alerts.</p>
                ) : (
                  localNotifications.map((notif) => {
                    const badge = getNotifPriorityBadge(notif);
                    return (
                      <div key={notif.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(notif.created_at).toLocaleDateString("en-IN", { dateStyle: "short" })}
                          </span>
                        </div>
                        <p className="font-extrabold text-slate-800 leading-snug">{notif.title}</p>
                        <p className="text-slate-500 leading-normal text-[11px]">{notif.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* SERVICE SELECTOR MODAL */}
        {serviceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-6">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" 
              onClick={() => setServiceModalOpen(false)} 
            />
            
            {/* Modal Box */}
            <div className="relative z-10 flex max-h-[85vh] md:max-h-[80vh] w-full md:max-w-2xl flex-col overflow-hidden rounded-t-[28px] md:rounded-[24px] border border-slate-100 bg-white shadow-xl animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
              <div className="md:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              {/* Header */}
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5 md:p-6">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Apply for a New Service</h2>
                  <p className="mt-1 text-xs text-slate-400">Select an essential service to start your digital application instantly.</p>
                </div>
                <button 
                  onClick={() => setServiceModalOpen(false)} 
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              {/* Search Bar & Category Filter */}
              <div className="shrink-0 p-5 md:p-6 space-y-4 border-b border-slate-100">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    placeholder="Search documents, schemes, registrations..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </label>
                
                {/* Categories Row */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {["All", "Popular", "Recent", "Tax & Business", "Cards & IDs", "Loans & Banking"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setServiceCategory(cat)}
                      className={`h-8 shrink-0 rounded-full px-4 text-xs font-bold transition cursor-pointer ${
                        serviceCategory === cat 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services List */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
                {/* Recent Applied Services */}
                {(serviceCategory === "All" || serviceCategory === "Recent") && (
                  <div className="space-y-2.5">
                    <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">Recently Applied</h3>
                    {applications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic px-2">No recently applied services.</p>
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
                            return <p className="text-[11px] text-slate-400 italic px-2">No recently applied services.</p>;
                          }

                          return recentServices.map((service) => {
                            const Icon = service.icon || Compass;
                            return (
                              <Link
                                key={`recent-${service.slug}`}
                                href={`/apply/${service.slug}`}
                                onClick={() => setServiceModalOpen(false)}
                                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-blue-300 transition text-left cursor-pointer group"
                              >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition">
                                  <Icon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-blue-600">{service.title}</span>
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
                  <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">
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
                      if (serviceCategory === "Recent") return false;
                      if (serviceCategory === "Tax & Business") return service.categorySlug === "tax" || service.categorySlug === "company";
                      if (serviceCategory === "Cards & IDs") return service.categorySlug === "cards" || service.categorySlug === "licence";
                      if (serviceCategory === "Loans & Banking") return service.categorySlug === "loans" || service.categorySlug === "banking" || service.categorySlug === "insurance";
                      return true;
                    });

                    if (filtered.length === 0) {
                      return <p className="text-xs text-slate-400 text-center py-6">No matching services found.</p>;
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
                              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-blue-300 transition text-left cursor-pointer group"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition">
                                  <Icon className="h-5 w-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-blue-600">{service.title}</span>
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
              <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[9px] text-slate-400 px-6">
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
