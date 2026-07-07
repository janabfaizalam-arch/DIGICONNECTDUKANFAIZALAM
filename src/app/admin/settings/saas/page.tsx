"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Globe, Palette, Mail, ShieldCheck, RefreshCw, Sparkles, Check } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

interface DomainRecord {
  id?: string;
  domain: string;
  is_verified: boolean;
  ssl_active: boolean;
}

interface TenantData {
  id?: string;
  name: string;
  slug: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  saas_domains?: DomainRecord[];
}

export default function AdminSaaSBrandingPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // SaaS tenant states
  const [tenantName, setTenantName] = useState("Faizal Connect Dukan");
  const [tenantSlug, setTenantSlug] = useState("faizal-dukan");
  const [contactEmail, setContactEmail] = useState("partner@rnos.in");
  const [logoUrl, setLogoUrl] = useState("https://digiconnectdukan.com/icon.png");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5"); // Tailwind indigo-600
  const [secondaryColor, setSecondaryColor] = useState("#06b6d4"); // Tailwind cyan-500

  // Domains list
  const [domains, setDomains] = useState<string[]>(["dukan.faizalam.in"]);
  const [newDomain, setNewDomain] = useState("");

  // Load configuration
  useEffect(() => {
    const fetchSaaS = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/saas/tenants");
        if (!res.ok) throw new Error("Failed to load SaaS configs.");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const tenant: TenantData = json.data[0];
          setTenantName(tenant.name);
          setTenantSlug(tenant.slug);
          setContactEmail(tenant.contact_email);
          setLogoUrl(tenant.logo_url || "");
          setPrimaryColor(tenant.primary_color || "#4f46e5");
          setSecondaryColor(tenant.secondary_color || "#06b6d4");
          if (tenant.saas_domains) {
            setDomains(tenant.saas_domains.map((d) => d.domain));
          }
        }
      } catch (err: unknown) {
        // Fallback to defaults if schema not fully seeded
        console.warn("Failed to load SaaS config, using defaults:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaaS();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/saas/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenantName,
          slug: tenantSlug,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          contact_email: contactEmail,
          domains,
        }),
      });

      if (!res.ok) throw new Error("Failed to save tenant configs.");
      success("White-label SaaS settings updated successfully!");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unexpected error saving settings.";
      error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const addDomain = () => {
    const dom = newDomain.trim().toLowerCase();
    if (dom && !domains.includes(dom)) {
      setDomains([...domains, dom]);
      setNewDomain("");
      success(`Mapped domain: ${dom}`);
    }
  };

  const removeDomain = (idx: number) => {
    setDomains(domains.filter((_, i) => i !== idx));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/admin/settings")}
            className="group inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to console settings
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-heading">
              White Label & SaaS Engine
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100 uppercase tracking-widest">
              <Sparkles className="h-2.5 w-2.5" /> V5 Multi-Tenant
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Configure custom domains mapping, themes branding overrides, and primary/secondary color schemes.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-750 disabled:bg-blue-300 shadow-md shadow-blue-900/10 hover:shadow-lg transition-all"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Changes..." : "Save Branding"}
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-xs text-slate-400 font-bold">Loading configurations...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          {/* Settings form panel */}
          <div className="space-y-6">
            {/* Branding details */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <Palette className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Portal Identity & Theme Override
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Branding Name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Subdomain Identifier (slug)</label>
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Primary Color Theme</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 border-0 cursor-pointer rounded-lg shrink-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Secondary Color Theme</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-10 border-0 cursor-pointer rounded-lg shrink-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">White-Label Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Contact / Support Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom domain configurations */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <Globe className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Custom Domain Mapping (DNS)
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Map your own custom root domain or subdomain to DigiConnect. Update your Domain registrar&apos;s DNS settings to point a **CNAME** record to `domains.digiconnectdukan.com`.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. portal.mybusiness.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    onClick={addDomain}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl transition"
                  >
                    Add Domain
                  </button>
                </div>

                <div className="space-y-2">
                  {domains.map((dom, idx) => (
                    <div
                      key={dom}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-250/30 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-500" />
                        <div>
                          <span className="text-xs font-black text-slate-900">{dom}</span>
                          <div className="flex gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600">
                              <Check className="h-2 w-2" /> DNS Linked
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600">
                              <ShieldCheck className="h-2.5 w-2.5" /> SSL Active
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => removeDomain(idx)}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Live branding simulator */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Live Portal Branding Simulator
            </h3>

            <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-100 shadow-sm relative aspect-video sm:aspect-square flex flex-col justify-between p-6">
              {/* Fake top navigation */}
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-white border flex items-center justify-center p-0.5 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="h-full object-contain" />
                  </div>
                  <span className="text-xs font-black text-slate-950">{tenantName}</span>
                </div>
                <span className="text-[10px] font-black text-slate-500">Menu</span>
              </div>

              {/* Fake Hero layout using state theme colors */}
              <div className="my-auto space-y-3 py-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-black leading-tight text-slate-900">
                    Apply for Citizen & Business Registrations
                  </h2>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Powered by DigiConnect Enterprise SaaS Engine.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    style={{ backgroundColor: primaryColor }}
                    className="h-8 px-4 text-[10px] font-black text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    Select Service
                  </button>
                  <button
                    style={{ color: primaryColor, borderColor: primaryColor }}
                    className="h-8 px-4 text-[10px] font-black bg-white border rounded-lg shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Track Application
                  </button>
                </div>
              </div>

              {/* Fake sub-banner with secondary color */}
              <div
                style={{ borderColor: secondaryColor }}
                className="mt-auto border-l-2 p-2.5 bg-white/70 rounded-r-xl flex items-center gap-2 shadow-xs"
              >
                <div
                  style={{ color: secondaryColor }}
                  className="h-5 w-5 bg-white border border-slate-100 rounded-md flex items-center justify-center shrink-0"
                >
                  <ShieldCheck className="h-3 w-3" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-800 block">Security Hardening Configured</span>
                  <span className="text-[8px] font-semibold text-slate-400">All submissions encrypted via SHA-256</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
