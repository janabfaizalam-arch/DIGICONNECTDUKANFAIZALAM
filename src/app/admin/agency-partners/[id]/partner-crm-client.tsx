"use client";
import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ClipboardList,
  Wallet,
  BadgePercent,
  FolderLock,
  LoaderCircle,
  FileCheck,
  FileX,
  PlusCircle,
  FileText,
  Activity,
  Settings,
} from "lucide-react";
import {
  updatePartnerStatusAction,
  adjustWalletBalanceAction,
  reviewKycDocumentAction,
} from "./actions";
import { AgentPasswordResetForm } from "@/components/portal/agent-password-reset-form";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { safeCurrency } from "@/lib/admin-format";
import {
  adminAgencyPartnerDetailPath,
  type AdminPartnerDetailTab,
} from "@/lib/admin/agency-partner-routes";
import type { Application } from "@/lib/portal-types";
import {
  AP_PARTNER_TYPE_LABELS,
  type AgencyPartner,
  type APCommission,
  type APKycDocument,
  type APPayout,
  type APWalletEntry,
  type APStatus,
  type APKycStatus,
  type APWalletEntryType,
  type APPartnerType,
} from "@/lib/ap-types";
import { cn } from "@/lib/utils";

export function PartnerCrmClient({
  ap,
  applications,
  commissions,
  balance,
  kycDocuments,
  walletLedger,
  payouts = [],
  loginStatus,
  lastSignIn,
  initialTab = "overview",
}: {
  ap: AgencyPartner;
  applications: Application[];
  commissions: APCommission[];
  balance: number;
  kycDocuments: APKycDocument[];
  walletLedger: APWalletEntry[];
  payouts?: APPayout[];
  loginStatus: string;
  lastSignIn: string;
  initialTab?: AdminPartnerDetailTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminPartnerDetailTab>(initialTab);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = (tab: AdminPartnerDetailTab) => {
    setActiveTab(tab);
    router.replace(adminAgencyPartnerDetailPath(ap.id, { tab }), { scroll: false });
  };

  // Status & Notes form states
  const [status, setStatus] = useState<APStatus>(ap.status);
  const [kycStatus, setKycStatus] = useState<APKycStatus>(ap.kyc_status);
  const [adminNotes, setAdminNotes] = useState(ap.admin_notes || "");

  // Wallet adjustment form states
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<APWalletEntryType>("manual_credit");
  const [adjustDesc, setAdjustDesc] = useState("");

  // Rejection input toggle
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const updateStatus = () => {
    startTransition(async () => {
      try {
        await updatePartnerStatusAction(ap.id, status, kycStatus, adminNotes);
        alert("Partner settings updated successfully!");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to update status.");
      }
    });
  };

  const handleWalletAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAmount || Number(adjustAmount) <= 0) return;

    startTransition(async () => {
      try {
        await adjustWalletBalanceAction(ap.id, Number(adjustAmount), adjustType, adjustDesc);
        alert("Wallet adjustment written to ledger!");
        setAdjustAmount("");
        setAdjustDesc("");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to adjust balance.");
      }
    });
  };

  const handleDocumentReview = (docId: string, action: "accepted" | "rejected") => {
    if (action === "rejected" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    startTransition(async () => {
      try {
        await reviewKycDocumentAction(docId, action, action === "rejected" ? rejectionReason : undefined);
        alert(`Document marked as ${action}!`);
        setRejectingDocId(null);
        setRejectionReason("");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to review document.");
      }
    });
  };

  // Dynamically compute partner health score
  const healthScore = useMemo(() => {
    if (applications.length === 0) return 100;
    const completed = applications.filter((a) => a.status === "completed").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const totalCount = applications.length;
    const successRate = Math.round((completed / totalCount) * 100);
    const rejectionRate = Math.round((rejected / totalCount) * 100);
    return Math.max(10, Math.min(100, 100 - rejectionRate * 1.5 + successRate * 0.2));
  }, [applications]);

  const activityFeed = useMemo(() => {
    const items: { id: string; label: string; at: string }[] = [];
    for (const row of walletLedger.slice(0, 20)) {
      items.push({
        id: `w-${row.id}`,
        label: `Wallet · ${row.description || row.entry_type} · ${safeCurrency(row.amount)}`,
        at: row.created_at,
      });
    }
    for (const p of payouts.slice(0, 10)) {
      items.push({
        id: `p-${p.id}`,
        label: `Payout · ${p.status} · ${safeCurrency(p.amount)}`,
        at: p.requested_at || p.created_at,
      });
    }
    for (const app of applications.slice(0, 10)) {
      items.push({
        id: `a-${app.id}`,
        label: `Application · ${app.service_name || "Service"} · ${app.status}`,
        at: app.created_at,
      });
    }
    return items.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 30);
  }, [walletLedger, payouts, applications]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
      <div className="space-y-6">
        {/* Horizontal Navigation Tabs */}
        <div role="tablist" aria-label="Partner detail sections" className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {[
            { key: "overview" as const, label: "Overview", icon: User },
            { key: "applications" as const, label: "Applications", icon: ClipboardList, badge: applications.length },
            { key: "wallet" as const, label: "Wallet", icon: Wallet, badge: walletLedger.length },
            { key: "commissions" as const, label: "Commissions", icon: BadgePercent, badge: commissions.length },
            { key: "documents" as const, label: "Documents", icon: FileText, badge: kycDocuments.length },
            { key: "kyc" as const, label: "KYC", icon: FolderLock, badge: kycDocuments.length },
            { key: "activity" as const, label: "Activity", icon: Activity },
            { key: "settings" as const, label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(tab.key)}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  active
                    ? "bg-blue-50 text-blue-700 shadow-xs border border-blue-100"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold",
                    active ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Body */}
        <Card className="p-5 md:p-6 glass-liquid-premium">
          {/* TAB: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Core Profile Details</h3>
                <p className="text-[10px] text-slate-500">Personal and business demographics</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile label="Partner ID / Code" value={ap.partner_code} mono />
                <InfoTile label="Partner Type" value={AP_PARTNER_TYPE_LABELS[ap.partner_type as APPartnerType] ?? ap.partner_type.replace("_", " ")} />
                <InfoTile label="Mobile" value={ap.mobile} mono />
                <InfoTile label="WhatsApp" value={ap.whatsapp || "—"} mono />
                <InfoTile label="Email" value={ap.email} />
                <InfoTile label="District / State" value={`${ap.district || "—"}, ${ap.state || "—"}`} />
                <InfoTile label="Pincode" value={ap.pin || "—"} mono />
                <InfoTile label="Full Address" value={ap.address || "—"} />
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-900 font-heading">Settlement Bank Details</h3>
                <p className="text-[10px] text-slate-500">Primary bank info for payout settlements</p>
                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <InfoTile label="Bank Name" value={ap.bank_name || "—"} />
                  <InfoTile label="Account Holder" value={ap.bank_account_name || "—"} />
                  <InfoTile label="Account Number" value={ap.bank_account_number || "—"} mono />
                  <InfoTile label="IFSC / UPI ID" value={[ap.bank_ifsc, ap.upi_id].filter(Boolean).join(" / ") || "—"} mono />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-900 font-heading">Nominee & Additional Info</h3>
                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <InfoTile label="Nominee Name" value={ap.nominee_name || "—"} />
                  <InfoTile label="Relation" value={ap.nominee_relation || "—"} />
                  <InfoTile label="Emergency Contact" value={ap.emergency_contact || "—"} mono />
                  <InfoTile label="Referral Source" value={ap.referral_source || "—"} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KYC Vault */}
          {activeTab === "kyc" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Partner KYC Documents</h3>
                <p className="text-[10px] text-slate-500">Verify documents and change KYC review states</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {kycDocuments.length > 0 ? (
                  kycDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{doc.document_type.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{doc.file_name}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                        <div className="mt-2.5">
                          <span className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold border capitalize",
                            doc.status === "accepted"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : doc.status === "rejected"
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                          )}>
                            {doc.status}
                          </span>
                        </div>
                        {doc.rejection_reason && (
                          <p className="text-[10px] font-medium text-rose-700 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/50 mt-2">
                            {doc.rejection_reason}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white"
                          >
                            Open File
                          </a>
                        )}
                        <button
                          onClick={() => handleDocumentReview(doc.id, "accepted")}
                          disabled={isPending}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingDocId(doc.id)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <FileX className="h-3.5 w-3.5 text-rose-600" />
                          Reject
                        </button>
                      </div>

                      {/* Rejection input popover */}
                      {rejectingDocId === doc.id && (
                        <div className="mt-3 bg-white border rounded-xl p-3 space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rejection Reason</label>
                          <Input
                            placeholder="Type reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="h-8 text-xs rounded-lg"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setRejectingDocId(null)}
                              className="text-[10px] font-bold text-slate-500 hover:underline px-2"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDocumentReview(doc.id, "rejected")}
                              className="rounded-lg bg-slate-900 text-white font-bold text-[10px] px-3 py-1"
                            >
                              Submit Rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2">
                    <AdminEmptyState title="No uploads" description="This partner has not uploaded KYC documents yet." />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Wallet Adjustment & Ledger */}
          {activeTab === "wallet" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-5">
                {/* Balance display */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between flex-1">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Ledger Balance</h4>
                    <p className="text-3xl font-bold tracking-tight text-slate-900 font-heading mt-2">{safeCurrency(balance)}</p>
                  </div>
                  <p className="text-[9px] font-medium text-slate-400 mt-4">Sums all credits and debit ledger rows.</p>
                </div>

                {/* Adjustment form */}
                <form onSubmit={handleWalletAdjustment} className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 flex-1 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <PlusCircle className="h-4 w-4 text-blue-500" /> Manual Wallet Adjustment
                  </h4>
                  <div className="grid gap-2 grid-cols-2">
                    <Input
                      type="number"
                      placeholder="Amount in Rs..."
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="h-9 text-xs rounded-lg bg-white border-slate-200"
                    />
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value as APWalletEntryType)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                    >
                      <option value="manual_credit">Credit (+)</option>
                      <option value="manual_debit">Debit (-)</option>
                      <option value="bonus">Bonus Credit (+)</option>
                      <option value="penalty">Penalty Debit (-)</option>
                    </select>
                  </div>
                  <Input
                    placeholder="Short description / reason..."
                    value={adjustDesc}
                    onChange={(e) => setAdjustDesc(e.target.value)}
                    className="h-9 text-xs rounded-lg bg-white border-slate-200"
                  />
                  <Button type="submit" disabled={isPending} className="h-9 w-full rounded-lg bg-slate-900 text-xs font-bold hover:bg-slate-800">
                    {isPending ? "Syncing..." : "Record Adjustment"}
                  </Button>
                </form>
              </div>

              {/* Ledger ledger log */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-900 font-heading mb-3">Wallet Ledger Entries</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  {walletLedger.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Running Balance</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {walletLedger.map((row) => {
                          const isCredit = [
                            "commission_credit",
                            "manual_credit",
                            "bonus",
                            "adjustment",
                          ].includes(row.entry_type);
                          return (
                            <TableRow key={row.id} className="hover:bg-slate-50/50">
                              <TableCell className="text-xs font-semibold capitalize">{row.entry_type.replace(/_/g, " ")}</TableCell>
                              <TableCell className="text-xs text-slate-600 max-w-xs truncate">{row.description || "—"}</TableCell>
                              <TableCell className={cn("text-xs font-bold text-right", isCredit ? "text-emerald-600" : "text-rose-600")}>
                                {isCredit ? "+" : "-"}{safeCurrency(Math.abs(row.amount))}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-slate-700 text-right">{safeCurrency(row.running_balance)}</TableCell>
                              <TableCell className="text-[10px] text-slate-400 font-mono">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <AdminEmptyState title="Empty Ledger" description="No ledger history compiled yet." />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Commissions */}
          {activeTab === "commissions" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Calculated Commissions</h3>
                <p className="text-[10px] text-slate-500">Track payouts generated by matching filing rules</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                {commissions.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Filing Amount</TableHead>
                        <TableHead className="text-right">Calculated Comm</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((comm) => (
                        <TableRow key={comm.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-xs font-bold text-slate-900 max-w-44 truncate">{comm.service_name || "Service"}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-600 text-right">{safeCurrency(comm.sale_amount)}</TableCell>
                          <TableCell className="text-xs font-bold text-emerald-600 text-right">{safeCurrency(comm.calculated_amount)}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold border capitalize",
                              comm.status === "paid"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-blue-50 border-blue-200 text-blue-700"
                            )}>
                              {comm.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-400 font-mono">{new Date(comm.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <AdminEmptyState title="No commission items" description="This partner has not completed commissionable filings yet." />
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Applications Submissions */}
          {activeTab === "applications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Partner Submissions</h3>
                <p className="text-[10px] text-slate-500">Recent applications prepared and filed by this partner</p>
              </div>

              <div className="grid gap-3">
                {applications.length > 0 ? (
                  applications.map((app) => (
                    <Link
                      key={app.id}
                      href={`/admin/applications/${app.id}`}
                      className="flex items-center justify-between rounded-xl bg-slate-50/50 p-4 border border-slate-100/60 hover:bg-blue-50/30 transition outline-none"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{app.service_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Customer: {app.customerName || app.customer_name || "—"} · Amount: {safeCurrency(app.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <AdminStatusBadge status={app.status} />
                        <p className="text-[9px] text-slate-400 font-mono">{new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <AdminEmptyState title="No submissions" description="Latest partner submissions will compile here." />
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Security & Credentials */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Account Credentials</h3>
                <p className="text-[10px] text-slate-500">Reset partner account login passwords directly on Supabase Auth.</p>
              </div>
              <div className="max-w-md pt-2">
                <AgentPasswordResetForm agentId={ap.user_id} />
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs font-semibold text-slate-600">
                <p>Login status: {loginStatus}</p>
                <p className="mt-1">Last sign-in: {lastSignIn}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">Auth user: {ap.user_id || "—"}</p>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Partner documents</h3>
                <p className="text-[10px] text-slate-500">KYC files linked to this partner only. Use the KYC tab to approve or reject.</p>
              </div>
              {kycDocuments.length === 0 ? (
                <AdminEmptyState title="No documents uploaded" description="Partner KYC files will appear here after upload." />
              ) : (
                <div className="space-y-2">
                  {kycDocuments.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-900">
                          {doc.document_type.replace(/_/g, " ")}
                        </p>
                        <p className="truncate font-mono text-[10px] text-slate-400">{doc.file_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge status={doc.status} />
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center rounded-full border bg-white px-3 text-[11px] font-bold text-indigo-700"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Activity timeline</h3>
                <p className="text-[10px] text-slate-500">Recent wallet, payout and application events for this partner.</p>
              </div>
              {activityFeed.length === 0 ? (
                <AdminEmptyState title="No activity yet" description="Ledger, payout and application events will appear here." />
              ) : (
                <ul className="space-y-2">
                  {activityFeed.map((item) => (
                    <li key={item.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs font-semibold text-slate-700">
                      <p>{item.label}</p>
                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {item.at ? new Date(item.at).toLocaleString("en-IN") : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Right Column: Update Configuration form */}
      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="p-5 border border-slate-200 bg-white shadow-xs glass-liquid-premium space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-heading">Partner Health & Status</h3>

          {/* Health indicator dial */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">AP Health Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-heading">{healthScore}%</p>
            </div>
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 font-bold text-xs font-mono">
              H
            </div>
          </div>

          {/* System status updating */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ecosystem Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as APStatus)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none transition"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="kyc_pending">KYC Pending</option>
                <option value="verified">Verified</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">KYC Review Status</label>
              <select
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value as APKycStatus)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none transition"
              >
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resubmit_required">Resubmit Required</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Admin notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal audit notes..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none transition min-h-[5rem] resize-none"
              />
            </div>

            <Button
              onClick={updateStatus}
              disabled={isPending}
              className="h-10 w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs shadow-xs"
            >
              {isPending ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : "Save configurations"}
            </Button>
          </div>
        </Card>

        {/* Sync timestamps card */}
        <Card className="p-4 border border-slate-200 bg-slate-50/50 shadow-xs glass-liquid-premium space-y-2.5 text-[10px] text-slate-500">
          <p className="font-bold text-slate-400 uppercase tracking-wider">Sync Diagnostics</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="font-semibold text-slate-400">Login confirmations</p>
              <p className="font-bold text-slate-700 mt-0.5">{loginStatus}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-400">Last sign in</p>
              <p className="font-bold text-slate-700 mt-0.5">{lastSignIn}</p>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function InfoTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-1 break-words font-bold text-slate-950 text-xs", mono && "font-mono text-[11px]")}>{value}</p>
    </div>
  );
}
