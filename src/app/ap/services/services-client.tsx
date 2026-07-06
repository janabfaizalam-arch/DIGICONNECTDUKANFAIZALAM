"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star, ArrowRight, FileText, Sparkles, Layers, History, Copy, MessageSquare, QrCode, X, Download, Loader2, AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/portal-data";
import type { AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";

interface PartnerServicesClientProps {
  initialServices: AgentService[];
  partnerName?: string;
  businessName?: string;
}

export function PartnerServicesClient({ initialServices, partnerName, businessName }: PartnerServicesClientProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [showScore, setShowScore] = useState(false);

  // Sharing states
  const [sharingService, setSharingService] = useState<{ slug: string; title: string; price: number } | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [refLink, setRefLink] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [posterSize, setPosterSize] = useState<"a4" | "square">("a4");

  const getReferralLink = async (slug: string) => {
    try {
      setTokenLoading(true);
      const res = await fetch("/api/referrals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug: slug }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        const link = `${window.location.origin}/s/${slug}?ref=${data.token}`;
        setRefLink(link);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`);
        return link;
      } else {
        toastError(data.error || "Failed to generate referral link.");
        return "";
      }
    } catch {
      toastError("Failed to fetch referral token.");
      return "";
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopyReferral = async (slug: string) => {
    const link = await getReferralLink(slug);
    if (link) {
      navigator.clipboard.writeText(link);
      toastSuccess("Referral link copied to clipboard!");
    }
  };

  const handleWhatsAppShare = async (slug: string, title: string) => {
    const link = await getReferralLink(slug);
    if (link) {
      const text = `Apply for ${title} easily through my digital store link:\n\n${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const handleOpenQRModal = async (slug: string, title: string, price: number) => {
    setSharingService({ slug, title, price });
    await getReferralLink(slug);
  };

  const handlePrintPoster = () => {
    if (!sharingService || !refLink) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const partnerLabel = businessName || partnerName || "Verified Partner Store";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Poster - ${sharingService.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              color: #1e293b;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              box-sizing: border-box;
            }
            .poster-container {
              border: 6px solid #2563eb;
              border-radius: 32px;
              padding: 40px;
              text-align: center;
              box-sizing: border-box;
              background: radial-gradient(circle at top left, #f8fafc, #ffffff);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
            }
            .a4 {
              width: 210mm;
              height: 297mm;
              max-width: 700px;
              max-height: 990px;
              padding: 60px 40px;
            }
            .square {
              width: 600px;
              height: 600px;
              padding: 40px;
            }
            .brand-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
            }
            .brand-logo {
              font-size: 28px;
              font-weight: 900;
              color: #2563eb;
              letter-spacing: -0.5px;
            }
            .partner-tag {
              font-size: 14px;
              font-weight: 700;
              color: #64748b;
              background: #f1f5f9;
              padding: 6px 16px;
              border-radius: 12px;
              text-transform: uppercase;
            }
            .service-title {
              font-size: ${posterSize === "a4" ? "42px" : "32px"};
              font-weight: 900;
              color: #0f172a;
              margin: 20px 0 10px 0;
              line-height: 1.15;
            }
            .price-box {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 20px;
              padding: 16px 28px;
              margin: 15px 0;
              display: inline-block;
            }
            .price-value {
              font-size: 36px;
              font-weight: 900;
              color: #1d4ed8;
            }
            .price-gst {
              font-size: 11px;
              font-weight: 700;
              color: #60a5fa;
              text-transform: uppercase;
              margin-top: 2px;
            }
            .qr-box {
              border: 3px dashed #cbd5e1;
              border-radius: 24px;
              padding: 20px;
              background: #ffffff;
              margin: 20px 0;
              display: inline-block;
            }
            .qr-img {
              width: ${posterSize === "a4" ? "240px" : "180px"};
              height: ${posterSize === "a4" ? "240px" : "180px"};
            }
            .cta-text {
              font-size: 16px;
              font-weight: 800;
              color: #334155;
              margin-bottom: 5px;
            }
            .instruction-text {
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              max-width: 80%;
              margin: 0 auto;
            }
            .footer-note {
              font-size: 11px;
              font-weight: 600;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              width: 100%;
              padding-top: 15px;
              margin-top: 20px;
            }
            @media print {
              body {
                padding: 0;
              }
              .poster-container {
                border-color: #2563eb;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="poster-container ${posterSize}">
            <div class="brand-header">
              <div class="brand-logo">DigiConnect Dukan</div>
              <div class="partner-tag">${partnerLabel}</div>
            </div>
            
            <div>
              <div class="service-title">${sharingService.title}</div>
              <div class="price-box">
                <div class="price-value">₹${sharingService.price.toLocaleString("en-IN")}</div>
                <div class="price-gst">GST Inclusive Pricing</div>
              </div>
            </div>

            <div>
              <div class="qr-box">
                <img class="qr-img" src="${qrUrl}" alt="QR Code" />
              </div>
              <div class="cta-text">Scan QR Code to Apply</div>
              <div class="instruction-text">Open your phone camera or scanner, scan the code, and complete your registration instantly.</div>
            </div>

            <div class="footer-note">
              Powered by DigiConnect Service Ecosystem • Secure & Verified Transactions
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Load favorites, recents, and score toggle from localStorage
  useEffect(() => {
    try {
      const storedFavs = JSON.parse(localStorage.getItem("digipartner_favorites") || "[]");
      setFavorites(storedFavs);
      
      const storedRecents = JSON.parse(localStorage.getItem("digipartner_recently_used") || "[]");
      setRecentSlugs(storedRecents);

      const storedShowScore = localStorage.getItem("digipartner_show_score");
      if (storedShowScore !== null) {
        setShowScore(storedShowScore === "true");
      }
    } catch (err) {
      console.warn("Could not load stored services state", err);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = (slug: string) => {
    const updated = favorites.includes(slug)
      ? favorites.filter((f) => f !== slug)
      : [...favorites, slug];
    setFavorites(updated);
    localStorage.setItem("digipartner_favorites", JSON.stringify(updated));
  };

  // Add to recently used list
  const trackRecentUse = (slug: string) => {
    const updated = [slug, ...recentSlugs.filter((s) => s !== slug)].slice(0, 5);
    setRecentSlugs(updated);
    localStorage.setItem("digipartner_recently_used", JSON.stringify(updated));
  };

  const handleToggleScore = () => {
    const next = !showScore;
    setShowScore(next);
    localStorage.setItem("digipartner_show_score", String(next));
  };

  // Categorized & filtered services
  const processedServices = useMemo(() => {
    return initialServices.map((srv) => ({
      ...srv,
      calculatedCategory: srv.category || "Other",
    }));
  }, [initialServices]);

  // Categories list
  const categories = useMemo(() => {
    const list = new Set(processedServices.map((srv) => srv.calculatedCategory));
    return ["All", ...Array.from(list), "Favorites"];
  }, [processedServices]);

  // Filtered lists
  const filteredServices = useMemo(() => {
    return processedServices.filter((srv) => {
      // Category check
      if (selectedCategory === "Favorites") {
        if (!favorites.includes(srv.slug)) return false;
      } else if (selectedCategory !== "All") {
        if (srv.calculatedCategory !== selectedCategory) return false;
      }

      // Search check
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = srv.title.toLowerCase().includes(query);
        const matchesDesc = (srv.description || "").toLowerCase().includes(query);
        const matchesSlug = srv.slug.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesSlug;
      }

      return true;
    });
  }, [processedServices, selectedCategory, search, favorites]);

  // Recently used services lookup
  const recentlyUsedServices = useMemo(() => {
    return recentSlugs
      .map((slug) => processedServices.find((s) => s.slug === slug))
      .filter((s): s is typeof processedServices[number] => Boolean(s));
  }, [recentSlugs, processedServices]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-600">
            <Sparkles className="h-3.5 w-3.5" />
            Service Engine
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Service Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Browse active products, calculate custom commission overlays, and initiate quick client submissions.
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            onClick={handleToggleScore}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold transition shadow-sm",
              showScore
                ? "bg-emerald-600 border-transparent text-white hover:bg-emerald-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            {showScore ? "Hide Score" : "Show Score"}
          </button>
        </div>
      </div>

      {/* Recently Used Services */}
      {recentlyUsedServices.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-slate-400" /> Recently Used Services
          </p>
          <div className="flex flex-wrap gap-2">
            {recentlyUsedServices.map((srv) => (
              <Link
                key={srv.id}
                href={`/ap/applications/new?serviceId=${srv.id}`}
                onClick={() => trackRecentUse(srv.slug)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/60 bg-white/70 text-xs text-slate-600 hover:border-blue-550 hover:text-blue-600 hover:bg-white transition-all font-semibold shadow-sm"
              >
                <span>{srv.title}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid gap-4 md:grid-cols-4 items-center">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active services by title, instructions or documents..."
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-sm"
          />
        </div>

        <div className="text-right text-xs text-slate-400 font-bold px-1">
          Showing {filteredServices.length} of {processedServices.length} services
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`h-9 px-4 shrink-0 rounded-xl text-xs font-bold transition-all duration-200 border ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/15"
                : "bg-white/70 text-slate-500 border-slate-200/60 hover:text-slate-800 hover:bg-white hover:border-slate-350 shadow-sm"
            }`}
          >
            {cat === "Favorites" ? (
              <span className="flex items-center gap-1">
                <Star className={`h-3.5 w-3.5 ${selectedCategory === "Favorites" ? "fill-white text-white" : "text-amber-500 fill-amber-500"}`} />
                Favorites ({favorites.length})
              </span>
            ) : (
              cat
            )}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredServices.length ? (
          filteredServices.map((srv) => {
            const isFav = favorites.includes(srv.slug);
            const payoutAmount = srv.payout_type === "percentage"
              ? Math.round((srv.customer_fee * srv.payout_percentage) / 100)
              : srv.agent_payout;

            return (
              <Card
                key={srv.id}
                className="relative overflow-hidden border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all duration-150 group"
              >
                <div className="space-y-4">
                  {/* Card Title & Category */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {srv.calculatedCategory}
                      </span>
                      <h3 className="mt-2 font-extrabold text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors">
                        {srv.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => toggleFavorite(srv.slug)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 ${
                        isFav ? "text-amber-500" : "text-slate-400"
                      }`}
                    >
                      <Star className={`h-4.5 w-4.5 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                    {srv.description || "Guides customers through eligibility check and documentation collection."}
                  </p>

                  {/* Pricing and Commission Details */}
                  <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-white/50 p-3.5 border border-slate-200/50">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">Price</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">
                        {formatCurrency(srv.customer_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-emerald-600">Score</p>
                      <p className="mt-0.5 text-sm font-black text-emerald-600">
                        {showScore ? payoutAmount : "••••"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-indigo-600">TAT</p>
                      <p className="mt-0.5 text-sm font-extrabold text-indigo-600 truncate">
                        {srv.processing_time || "48 hrs"}
                      </p>
                    </div>
                  </div>

                  {/* Required Documents */}
                  {srv.required_documents && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-slate-400" /> Required Docs:
                      </p>
                      <p className="text-[10px] text-slate-550 leading-normal font-semibold line-clamp-2">
                        {srv.required_documents}
                      </p>
                    </div>
                  )}
                </div>

                {/* Referral Sharing Row */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Share Service:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.preventDefault(); handleCopyReferral(srv.slug); }}
                      title="Copy Link"
                      className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition flex items-center justify-center shadow-sm"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); handleWhatsAppShare(srv.slug, srv.title); }}
                      title="WhatsApp Share"
                      className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-green-600 transition flex items-center justify-center shadow-sm"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); handleOpenQRModal(srv.slug, srv.title, srv.customer_fee); }}
                      title="QR Code & Poster"
                      className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition flex items-center justify-center shadow-sm"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Apply & Details Buttons */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex gap-2">
                  <Link
                    href={`/ap/services/${srv.slug}`}
                    className="flex-1 flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition duration-150 border border-slate-200"
                  >
                    <span>Details</span>
                  </Link>
                  <Link
                    href={`/ap/applications/new?serviceId=${srv.id}`}
                    onClick={() => trackRecentUse(srv.slug)}
                    className="flex-1 flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition duration-150 border border-blue-200 hover:border-transparent hover:scale-[1.01] active:scale-[0.99] group"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white/50">
            <Layers className="mx-auto h-12 w-12 text-slate-400 animate-pulse" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No services found</h3>
            <p className="mt-2 text-sm text-slate-400 font-semibold">
              Try adjusting your search criteria or category filters to find the required digital service.
            </p>
          </div>
        )}
      </div>
      {/* QR Code & Poster Modal */}
      {sharingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-6 scale-in-center">
            <button
              onClick={() => setSharingService(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition border border-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-extrabold text-slate-900 leading-tight font-sans">Service Referral Assets</h3>
              <p className="text-slate-500 text-xs mt-1 font-semibold">{sharingService.title}</p>
            </div>

            {tokenLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-xs text-slate-500 font-semibold">Generating assets...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* QR Code Preview */}
                <div className="flex justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  {qrUrl ? (
                    <Image src={qrUrl} alt="QR Code" className="h-48 w-48 object-contain rounded-lg shadow-sm" width={192} height={192} unoptimized />
                  ) : (
                    <div className="h-48 w-48 bg-slate-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Link input */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Referral URL</span>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={refLink}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-20 text-xs font-semibold text-slate-600 outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(refLink);
                        toastSuccess("Referral link copied!");
                      }}
                      className="absolute right-2 top-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Poster Size Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Poster Layout Format</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPosterSize("a4")}
                      className={`h-9 rounded-xl text-xs font-bold border transition ${
                        posterSize === "a4"
                          ? "bg-blue-50 border-blue-500 text-blue-600 shadow-sm"
                          : "bg-white border-slate-250 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      A4 Flyer
                    </button>
                    <button
                      onClick={() => setPosterSize("square")}
                      className={`h-9 rounded-xl text-xs font-bold border transition ${
                        posterSize === "square"
                          ? "bg-blue-50 border-blue-500 text-blue-600 shadow-sm"
                          : "bg-white border-slate-250 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Square Social
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href={qrUrl}
                    download={`${sharingService.slug}-qr.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold text-xs transition"
                  >
                    <Download className="h-4 w-4" /> Download QR
                  </a>
                  <button
                    onClick={handlePrintPoster}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-lg shadow-blue-500/15"
                  >
                    <QrCode className="h-4 w-4" /> Print Poster
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
