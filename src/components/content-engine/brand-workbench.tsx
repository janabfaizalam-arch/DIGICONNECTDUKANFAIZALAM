"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Wand2 } from "lucide-react";

import { ErrorNotice, NotInstalledNotice, SectionCard, Spinner } from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import type { BrandSettings } from "@/lib/content-engine/types";

/**
 * How DigiConnect sounds, and where that description came from.
 *
 * The important control on this screen is "Analyze my posts". A voice guide
 * written by a model that has never read this shop's posts is a guess; one
 * derived from ten posts that actually worked is a description. The screen
 * says which of the two the current guide is, and when it was made.
 */
export function BrandWorkbench() {
  const { success, error: toastError } = useToast();

  const [brand, setBrand] = useState<BrandSettings | null>(null);
  const [samples, setSamples] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content-engine/brand");
      const json = (await response.json()) as { brand?: BrandSettings; samples?: string[]; error?: string; code?: string };
      if (json.code === "not_installed") {
        setNotInstalled(true);
        return;
      }
      if (!response.ok || !json.brand) throw new Error(json.error || "Brand settings load nahi hue.");
      setBrand(json.brand);
      setSamples((json.samples ?? []).join("\n\n---\n\n"));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Brand settings load nahi hue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!brand) return;
    setBusy("save");
    try {
      const response = await fetch("/api/admin/content-engine/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brand.brandName,
          logoUrl: brand.logoUrl,
          primaryColors: brand.primaryColors,
          secondaryColors: brand.secondaryColors,
          fonts: brand.fonts,
          tone: brand.tone,
          preferredLanguage: brand.preferredLanguage,
          wordsToAvoid: brand.wordsToAvoid,
          ctaRules: brand.ctaRules,
          audience: brand.audience,
          businessCategories: brand.businessCategories,
          visualRules: brand.visualRules,
        }),
      });
      const json = (await response.json()) as { brand?: BrandSettings; error?: string };
      if (!response.ok || !json.brand) throw new Error(json.error || "Save nahi hua.");
      setBrand(json.brand);
      success("Brand settings save ho gayi.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Save nahi hua.");
    } finally {
      setBusy(null);
    }
  };

  const analyze = async () => {
    setBusy("analyze");
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samples: samples
            .split(/\n\s*---\s*\n/)
            .map((sample) => sample.trim())
            .filter(Boolean),
        }),
      });
      const json = (await response.json()) as { brand?: BrandSettings; error?: string };
      if (!response.ok || !json.brand) throw new Error(json.error || "Analysis nahi ho paya.");
      setBrand(json.brand);
      success("Voice guide aapke apne posts se ban gaya.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Analysis nahi ho paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  if (notInstalled) return <NotInstalledNotice />;
  if (loading || !brand) return <Spinner label="Brand settings khul rahi hain…" />;

  const lines = (values: string[]) => values.join("\n");
  const parse = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      <SectionCard
        title="Analyze my posts"
        subtitle="Apne 3 se 10 purane post yahan paste kijiye, teen dash (---) se alag karke."
      >
        <textarea
          value={samples}
          onChange={(event) => setSamples(event.target.value)}
          rows={10}
          placeholder={"Pehla post…\n\n---\n\nDusra post…"}
          className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium leading-relaxed outline-none focus:border-[var(--dc-blue-600)]"
        />
        <Button className="mt-3 h-9 px-4 text-[12.5px]" isLoading={busy === "analyze"} onClick={() => void analyze()}>
          <Wand2 className="h-4 w-4" />
          Analyze my posts
        </Button>
        <p className="mt-2 text-[11.5px] font-semibold text-[var(--dc-muted)]">
          {brand.voice.analyzedAt
            ? `Abhi ka voice guide ${brand.voice.sampleCount} posts se bana hai, ${new Date(brand.voice.analyzedAt).toLocaleDateString("en-IN")} ko.`
            : "Abhi ka voice guide default hai — aapke posts se nahi bana. Upar paste karke banaiye."}
        </p>
      </SectionCard>

      <SectionCard title="Voice guide" subtitle="Har content generation isi ke hisaab se hoti hai.">
        <dl className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["Sentences", brand.voice.sentenceStyle],
              ["Vocabulary", brand.voice.vocabulary],
              ["Tone", brand.voice.tone],
              ["Hooks", brand.voice.hookStyle],
              ["CTA", brand.voice.ctaStyle],
              ["Paragraphs", brand.voice.paragraphLength],
              ["Punctuation", brand.voice.punctuation],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-[0.8rem] border border-slate-200 p-3">
              <dt className="text-[11px] font-bold uppercase text-[var(--dc-muted)]">{label}</dt>
              <dd className="mt-0.5 text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">{value}</dd>
            </div>
          ))}
        </dl>
        {brand.voice.commonPhrases.length > 0 && (
          <p className="mt-2 text-[12px] font-medium text-[var(--dc-body)]">
            <span className="font-bold">Ye phrases aap istemaal karte hain:</span>{" "}
            {brand.voice.commonPhrases.join(", ")}
          </p>
        )}
      </SectionCard>

      <SectionCard title="Brand" subtitle="Naam, rang, font aur audience — design aur likhai dono isse chalte hain.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">Brand name</span>
            <input
              value={brand.brandName}
              onChange={(event) => setBrand({ ...brand, brandName: event.target.value })}
              className="h-10 w-full rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">Language</span>
            <input
              value={brand.preferredLanguage}
              onChange={(event) => setBrand({ ...brand, preferredLanguage: event.target.value })}
              className="h-10 w-full rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">Primary colours</span>
            <input
              value={brand.primaryColors.join(", ")}
              onChange={(event) =>
                setBrand({ ...brand, primaryColors: event.target.value.split(",").map((color) => color.trim()) })
              }
              className="h-10 w-full rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">Logo URL</span>
            <input
              value={brand.logoUrl ?? ""}
              onChange={(event) => setBrand({ ...brand, logoUrl: event.target.value })}
              className="h-10 w-full rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">Audience</span>
            <textarea
              value={brand.audience}
              onChange={(event) => setBrand({ ...brand, audience: event.target.value })}
              rows={4}
              className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">
              Ye shabd kabhi mat likhna (ek line mein ek)
            </span>
            <textarea
              value={lines(brand.wordsToAvoid)}
              onChange={(event) => setBrand({ ...brand, wordsToAvoid: parse(event.target.value) })}
              rows={4}
              className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">CTA rules</span>
            <textarea
              value={lines(brand.ctaRules)}
              onChange={(event) => setBrand({ ...brand, ctaRules: parse(event.target.value) })}
              rows={4}
              className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[var(--dc-muted)]">Visual rules</span>
            <textarea
              value={lines(brand.visualRules)}
              onChange={(event) => setBrand({ ...brand, visualRules: parse(event.target.value) })}
              rows={4}
              className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
            />
          </label>
        </div>

        <Button className="mt-3 h-9 px-4 text-[12.5px]" isLoading={busy === "save"} onClick={() => void save()}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </SectionCard>
    </div>
  );
}
