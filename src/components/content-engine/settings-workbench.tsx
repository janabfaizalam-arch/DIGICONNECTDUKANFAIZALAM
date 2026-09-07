"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";

import { ErrorNotice, NotInstalledNotice, SectionCard, Spinner } from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ALL_PLATFORMS } from "@/lib/content-engine/platforms";
import { PLATFORM_LABEL, WEEKDAYS, type ContentPlatform, type EngineSettings } from "@/lib/content-engine/types";
import { cn } from "@/lib/utils";

type Integrations = {
  ai: boolean;
  canva: boolean;
  platforms: { platform: ContentPlatform; connected: boolean; accountName: string | null; message: string }[];
};

/**
 * What the engine may do on its own, and what is actually connected.
 *
 * Two switches on this screen are not like the others. AUTO_PUBLISH lets
 * content reach the public without a person; AUTO_PUBLISH for government
 * content lets a scheme amount reach the public without a person. Both are
 * off, both are logged with the name of whoever changes them, and the second
 * one is drawn separately with the reason written next to it rather than as a
 * row in a list of seven identical toggles.
 */
export function SettingsWorkbench() {
  const { success, error: toastError } = useToast();

  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content-engine/settings");
      const json = (await response.json()) as {
        settings?: EngineSettings;
        integrations?: Integrations;
        installed?: boolean;
        error?: string;
        code?: string;
      };
      if (json.code === "not_installed" || json.installed === false) {
        setNotInstalled(true);
        setIntegrations(json.integrations ?? null);
        return;
      }
      if (!response.ok || !json.settings) throw new Error(json.error || "Settings load nahi hui.");
      setSettings(json.settings);
      setIntegrations(json.integrations ?? null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settings load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<EngineSettings>) => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/content-engine/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await response.json()) as { settings?: EngineSettings; error?: string };
      if (!response.ok || !json.settings) throw new Error(json.error || "Save nahi hua.");
      setSettings(json.settings);
      success("Save ho gaya.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Save nahi hua.");
    } finally {
      setBusy(false);
    }
  };

  if (notInstalled) {
    return (
      <div className="space-y-4">
        <NotInstalledNotice />
        {integrations && <IntegrationsCard integrations={integrations} />}
      </div>
    );
  }

  if (loading || !settings) return <Spinner label="Settings khul rahi hain…" />;

  const toggles: { key: keyof EngineSettings; label: string; detail: string }[] = [
    { key: "autoResearch", label: "AUTO_RESEARCH", detail: "Roz apne data mein naye sarkari update dhoondhna." },
    { key: "autoIdeaGeneration", label: "AUTO_IDEA_GENERATION", detail: "Har Monday naya ranked idea bank banana." },
    { key: "autoWriting", label: "AUTO_WRITING", detail: "Chune hue hook par master content likhna." },
    { key: "autoDesign", label: "AUTO_DESIGN", detail: "Har platform ka design brief banana." },
    { key: "autoRepurpose", label: "AUTO_REPURPOSE", detail: "Ek content se har platform ka apna version banana." },
  ];

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      <SectionCard title="Engine khud kya kar sakta hai" subtitle="Ye sab approval se pehle ka kaam hai.">
        <ul className="space-y-2">
          {toggles.map((toggle) => (
            <li key={toggle.key} className="flex flex-wrap items-center justify-between gap-2 rounded-[0.8rem] border border-slate-200 px-3 py-2">
              <span>
                <span className="block text-[12.5px] font-bold text-[var(--dc-ink)]">{toggle.label}</span>
                <span className="block text-[11.5px] font-medium text-[var(--dc-muted)]">{toggle.detail}</span>
              </span>
              <Toggle
                on={Boolean(settings[toggle.key])}
                disabled={busy}
                onChange={(value) => void save({ [toggle.key]: value } as Partial<EngineSettings>)}
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Publish ke switch"
        subtitle="Yahi wo do switch hain jinke baad content bina kisi insaan ke bahar ja sakta hai."
        className="border-amber-300 bg-amber-50/40"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[0.8rem] border border-amber-200 bg-white px-3 py-2">
            <span>
              <span className="block text-[12.5px] font-bold text-[var(--dc-ink)]">HUMAN_APPROVAL_REQUIRED</span>
              <span className="block text-[11.5px] font-medium text-[var(--dc-muted)]">
                Har post ke liye kisi insaan ki approval. Recommended: ON.
              </span>
            </span>
            <Toggle
              on={settings.humanApprovalRequired}
              disabled={busy}
              onChange={(value) => void save({ humanApprovalRequired: value })}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[0.8rem] border border-amber-200 bg-white px-3 py-2">
            <span>
              <span className="block text-[12.5px] font-bold text-[var(--dc-ink)]">AUTO_PUBLISH</span>
              <span className="block text-[11.5px] font-medium text-[var(--dc-muted)]">
                Approve ki hui post apne aap scheduled time par chali jaaye. Default: OFF.
              </span>
            </span>
            <Toggle on={settings.autoPublish} disabled={busy} onChange={(value) => void save({ autoPublish: value })} />
          </div>

          <div className="rounded-[0.8rem] border-2 border-amber-400 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--dc-ink)]">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  AUTO_PUBLISH — sarkari content
                </span>
                <span className="block text-[11.5px] font-medium text-[var(--dc-muted)]">
                  Alag switch hai, aur alag hi rahega.
                </span>
              </span>
              <Toggle
                on={settings.autoPublishGovernment}
                disabled={busy}
                onChange={(value) => void save({ autoPublishGovernment: value })}
              />
            </div>
            <p className="mt-2 text-[11.5px] font-semibold leading-snug text-amber-900">
              Ye ON karne ka matlab hai ki scheme ki amount, eligibility ya last date bina kisi insaan ke padhe
              public tak ja sakti hai. Galat gayi to customer ka nuksaan hota hai — galat kaagaz, office ka chakkar,
              chhooti hui tarikh. Isko OFF hi rakhiye jab tak aap poori tarah nishchit na hon.
            </p>
            <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-[var(--dc-muted)]">
              Note: iske ON hone par bhi har sarkari post ko pehle approve karna zaruri hai, aur uske har zaruri
              claim ka official source hona zaruri hai. Ye switch sirf &quot;approve hone ke baad apne aap jaaye&quot;
              wali baat hai.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Hafte ka plan" subtitle="Har din ka theme aur time. Calendar isi se khali slots suggest karta hai.">
        <div className="space-y-2">
          {WEEKDAYS.map((day) => {
            const entry = settings.weeklyPlan[day];
            return (
              <div key={day} className="grid gap-2 rounded-[0.8rem] border border-slate-200 p-2.5 sm:grid-cols-[110px_1fr_100px]">
                <span className="self-center text-[12px] font-bold uppercase text-[var(--dc-muted)]">{day}</span>
                <input
                  value={entry.theme}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      weeklyPlan: { ...settings.weeklyPlan, [day]: { ...entry, theme: event.target.value } },
                    })
                  }
                  className="h-9 rounded-full border border-slate-200 px-3 text-[12.5px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
                />
                <input
                  value={entry.time}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      weeklyPlan: { ...settings.weeklyPlan, [day]: { ...entry, time: event.target.value } },
                    })
                  }
                  className="h-9 rounded-full border border-slate-200 px-3 text-[12.5px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
                />
                <div className="flex flex-wrap gap-1 sm:col-span-3">
                  {ALL_PLATFORMS.map((platform) => {
                    const on = entry.platforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            weeklyPlan: {
                              ...settings.weeklyPlan,
                              [day]: {
                                ...entry,
                                platforms: on
                                  ? entry.platforms.filter((item) => item !== platform)
                                  : [...entry.platforms, platform],
                              },
                            },
                          })
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          on
                            ? "border-[var(--dc-blue-600)] bg-[var(--dc-blue-600)] text-white"
                            : "border-slate-200 bg-white text-[var(--dc-body)]",
                        )}
                      >
                        {PLATFORM_LABEL[platform]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <Button
          className="mt-3 h-9 px-4 text-[12.5px]"
          isLoading={busy}
          onClick={() => void save({ weeklyPlan: settings.weeklyPlan })}
        >
          <Save className="h-4 w-4" />
          Weekly plan save kijiye
        </Button>
      </SectionCard>

      {integrations && <IntegrationsCard integrations={integrations} />}
    </div>
  );
}

/**
 * What is connected, read from the environment rather than from a stored flag.
 *
 * A screen that says "Instagram: connected" because a checkbox is ticked,
 * while the credential is missing, is how a scheduled post fails silently at
 * ten in the morning.
 */
function IntegrationsCard({ integrations }: { integrations: Integrations }) {
  return (
    <SectionCard title="Kya juda hua hai" subtitle="Ye seedha environment se padha jaata hai, kisi checkbox se nahi.">
      <ul className="space-y-1.5">
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-[0.8rem] border border-slate-200 px-3 py-2">
          <span className="text-[12.5px] font-bold text-[var(--dc-ink)]">AI model</span>
          <span className={integrations.ai ? "text-[12px] font-bold text-emerald-700" : "text-[12px] font-bold text-amber-700"}>
            {integrations.ai ? "Juda hua hai" : "CONFIGURATION REQUIRED — GEMINI_API_KEY"}
          </span>
        </li>
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-[0.8rem] border border-slate-200 px-3 py-2">
          <span className="text-[12.5px] font-bold text-[var(--dc-ink)]">Canva</span>
          <span className={integrations.canva ? "text-[12px] font-bold text-emerald-700" : "text-[12px] font-bold text-amber-700"}>
            {integrations.canva ? "Credentials set hain" : "CONFIGURATION REQUIRED — CANVA_CLIENT_ID / SECRET"}
          </span>
        </li>
        {integrations.platforms.map((platform) => (
          <li
            key={platform.platform}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[0.8rem] border border-slate-200 px-3 py-2"
          >
            <span className="text-[12.5px] font-bold text-[var(--dc-ink)]">{PLATFORM_LABEL[platform.platform]}</span>
            <span
              className={
                platform.connected
                  ? "text-[12px] font-bold text-emerald-700"
                  : "max-w-[420px] text-right text-[11.5px] font-semibold text-amber-800"
              }
            >
              {platform.connected ? "Credentials set hain" : platform.message}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        on ? "bg-emerald-500" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}
