"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Tag, Ticket, ToggleLeft, ToggleRight, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import type { Coupon } from "@/lib/coupons";

export default function AdminCouponsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [applicableService, setApplicableService] = useState("All");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perUserUsageLimit, setPerUserUsageLimit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [active, setActive] = useState(true);

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/coupons");
      const result = await response.json();
      if (response.ok && result.success) {
        setCoupons(result.coupons || []);
      } else {
        toastError(result.message || "Failed to load coupons.");
      }
    } catch {
      toastError("Failed to fetch coupons from server.");
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Handle status toggle
  const handleToggleActive = async (couponCode: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, active: !currentStatus }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toastSuccess(result.message);
        fetchCoupons();
      } else {
        toastError(result.message || "Failed to update coupon status.");
      }
    } catch {
      toastError("Failed to toggle coupon status.");
    }
  };

  // Handle creation submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toastError("Coupon code is required.");
      return;
    }
    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      toastError("Please enter a valid discount value greater than 0.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: val,
          applicableService,
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
          maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          perUserUsageLimit: perUserUsageLimit ? Number(perUserUsageLimit) : undefined,
          startDate: startDate || undefined,
          expiryDate: expiryDate || undefined,
          active,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toastSuccess(result.message);
        setShowModal(false);
        // Reset form
        setCode("");
        setDiscountType("fixed");
        setDiscountValue("");
        setApplicableService("All");
        setMinOrderAmount("");
        setMaxDiscount("");
        setUsageLimit("");
        setPerUserUsageLimit("");
        setStartDate("");
        setExpiryDate("");
        setActive(true);
        fetchCoupons();
      } else {
        toastError(result.message || "Failed to create coupon.");
      }
    } catch {
      toastError("Failed to submit coupon.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.applicableService.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Finance & Systems</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">Coupon Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Create and manage promotional discount coupons for services, with usage limits, expiry, and service scope controls.
          </p>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-md shadow-blue-600/10 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Stats row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">Total Coupon Codes</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Tag className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-950">{coupons.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">Active Coupons</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-950">{coupons.filter((c) => c.active).length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">Inactive Coupons</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
              <AlertCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-950">{coupons.filter((c) => !c.active).length}</p>
        </div>
      </section>

      {/* Filter and search */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by code or service..."
            className="pl-10 h-11 text-sm rounded-xl border border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Table view */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="mt-2 text-sm text-slate-500 font-bold">Loading coupons database...</p>
            </div>
          ) : filteredCoupons.length ? (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-100 pb-3">
                  <th className="py-3">Coupon Code</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Value</th>
                  <th className="py-3">Service Scope</th>
                  <th className="py-3">Usage</th>
                  <th className="py-3">Min Order</th>
                  <th className="py-3">Expiry Date</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.code} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 font-mono text-sm font-extrabold text-blue-700">{coupon.code}</td>
                    <td className="py-3.5 font-bold text-slate-700 capitalize">{coupon.discountType}</td>
                    <td className="py-3.5 font-black text-slate-900">
                      {coupon.discountType === "fixed" ? `₹${coupon.discountValue.toLocaleString("en-IN")}` : `${coupon.discountValue}%`}
                    </td>
                    <td className="py-3.5 font-bold text-slate-500 max-w-[200px] truncate" title={coupon.applicableService}>
                      {coupon.applicableService === "All" ? "All Services" : coupon.applicableService}
                    </td>
                    <td className="py-3.5 font-semibold text-slate-600">
                      {coupon.usedCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : "uses"}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {coupon.minOrderAmount ? `₹${coupon.minOrderAmount.toLocaleString("en-IN")}` : "None"}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          coupon.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {coupon.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleToggleActive(coupon.code, coupon.active)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                          coupon.active
                            ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {coupon.active ? (
                          <>
                            <ToggleLeft className="h-4 w-4" /> Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4" /> Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-bold">No coupons found matching your filters.</div>
          )}
        </div>
      </section>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Ticket className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">Create Promo Coupon</h3>
                <p className="text-xs font-bold text-slate-400">Configure discount code properties below.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Coupon Code *</label>
                  <Input
                    required
                    placeholder="e.g. DGCNT5K"
                    className="h-10 text-sm rounded-xl font-mono uppercase"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Discount Type *</label>
                  <select
                    className="h-10 text-sm rounded-xl border border-slate-200 bg-white px-3"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "fixed" | "percentage")}
                  >
                    <option value="fixed">Fixed Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Discount Value *</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    placeholder="e.g. 5000"
                    className="h-10 text-sm rounded-xl"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Applicable Service Scope *</label>
                  <select
                    className="h-10 text-sm rounded-xl border border-slate-200 bg-white px-3 max-w-full"
                    value={applicableService}
                    onChange={(e) => setApplicableService(e.target.value)}
                  >
                    <option value="All">All Services</option>
                    <option value="cm-yuva-entrepreneur-loan-assistance">CM YUVA Only</option>
                    <option value="pvc-card">PVC Card Only</option>
                    <option value="pm-vishwakarma-yojana">PM Vishwakarma Only</option>
                    <option value="eshram-card">eShram Only</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Min Order Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Optional min order"
                    className="h-10 text-sm rounded-xl"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Max Discount Limit (₹)</label>
                  <Input
                    type="number"
                    placeholder="Optional max cap"
                    className="h-10 text-sm rounded-xl"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Usage Limit (Total)</label>
                  <Input
                    type="number"
                    placeholder="Optional max uses"
                    className="h-10 text-sm rounded-xl"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Active Status</label>
                  <label className="flex h-10 items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    Mark Active Immediately
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Start Date</label>
                  <Input
                    type="date"
                    className="h-10 text-sm rounded-xl"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Expiry Date</label>
                  <Input
                    type="date"
                    className="h-10 text-sm rounded-xl"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 rounded-xl px-4 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
                >
                  Cancel
                </button>
                <FormSubmitButton
                  type="submit"
                  loading={isCreating}
                  loadingText="Creating..."
                  className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/10"
                >
                  Save Coupon
                </FormSubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
