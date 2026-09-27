import "server-only";

import { fetchMetaTemplates, loadMetaConfig } from "@/lib/whatsapp/meta-cloud";
import { compareWithMetaTemplates, type MetaTemplateStatus } from "@/lib/whatsapp/template-registry";

export type TemplateStatusReport =
  | { ok: true; templates: MetaTemplateStatus[] }
  | { ok: false; error: string };

/**
 * Registry templates vs. what Meta has approved for this WABA, read live.
 * Needs META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_WABA_ID.
 */
export async function loadTemplateStatusReport(): Promise<TemplateStatusReport> {
  const loaded = loadMetaConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const result = await fetchMetaTemplates(loaded.config);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, templates: compareWithMetaTemplates(result.templates) };
}
