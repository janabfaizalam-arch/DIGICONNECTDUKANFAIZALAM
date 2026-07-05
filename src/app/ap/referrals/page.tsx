"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MousePointerClick,
  Users,
  CheckCircle,
  TrendingUp,
  Copy,
  MessageSquare,
  QrCode,
  X,
  ExternalLink,
  Share2,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Briefcase,
  FileSpreadsheet,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { formatCurrency } from "@/lib/portal-data";

type AnalyticsData = {
  success: boolean;
  stats: {
    totalShared: number;
    clicks: number;
    uniqueVisitors: number;
    applications: number;
    payments: number;
    conversionRate: number;
    commissionEarned: number;
    pendingCommission: number;
  };
  topServices: Array<{ count: number; name: string }>;
  trafficSources: Array<{ source: string; count: number }>;
  paymentLinks: Array<{
    id: string;
    code: string;
    amount: number;
    status: "pending" | "paid" | "expired" | "cancelled";
    expires_at: string;
    created_at: string;
    paid_at?: string;
    applications?: { service_name: string; status: string };
    profiles?: { full_name: string };
  }>;
  recentActivity: {
    clicks: Array<{ id: string; ip_address: string; device_type: string; created_at: string }>;
    conversions: Array<{
      id: string;
      created_at: string;
      applications: { service_name: string; amount: number };
      profiles: { full_name: string };
    }>;
  };
};

export default function PartnerReferralAnalyticsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  
  // Modals / Overlays
  const [selectedLinkCode, setSelectedLinkCode] = useState<string | null>(null);
  const [selectedLinkUrl, setSelectedLinkUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const [waShareDetails, setWaShareDetails] = useState<{
    code: string;
    customerName: string;
    serviceName: string;
    amount: number;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<"invoice" | "reminder" | "completion">("invoice");
  const [customMessage, setCustomMessage] = useState("");

  const handleExtendLink = async (code: string, hours = 24) => {
    try {
      setIsExtending(true);
      const res = await fetch("/api/payment-links/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, extendHours: hours }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toastSuccess(`Payment link expiry extended by ${hours} hours!`);
        fetchAnalytics();
      } else {
        toastError(resData.error || "Failed to extend link.");
      }
    } catch (err) {
      toastError("Network error. Please try again.");
    } finally {
      setIsExtending(false);
    }
  };

  useEffect(() => {
    if (!waShareDetails) return;
    const url = `${window.location.origin}/pay/${waShareDetails.code}`;
    let text = "";
    if (selectedTemplate === "invoice") {
      text = `Hello ${waShareDetails.customerName},\n\nYour application invoice is ready.\n\nService: ${waShareDetails.serviceName}\nAmount: ₹${waShareDetails.amount}\n\nComplete payment securely:\n${url}\n\nThank you\nDigiConnect Dukan`;
    } else if (selectedTemplate === "reminder") {
      text = `Hello ${waShareDetails.customerName},\n\nFriendly reminder: The payment link for your ${waShareDetails.serviceName} application is pending.\n\nAmount: ₹${waShareDetails.amount}\nLink: ${url}\n\nPlease complete the payment to avoid application delay.\n\nThank you!`;
    } else if (selectedTemplate === "completion") {
      text = `Hello ${waShareDetails.customerName},\n\nGreat news! Your application for ${waShareDetails.serviceName} is completed.\n\nThank you for choosing DigiConnect Dukan!`;
    }
    setCustomMessage(text);
  }, [waShareDetails, selectedTemplate]);

  const triggerWaShare = () => {
    if (!customMessage) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(customMessage)}`, "_blank");
    setWaShareDetails(null);
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ap/referrals/analytics");
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else {
        toastError("Failed to fetch analytics statistics.");
      }
    } catch (err) {
      toastError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleOpenQRModal = (code: string) => {
    const url = `${window.location.origin}/pay/${code}`;
    setSelectedLinkCode(code);
    setSelectedLinkUrl(url);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`);
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/pay/${code}`;
    navigator.clipboard.writeText(url);
    toastSuccess("Payment link copied to clipboard!");
  };

  const handleWhatsAppLink = (code: string, customerName: string, serviceName: string, amount: number) => {
    const url = `${window.location.origin}/pay/${code}`;
    const text = `Hello ${customerName},\n\nYour application is ready.\n\nService: ${serviceName}\nAmount: ₹${amount}\n\nComplete payment securely:\n${url}\n\nThank you\nDigiConnect Dukan`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCancelLink = async (code: string) => {
    try {
      setIsCancelling(true);
      const res = await fetch("/api/payment-links/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toastSuccess("Payment link cancelled successfully!");
        setCancellingCode(null);
        fetchAnalytics();
      } else {
        toastError(resData.error || "Failed to cancel link.");
      }
    } catch (err) {
      toastError("Network error. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading referral stats & links...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8 p-1 sm:p-4">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 border border-indigo-100 text-xs font-bold text-indigo-600">
          <Share2 className="h-3.5 w-3.5" />
          Partners OS V6
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Referrals & Payment Links
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">
          Track referral clicks, check conversion commissions, and manage customer payment checkout requests.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Referral Shared</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><Briefcase className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{stats.totalShared}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Unique active service tokens</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Clicks</span>
              <span className="p-2 rounded-xl bg-violet-50 text-violet-600"><MousePointerClick className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{stats.clicks}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{stats.uniqueVisitors} Unique IP visitors</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Conversions</span>
              <span className="p-2 rounded-xl bg-green-50 text-green-600"><CheckCircle className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{stats.applications}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{stats.payments} Paid & Verified ({stats.conversionRate}% rate)</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Earnings</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{formatCurrency(stats.commissionEarned)}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{formatCurrency(stats.pendingCommission)} Reserved / Pending</p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Side Links, Right Side Top Traffic */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Traffic & Top Services Column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Top Services */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              Top Services
            </h2>
            <div className="space-y-4">
              {data?.topServices && data.topServices.length > 0 ? (
                data.topServices.map((srv, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 rounded-2xl p-3 border border-slate-100/50">
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">{srv.name}</span>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{srv.count} sales</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 font-medium py-4 text-center">No conversions logged yet.</p>
              )}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Traffic Sources
            </h2>
            <div className="space-y-4">
              {data?.trafficSources && data.trafficSources.length > 0 ? (
                data.trafficSources.map((src, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 rounded-2xl p-3 border border-slate-100/50">
                    <span className="text-xs font-semibold text-slate-800">{src.source}</span>
                    <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{src.count} clicks</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 font-medium py-4 text-center">No traffic clicks tracked yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Links Tables Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-slate-400" />
                Active Payment Links
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Link Details</th>
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6">Amount</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {data?.paymentLinks && data.paymentLinks.length > 0 ? (
                    data.paymentLinks.map((link) => {
                      const customerName = link.profiles?.full_name || "Customer";
                      const serviceName = link.applications?.service_name || "Digital Service";
                      const isExpired = new Date(link.expires_at) < new Date() && link.status === "pending";
                      const displayStatus = isExpired ? "expired" : link.status;
                      
                      return (
                        <tr key={link.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-900">{link.code}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{serviceName}</p>
                          </td>
                          <td className="py-4 px-6 text-slate-600 font-medium">
                            {customerName}
                          </td>
                          <td className="py-4 px-6 text-slate-900 font-bold">
                            ₹{link.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              displayStatus === "paid" ? "bg-green-50 text-green-700 border-green-150" :
                              displayStatus === "cancelled" ? "bg-slate-50 text-slate-500 border-slate-150" :
                              displayStatus === "expired" ? "bg-amber-50 text-amber-600 border-amber-150" :
                              "bg-blue-50 text-blue-700 border-blue-150"
                            }`}>
                              {displayStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-1.5">
                              {displayStatus === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleCopyLink(link.code)}
                                    title="Copy Payment Link"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition flex items-center justify-center shadow-sm"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setWaShareDetails({ code: link.code, customerName, serviceName, amount: link.amount })}
                                    title="WhatsApp Share Templates"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-green-600 transition flex items-center justify-center shadow-sm"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenQRModal(link.code)}
                                    title="QR Code Overlay"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition flex items-center justify-center shadow-sm"
                                  >
                                    <QrCode className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleExtendLink(link.code)}
                                    title="Extend Expiry (Add 24h)"
                                    disabled={isExtending}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-amber-600 transition flex items-center justify-center shadow-sm disabled:opacity-50"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setCancellingCode(link.code)}
                                    title="Cancel Payment Link"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition flex items-center justify-center shadow-sm"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {displayStatus === "expired" && (
                                <>
                                  <button
                                    onClick={() => handleExtendLink(link.code)}
                                    title="Reopen / Extend Expiry (Add 24h)"
                                    disabled={isExtending}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-amber-600 transition flex items-center justify-center shadow-sm disabled:opacity-50"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setCancellingCode(link.code)}
                                    title="Cancel Payment Link"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition flex items-center justify-center shadow-sm"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              
                              {displayStatus === "paid" && (
                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                  Paid: {link.paid_at ? new Date(link.paid_at).toLocaleDateString() : ""}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                        No customer payment links generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedLinkCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-6 text-center animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedLinkCode(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition border border-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Payment Link QR Code</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Code: {selectedLinkCode}</p>
            </div>

            <div className="flex justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <img src={qrUrl} alt="QR Code" className="h-48 w-48 object-contain rounded-lg shadow-sm" />
            </div>

            <div className="space-y-1 text-left">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Secure URL</span>
              <input
                type="text"
                readOnly
                value={selectedLinkUrl}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 outline-none"
              />
            </div>

            <a
              href={qrUrl}
              download={`payment-${selectedLinkCode}-qr.png`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-lg shadow-blue-500/15"
            >
              <Download className="h-4 w-4" /> Download QR Image
            </a>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-6 text-center animate-in fade-in duration-200">
            <div className="h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Cancel Payment Link</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Are you sure you want to cancel the link for {cancellingCode}?</p>
            </div>

            <div className="flex gap-3">
              <button
                disabled={isCancelling}
                onClick={() => setCancellingCode(null)}
                className="flex-1 h-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
              >
                No, Keep
              </button>
              <button
                disabled={isCancelling}
                onClick={() => handleCancelLink(cancellingCode)}
                className="flex-1 h-11 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex gap-1.5 justify-center"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Templates Preview & Share Modal */}
      {waShareDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-5 text-left animate-in fade-in duration-200">
            <button
              onClick={() => setWaShareDetails(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition border border-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">WhatsApp Automation Templates</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Select a pre-designed template, customize it, and share manually.</p>
            </div>

            {/* Template Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedTemplate("invoice")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                  selectedTemplate === "invoice" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Invoice Link
              </button>
              <button
                onClick={() => setSelectedTemplate("reminder")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                  selectedTemplate === "reminder" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Payment Reminder
              </button>
              <button
                onClick={() => setSelectedTemplate("completion")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                  selectedTemplate === "completion" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Completion Alert
              </button>
            </div>

            {/* Template Preview and Edit Textarea */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Edit Custom Message</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(customMessage);
                  toastSuccess("Message text copied!");
                }}
                className="flex-1 h-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
              >
                Copy Text
              </button>
              <button
                onClick={triggerWaShare}
                className="flex-1 h-11 items-center justify-center rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs transition flex gap-1.5 justify-center"
              >
                <MessageSquare className="h-4 w-4" /> Send WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
