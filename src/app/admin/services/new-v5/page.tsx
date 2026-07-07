"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Save, Sparkles } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

export default function AdminNewServiceV5() {
  const router = useRouter();
  const { success, error } = useToast();

  // Basic Information
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tax");
  const [subCategory, setSubCategory] = useState("");

  // Flags & Targets
  const [popular, setPopular] = useState(false);
  const [trending, setTrending] = useState(false);
  const [recommended, setRecommended] = useState(false);

  const [targets, setTargets] = useState({
    student: false,
    senior_citizen: false,
    women: false,
    farmer: false,
    business_owner: false,
    nri: false,
  });

  // Base Pricing
  const [originalPrice, setOriginalPrice] = useState("1999");
  const [sellingPrice, setSellingPrice] = useState("999");
  const [agentCost, setAgentCost] = useState("400");
  const [partnerPayout, setPartnerPayout] = useState("350");
  const [walletCashback, setWalletCashback] = useState("100");

  // Details
  const [overview, setOverview] = useState("");

  // Dynamic Lists
  const [benefits] = useState<string[]>([""]);
  const [documents, setDocuments] = useState<string[]>([""]);

  // Service Variants
  interface LocalVariant {
    slug: string;
    name: string;
    price: number;
    tat: string;
  }
  const [variants, setVariants] = useState<LocalVariant[]>([
    { slug: "regular", name: "Regular Processing", price: 999, tat: "3 Days" },
  ]);

  // Comparisons
  interface LocalCompRow {
    feature: string;
    v1: string;
    v2: string;
  }
  const [compHeaders, setCompHeaders] = useState<string[]>(["Feature", "Variant A", "Variant B"]);
  const [compRows, setCompRows] = useState<LocalCompRow[]>([
    { feature: "Time", v1: "15 Days", v2: "3 Days" },
  ]);

  const handleAddDocument = () => setDocuments([...documents, ""]);
  const handleRemoveDocument = (idx: number) => setDocuments(documents.filter((_, i) => i !== idx));

  const handleAddVariant = () => {
    setVariants([...variants, { slug: "", name: "", price: 0, tat: "3 Days" }]);
  };
  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleAddCompRow = () => {
    setCompRows([...compRows, { feature: "", v1: "", v2: "" }]);
  };
  const handleRemoveCompRow = (idx: number) => {
    setCompRows(compRows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name || !slug) {
      error("Service Name and Slug are required.");
      return;
    }

    try {
      // POST to standard service API
      const serviceRes = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          title: name,
          slug: slug,
          shortDescription: description,
          categorySlug: category,
          overview: overview,
          isActive: "true",
          isPaid: "true",
          basePrice: originalPrice,
          salePrice: sellingPrice,
          benefits: JSON.stringify(benefits.filter(Boolean)),
          documents: JSON.stringify(documents.filter(Boolean)),
          process: JSON.stringify(["Verification", "Processing", "Approval", "Certificate Download"]),
          seoTitle: `${name} | DigiConnect Dukan`,
          seoDescription: description,
        }),
      });

      if (!serviceRes.ok) {
        const errData = await serviceRes.json();
        throw new Error(errData.message || "Failed to save base service.");
      }

      const serviceData = await serviceRes.json();
      const serviceId = serviceData.serviceId;

      // Update Service details/metadata with direct V5 updates
      // (This can be completed by updating metadata payload or V5 specific APIs)
      
      const timeline = "3 Days";
      // Save Variants
      const varRes = await fetch("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          variants: variants.map((v) => ({
            slug: v.slug || "regular",
            name: v.name || "Regular",
            description: `${v.name} option details`,
            original_price: originalPrice,
            selling_price: v.price || sellingPrice,
            offer_price: v.price || sellingPrice,
            agent_cost: agentCost,
            partner_payout: partnerPayout,
            wallet_cashback: walletCashback,
            timeline: v.tat || timeline,
            required_documents: documents.filter(Boolean).map((d, i) => ({ id: `doc-${i}`, name: d, type: "PDF", required: true })),
            form_fields: [],
            is_active: true,
          })),
        }),
      });

      if (!varRes.ok) {
        throw new Error("Failed to save variants.");
      }

      // Save Comparisons
      const compRes = await fetch("/api/admin/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          comparisons: [
            {
              title: `${name} Feature Comparison`,
              description: `Comparing pricing, timelines and guidelines.`,
              headers: compHeaders,
              rows: compRows,
              is_active: true,
            },
          ],
        }),
      });

      if (!compRes.ok) {
        throw new Error("Failed to save comparisons.");
      }

      success("V5 Enterprise Service published successfully!");
      router.push("/admin/services");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unexpected error publishing service.";
      error(errMsg);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5.5 w-5.5 text-indigo-600 animate-pulse" />
              Build V5 Enterprise Service
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Create dynamic, database-driven government, banking, or document services.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 active:scale-[0.98] transition"
        >
          <Save className="h-4 w-4" />
          Publish Service
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.8fr_1.2fr]">
        <div className="space-y-6">
          {/* Section 1: Basic Info */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
              1. Basic Information
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Service Name</label>
                <input
                  type="text"
                  placeholder="e.g. Passport Assistance"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Slug</label>
                <input
                  type="text"
                  placeholder="e.g. passport-assistance"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Short Description</label>
              <textarea
                placeholder="Brief summary shown in catalog lists..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500 h-20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Detailed Overview</label>
              <textarea
                placeholder="Full service overview details..."
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500 h-24"
              />
            </div>
          </div>

          {/* Section 2: Pricing Matrix */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
              2. Pricing & Costing Engine
            </h3>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Original Price (₹)</label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Selling Price (₹)</label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Agent Cost (₹)</label>
                <input
                  type="number"
                  value={agentCost}
                  onChange={(e) => setAgentCost(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Partner Payout (₹)</label>
                <input
                  type="number"
                  value={partnerPayout}
                  onChange={(e) => setPartnerPayout(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Wallet Cashback (₹)</label>
                <input
                  type="number"
                  value={walletCashback}
                  onChange={(e) => setWalletCashback(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Variants builder */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                3. Service Variants (Unlimited)
              </h3>
              <button
                onClick={handleAddVariant}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Variant
              </button>
            </div>

            {variants.map((v, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 relative">
                <input
                  type="text"
                  placeholder="Variant Name (e.g. Tatkaal)"
                  value={v.name}
                  onChange={(e) => {
                    const next = [...variants];
                    next[idx].name = e.target.value;
                    next[idx].slug = e.target.value.toLowerCase().replace(/[^a-z]+/g, "-");
                    setVariants(next);
                  }}
                  className="flex-1 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                />
                <input
                  type="number"
                  placeholder="Variant Price (₹)"
                  value={v.price}
                  onChange={(e) => {
                    const next = [...variants];
                    next[idx].price = Number(e.target.value);
                    setVariants(next);
                  }}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                />
                <input
                  type="text"
                  placeholder="Timeline (e.g. 3 Days)"
                  value={v.tat}
                  onChange={(e) => {
                    const next = [...variants];
                    next[idx].tat = e.target.value;
                    setVariants(next);
                  }}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                />
                {variants.length > 1 && (
                  <button onClick={() => handleRemoveVariant(idx)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Section 4: Comparisons Matrix */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                4. Side-by-Side Comparison Matrix
              </h3>
              <button
                onClick={handleAddCompRow}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Feature Row
              </button>
            </div>

            <div className="flex gap-2">
              {compHeaders.map((h, i) => (
                <input
                  key={i}
                  type="text"
                  value={h}
                  onChange={(e) => {
                    const next = [...compHeaders];
                    next[i] = e.target.value;
                    setCompHeaders(next);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-800 text-center"
                />
              ))}
            </div>

            {compRows.map((row, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Feature Name"
                  value={row.feature}
                  onChange={(e) => {
                    const next = [...compRows];
                    next[idx].feature = e.target.value;
                    setCompRows(next);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                />
                <input
                  type="text"
                  placeholder="Val A"
                  value={row.v1}
                  onChange={(e) => {
                    const next = [...compRows];
                    next[idx].v1 = e.target.value;
                    setCompRows(next);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-center"
                />
                <input
                  type="text"
                  placeholder="Val B"
                  value={row.v2}
                  onChange={(e) => {
                    const next = [...compRows];
                    next[idx].v2 = e.target.value;
                    setCompRows(next);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-center"
                />
                <button onClick={() => handleRemoveCompRow(idx)} className="text-slate-450 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Right sidebar: Classification */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
              Categorization
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Main Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden"
              >
                <option value="tax">Tax & GST</option>
                <option value="gov-id">Government ID</option>
                <option value="licence">Licences</option>
                <option value="banking">Banking & Credit</option>
                <option value="company">Business Registration</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Sub Category</label>
              <input
                type="text"
                placeholder="e.g. GST Services"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={popular}
                  onChange={(e) => setPopular(e.target.checked)}
                  className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-extrabold text-slate-700">Popular Service</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trending}
                  onChange={(e) => setTrending(e.target.checked)}
                  className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-extrabold text-slate-700">Trending</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recommended}
                  onChange={(e) => setRecommended(e.target.checked)}
                  className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-extrabold text-slate-700">Recommended for You</span>
              </label>
            </div>
          </div>

          {/* Right sidebar: Target Audience */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
              Target Audience
            </h3>

            <div className="grid gap-3 grid-cols-2">
              {(Object.keys(targets) as Array<keyof typeof targets>).map((key) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targets[key]}
                    onChange={(e) => setTargets({ ...targets, [key]: e.target.checked })}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-extrabold text-slate-700 capitalize">
                    {key.replace("_", " ")}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Checklist & Documents */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Required Documents
              </h3>
              <button
                onClick={handleAddDocument}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            {documents.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Aadhaar Card Front"
                  value={d}
                  onChange={(e) => {
                    const next = [...documents];
                    next[idx] = e.target.value;
                    setDocuments(next);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                />
                {documents.length > 1 && (
                  <button onClick={() => handleRemoveDocument(idx)} className="text-slate-450 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
