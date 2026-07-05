"use client";

import { useState } from "react";
import { 
  Briefcase, 
  MousePointerClick, 
  Trash2, 
  Share2, 
  X, 
  UserPlus, 
  ArrowLeftRight, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  FileSpreadsheet, 
  ClipboardCheck, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { formatCurrency } from "@/lib/portal-data";

type ReferralRow = {
  id: string;
  token: string;
  service_slug: string;
  created_at: string;
  agency_partners?: {
    id: string;
    full_name: string;
    business_name?: string | null;
  } | null;
};

type PaymentLinkRow = {
  id: string;
  code: string;
  amount: number;
  status: "pending" | "paid" | "expired" | "cancelled" | "failed";
  expires_at: string;
  created_at: string;
  paid_at?: string | null;
  applications?: {
    service_name: string;
    status: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
  agency_partners?: {
    full_name: string;
  } | null;
};

type CommissionRow = {
  id: string;
  calculated_amount: number;
  status: string;
  service_name: string;
  created_at: string;
  agency_partners?: {
    full_name: string;
  } | null;
  applications?: {
    service_name: string;
  } | null;
};

type AuditLogRow = {
  id: string;
  commission_id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_at: string;
  profiles?: {
    full_name: string;
  } | null;
};

interface AdminReferralManagerProps {
  initialReferrals: ReferralRow[];
  initialPaymentLinks: PaymentLinkRow[];
  initialCommissions: CommissionRow[];
  initialAuditLogs: AuditLogRow[];
  partners: Array<{ id: string; full_name: string; business_name?: string | null }>;
  customers: Array<{ id: string; full_name: string; email: string | null; mobile: string | null }>;
}

export function AdminReferralManager({
  initialReferrals,
  initialPaymentLinks,
  initialCommissions,
  initialAuditLogs,
  partners,
  customers,
}: AdminReferralManagerProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  
  const [activeTab, setActiveTab] = useState<"referrals" | "payments" | "commissions" | "audit" | "merge">("referrals");
  
  const [referrals, setReferrals] = useState(initialReferrals);
  const [paymentLinks, setPaymentLinks] = useState(initialPaymentLinks);
  const [commissions, setCommissions] = useState(initialCommissions);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  
  // Modals & Action States
  const [transferringRef, setTransferringRef] = useState<ReferralRow | null>(null);
  const [targetPartnerId, setTargetPartnerId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  
  const [deletingRef, setDeletingRef] = useState<ReferralRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [cancellingCode, setCancellingCode] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Merge tool states
  const [sourceCustomerId, setSourceCustomerId] = useState("");
  const [targetCustomerId, setTargetCustomerId] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");

  const handleTransfer = async () => {
    if (!transferringRef || !targetPartnerId) return;
    try {
      setIsTransferring(true);
      const res = await fetch("/api/admin/referrals/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralId: transferringRef.id, targetPartnerId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess(data.message);
        setTransferringRef(null);
        setTargetPartnerId("");
        // Reload page to refresh data
        window.location.reload();
      } else {
        toastError(data.error || "Failed to transfer ownership.");
      }
    } catch (err) {
      toastError("Failed to connect to backend server.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteReferral = async () => {
    if (!deletingRef) return;
    try {
      setIsDeleting(true);
      // Wait, referrals deletion endpoint: we can create a quick delete query client-side or use a direct query.
      // Let's call the generic supabase wrapper or create a direct delete logic in an API.
      // Wait, let's build the delete action using next server action or quick endpoint.
      // Since deleting a link is straightforward, let's do a direct endpoint or write a delete helper in references.
      const res = await fetch(`/api/admin/referrals/delete?id=${deletingRef.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess("Referral code deleted successfully.");
        setReferrals(referrals.filter(r => r.id !== deletingRef.id));
        setDeletingRef(null);
      } else {
        toastError(data.error || "Failed to delete referral.");
      }
    } catch (err) {
      toastError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelLink = async () => {
    if (!cancellingCode) return;
    try {
      setIsCancelling(true);
      const res = await fetch("/api/payment-links/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cancellingCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess("Payment link cancelled.");
        setPaymentLinks(paymentLinks.map(l => l.code === cancellingCode ? { ...l, status: "cancelled" } : l));
        setCancellingCode(null);
      } else {
        toastError(data.error || "Failed to cancel payment link.");
      }
    } catch (err) {
      toastError("Network error. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMerge = async () => {
    if (!sourceCustomerId || !targetCustomerId) return;
    try {
      setIsMerging(true);
      const res = await fetch("/api/admin/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUserId: sourceCustomerId, targetUserId: targetCustomerId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess("Customer accounts merged successfully!");
        setSourceCustomerId("");
        setTargetCustomerId("");
        window.location.reload();
      } else {
        toastError(data.error || "Failed to merge customer profiles.");
      }
    } catch (err) {
      toastError("Failed to connect to backend server.");
    } finally {
      setIsMerging(false);
    }
  };

  // Filter lists based on search query
  const filteredReferrals = referrals.filter(r => 
    r.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.service_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.agency_partners?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = paymentLinks.filter(p => 
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.applications?.service_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCommissions = commissions.filter(c => 
    c.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.agency_partners?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar & Tab Selection */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab("referrals"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "referrals" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Referral Links
          </button>
          <button
            onClick={() => { setActiveTab("payments"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "payments" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Payment Links
          </button>
          <button
            onClick={() => { setActiveTab("commissions"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "commissions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Commissions
          </button>
          <button
            onClick={() => { setActiveTab("audit"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => { setActiveTab("merge"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "merge" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Merge Tool
          </button>
        </div>

        {activeTab !== "merge" && (
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
          />
        )}
      </div>

      {/* Referral Links Tab */}
      {activeTab === "referrals" && (
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Referral Code</th>
                  <th className="py-4 px-6">Associated Service</th>
                  <th className="py-4 px-6">Partner Owner</th>
                  <th className="py-4 px-6">Created On</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredReferrals.length > 0 ? (
                  filteredReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-bold text-slate-900">{ref.token}</td>
                      <td className="py-4 px-6 text-slate-500">{ref.service_slug}</td>
                      <td className="py-4 px-6">
                        <p className="text-slate-800 font-bold">{ref.agency_partners?.full_name || "Unassigned"}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{ref.agency_partners?.business_name}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-medium">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setTransferringRef(ref)}
                            title="Transfer Ownership"
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition flex items-center justify-center shadow-sm"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRef(ref)}
                            title="Disable Referral Link"
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition flex items-center justify-center shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No referral records found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Links Tab */}
      {activeTab === "payments" && (
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Payment Link Code</th>
                  <th className="py-4 px-6">Client / Service</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Expires On</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((link) => {
                    const isExpired = new Date(link.expires_at) < new Date() && link.status === "pending";
                    const displayStatus = isExpired ? "expired" : link.status;
                    return (
                      <tr key={link.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6 font-bold text-slate-900">{link.code}</td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-800">{link.profiles?.full_name || "Customer"}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{link.applications?.service_name}</p>
                        </td>
                        <td className="py-4 px-6 font-black text-slate-900">₹{link.amount.toLocaleString("en-IN")}</td>
                        <td className="py-4 px-6 text-slate-400 font-medium">
                          {new Date(link.expires_at).toLocaleString()}
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
                          {link.status === "pending" && (
                            <button
                              onClick={() => setCancellingCode(link.code)}
                              title="Cancel Link"
                              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition flex items-center justify-center shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      No payment link records found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commissions Tab */}
      {activeTab === "commissions" && (
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Partner</th>
                  <th className="py-4 px-6">Service / Application</th>
                  <th className="py-4 px-6">Commission Amount</th>
                  <th className="py-4 px-6">Logged At</th>
                  <th className="py-4 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredCommissions.length > 0 ? (
                  filteredCommissions.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {comm.agency_partners?.full_name || "Unknown Partner"}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {comm.service_name || comm.applications?.service_name}
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900">₹{comm.calculated_amount.toLocaleString("en-IN")}</td>
                      <td className="py-4 px-6 text-slate-400 font-medium">
                        {new Date(comm.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          ["earned", "approved", "paid"].includes(comm.status) ? "bg-green-50 text-green-700 border-green-150" :
                          ["pending", "reserved"].includes(comm.status) ? "bg-blue-50 text-blue-700 border-blue-150" :
                          "bg-slate-50 text-slate-500 border-slate-150"
                        }`}>
                          {comm.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No commission records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Commission Status Logs (Audit Trail)</h3>
          
          <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="relative">
                  <span className="absolute -left-9 top-1.5 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                    <ClipboardCheck className="h-3 w-3 text-slate-450" />
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Status Update</span>
                      <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                        {log.old_status?.toUpperCase() || "NULL"}
                      </span>
                      <span className="text-[10px] text-slate-400">➔</span>
                      <span className="text-[10px] bg-blue-50 border border-blue-150 px-2 py-0.5 rounded text-blue-600 font-bold">
                        {log.new_status.toUpperCase()}
                      </span>
                      
                      <span className="text-[10px] text-slate-400 font-medium ml-auto">
                        {new Date(log.changed_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-xs font-medium text-slate-600 mt-1">{log.notes || "No notes provided."}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Modified by: {log.profiles?.full_name || "System Automated Transaction"}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 font-semibold py-4">No audit log entries recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Merge Tool Tab */}
      {activeTab === "merge" && (
        <div className="max-w-2xl bg-white border border-slate-200/60 rounded-3xl p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Merge Duplicate Customers</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Select two duplicate profiles to consolidate. All applications, payment links, referral clicks, attributions, and wallet balances will be transferred to the target user, and the source user profile will be safely purged.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duplicate User Profile (Source - WILL BE PURGED)</label>
              <select
                value={sourceCustomerId}
                onChange={(e) => setSourceCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="">Select candidate profile...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email || c.mobile || "No Contact"})
                  </option>
                ))}
              </select>
            </div>

            {/* Target */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Canonical Profile (Target - WILL BE PRESERVED)</label>
              <select
                value={targetCustomerId}
                onChange={(e) => setTargetCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="">Select target profile...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email || c.mobile || "No Contact"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warning banner */}
          <div className="flex gap-3 bg-red-50/50 border border-red-100 rounded-2xl p-4 text-red-700 text-xs">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">CAUTION: Permanent Data Modification</p>
              <p className="mt-1 text-red-650 font-medium">This operation is irreversible. Ensure you have validated both profiles before initiating account merging.</p>
            </div>
          </div>

          <button
            disabled={isMerging || !sourceCustomerId || !targetCustomerId}
            onClick={handleMerge}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isMerging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Merging accounts...
              </>
            ) : (
              "Merge Accounts Instantly"
            )}
          </button>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {transferringRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-5 animate-in fade-in duration-200">
            <button
              onClick={() => { setTransferringRef(null); setTargetPartnerId(""); }}
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition border border-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Transfer Referral Ownership</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Assign referral code token &quot;{transferringRef.token}&quot; to another active partner.</p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target Agency Partner</label>
              <select
                value={targetPartnerId}
                onChange={(e) => setTargetPartnerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="">Select target partner...</option>
                {partners
                  .filter(p => p.id !== transferringRef.agency_partners?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.business_name || "No Business"})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                disabled={isTransferring}
                onClick={() => { setTransferringRef(null); setTargetPartnerId(""); }}
                className="flex-1 h-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                disabled={isTransferring || !targetPartnerId}
                onClick={handleTransfer}
                className="flex-1 h-11 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex gap-1.5 justify-center disabled:opacity-50"
              >
                {isTransferring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Transfer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Referral Link Modal */}
      {deletingRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-6 text-center animate-in fade-in duration-200">
            <div className="h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-900">Disable Referral Code</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Are you sure you want to permanently delete referral token &quot;{deletingRef.token}&quot;?</p>
            </div>

            <div className="flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingRef(null)}
                className="flex-1 h-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
              >
                No, Keep
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteReferral}
                className="flex-1 h-11 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex gap-1.5 justify-center"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Payment Link Modal */}
      {cancellingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-6 text-center animate-in fade-in duration-200">
            <div className="h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Payment Link</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Are you sure you want to cancel payment link for {cancellingCode}?</p>
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
                onClick={handleCancelLink}
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
    </div>
  );
}
