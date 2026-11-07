import "server-only";

import { randomBytes } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { DEFAULT_ADDONS, DEFAULT_PLANS } from "./defaults";
import type { AddonInput, EnquiryInput, PlanInput, QuoteInput } from "./schema";
import type {
  AddonUnit,
  DigitalAddon,
  DigitalEnquiry,
  DigitalPlan,
  EnquiryStatus,
  FeatureGroup,
  PlanFaq,
  PlanLimit,
  QuoteLine,
} from "./types";

/**
 * Reads and writes for RNOS Digital packages.
 *
 * Everything here runs on the service-role client, so every caller that
 * writes must have checked the admin role first (the API routes do). The
 * public reads only ever return active rows.
 */

/* ───────────────────────── Row mapping ───────────────────────── */

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  best_for: string;
  monthly_price_paise: number;
  setup_fee_paise: number;
  price_is_starting: boolean;
  commitment_months: number;
  is_recommended: boolean;
  is_active: boolean;
  featured_on_homepage: boolean;
  sort_order: number;
  limits: unknown;
  exclusions: unknown;
  maintenance: string;
  terms: string;
  faqs: unknown;
};

type FeatureRow = {
  plan_id: string;
  feature_key: string;
  label: string;
  compare_label: string;
  value: string | null;
  feature_group: string;
  highlight: boolean;
  sort_order: number;
};

type AddonRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_paise: number;
  unit: string;
  price_is_starting: boolean;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

const PLAN_COLUMNS =
  "id, slug, name, tagline, description, best_for, monthly_price_paise, setup_fee_paise, price_is_starting, commitment_months, is_recommended, is_active, featured_on_homepage, sort_order, limits, exclusions, maintenance, terms, faqs";
const ADDON_COLUMNS = "id, slug, name, description, price_paise, unit, price_is_starting, note, is_active, sort_order";

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function mapAddon(row: AddonRow): DigitalAddon {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    pricePaise: row.price_paise,
    unit: row.unit as AddonUnit,
    priceIsStarting: row.price_is_starting,
    note: row.note,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapPlan(row: PlanRow, features: FeatureRow[], addonSlugs: string[]): DigitalPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    bestFor: row.best_for,
    monthlyPricePaise: row.monthly_price_paise,
    setupFeePaise: row.setup_fee_paise,
    priceIsStarting: row.price_is_starting,
    commitmentMonths: row.commitment_months,
    isRecommended: row.is_recommended,
    isActive: row.is_active,
    featuredOnHomepage: row.featured_on_homepage,
    sortOrder: row.sort_order,
    features: features
      .filter((feature) => feature.plan_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((feature) => ({
        key: feature.feature_key,
        label: feature.label,
        compareLabel: feature.compare_label,
        value: feature.value,
        group: feature.feature_group as FeatureGroup,
        highlight: feature.highlight,
      })),
    limits: asArray<PlanLimit>(row.limits),
    exclusions: asArray<string>(row.exclusions),
    maintenance: row.maintenance,
    terms: row.terms,
    faqs: asArray<PlanFaq>(row.faqs),
    addonSlugs,
  };
}

/* ───────────────────────── Fallback ───────────────────────── */

/** The shipped packages, for when the tables cannot be read at all. */
export function fallbackCatalogue(): { plans: DigitalPlan[]; addons: DigitalAddon[] } {
  return {
    plans: DEFAULT_PLANS.map((plan, index) => ({ ...plan, id: `default-${plan.slug}`, isActive: true, sortOrder: index + 1 })),
    addons: DEFAULT_ADDONS.map((addon, index) => ({ ...addon, id: `default-${addon.slug}`, isActive: true, sortOrder: index + 1 })),
  };
}

/* ───────────────────────── Reads ───────────────────────── */

async function loadPlans(includeInactive: boolean): Promise<DigitalPlan[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database client unavailable.");

  let query = supabase.from("digital_plans").select(PLAN_COLUMNS).order("sort_order").order("created_at");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data: plans, error } = await query;
  if (error) throw new Error(`digital_plans: ${error.code ?? error.message}`);
  const rows = (plans ?? []) as PlanRow[];
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const [{ data: features, error: featureError }, { data: links, error: linkError }] = await Promise.all([
    supabase
      .from("digital_plan_features")
      .select("plan_id, feature_key, label, compare_label, value, feature_group, highlight, sort_order")
      .in("plan_id", ids),
    supabase.from("digital_plan_addons").select("plan_id, sort_order, digital_addons(slug)").in("plan_id", ids),
  ]);
  if (featureError) throw new Error(`digital_plan_features: ${featureError.code ?? featureError.message}`);
  if (linkError) throw new Error(`digital_plan_addons: ${linkError.code ?? linkError.message}`);

  type LinkRow = { plan_id: string; sort_order: number; digital_addons: { slug: string } | { slug: string }[] | null };
  const linkRows = (links ?? []) as LinkRow[];
  const slugsFor = (planId: string) =>
    linkRows
      .filter((link) => link.plan_id === planId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => (Array.isArray(link.digital_addons) ? link.digital_addons[0]?.slug : link.digital_addons?.slug))
      .filter((value): value is string => Boolean(value));

  return rows.map((row) => mapPlan(row, (features ?? []) as FeatureRow[], slugsFor(row.id)));
}

async function loadAddons(includeInactive: boolean): Promise<DigitalAddon[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database client unavailable.");
  let query = supabase.from("digital_addons").select(ADDON_COLUMNS).order("sort_order").order("created_at");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(`digital_addons: ${error.code ?? error.message}`);
  return ((data ?? []) as AddonRow[]).map(mapAddon);
}

export type Catalogue = { plans: DigitalPlan[]; addons: DigitalAddon[]; source: "database" | "fallback" };

/**
 * What the public pages show: active plans and add-ons from the database.
 *
 * Only a failed read falls back to the shipped list. An empty table is shown
 * as empty — an admin who switched every plan off meant it.
 */
export async function getPublicCatalogue(): Promise<Catalogue> {
  try {
    const [plans, addons] = await Promise.all([loadPlans(false), loadAddons(false)]);
    return { plans, addons, source: "database" };
  } catch (error) {
    console.error("[digital-plans] public read failed, showing shipped packages", error instanceof Error ? error.message : error);
    return { ...fallbackCatalogue(), source: "fallback" };
  }
}

export async function listPlansForAdmin(): Promise<DigitalPlan[]> {
  return loadPlans(true);
}

export async function listAddonsForAdmin(): Promise<DigitalAddon[]> {
  return loadAddons(true);
}

export async function getPlanForAdmin(id: string): Promise<DigitalPlan | null> {
  const plans = await loadPlans(true);
  return plans.find((plan) => plan.id === id) ?? null;
}

export type PriceHistoryEntry = { monthlyPricePaise: number; setupFeePaise: number; priceIsStarting: boolean; effectiveFrom: string };

export async function getPriceHistory(planId: string): Promise<PriceHistoryEntry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("digital_plan_price_history")
    .select("monthly_price_paise, setup_fee_paise, price_is_starting, effective_from")
    .eq("plan_id", planId)
    .order("effective_from", { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => ({
    monthlyPricePaise: row.monthly_price_paise,
    setupFeePaise: row.setup_fee_paise,
    priceIsStarting: row.price_is_starting,
    effectiveFrom: row.effective_from,
  }));
}

/* ───────────────────────── Plan writes ───────────────────────── */

export type WriteResult<T = { id: string }> = { ok: true; value: T } | { ok: false; error: string; status: number };

function dbError(error: { code?: string; message: string }, fallback: string): { ok: false; error: string; status: number } {
  if (error.code === "23505") return { ok: false, error: "That slug is already used by another entry.", status: 409 };
  console.error("[digital-plans] write failed", error.code ?? error.message);
  return { ok: false, error: fallback, status: 500 };
}

/**
 * Create or update a plan with its features and add-on links.
 *
 * Prices on the plan row are the list price only. Existing enquiries and
 * quotations keep their own copies, and the database records each price
 * change in digital_plan_price_history.
 */
export async function savePlan(id: string | null, input: PlanInput, userId: string): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };

  // Only one plan can be recommended; clear the others first (a unique index enforces it).
  if (input.isRecommended) {
    let clear = supabase.from("digital_plans").update({ is_recommended: false, updated_by: userId }).eq("is_recommended", true);
    if (id) clear = clear.neq("id", id);
    const { error } = await clear;
    if (error) return dbError(error, "Could not update the recommended plan.");
  }

  const row = {
    slug: input.slug,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    best_for: input.bestFor,
    monthly_price_paise: input.monthlyPricePaise,
    setup_fee_paise: input.setupFeePaise,
    price_is_starting: input.priceIsStarting,
    commitment_months: input.commitmentMonths,
    is_recommended: input.isRecommended,
    is_active: input.isActive,
    featured_on_homepage: input.featuredOnHomepage,
    limits: input.limits,
    exclusions: input.exclusions,
    maintenance: input.maintenance,
    terms: input.terms,
    faqs: input.faqs,
    updated_by: userId,
  };

  let planId = id;
  if (id) {
    const { error } = await supabase.from("digital_plans").update(row).eq("id", id);
    if (error) return dbError(error, "Could not save the plan.");
  } else {
    const { data: last } = await supabase.from("digital_plans").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    const sortOrder = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1;
    const { data, error } = await supabase
      .from("digital_plans")
      .insert({ ...row, sort_order: sortOrder, created_by: userId })
      .select("id")
      .single();
    if (error || !data) return dbError(error ?? { message: "no row" }, "Could not create the plan.");
    planId = data.id as string;
  }

  const { error: deleteFeaturesError } = await supabase.from("digital_plan_features").delete().eq("plan_id", planId!);
  if (deleteFeaturesError) return dbError(deleteFeaturesError, "Plan saved, but its features could not be updated.");
  if (input.features.length) {
    const { error } = await supabase.from("digital_plan_features").insert(
      input.features.map((feature, index) => ({
        plan_id: planId,
        feature_key: feature.key,
        label: feature.label,
        compare_label: feature.compareLabel,
        value: feature.value || null,
        feature_group: feature.group,
        highlight: feature.highlight,
        sort_order: index + 1,
      })),
    );
    if (error) return dbError(error, "Plan saved, but its features could not be updated.");
  }

  const { error: deleteLinksError } = await supabase.from("digital_plan_addons").delete().eq("plan_id", planId!);
  if (deleteLinksError) return dbError(deleteLinksError, "Plan saved, but its add-ons could not be updated.");
  if (input.addonSlugs.length) {
    const { data: addons } = await supabase.from("digital_addons").select("id, slug").in("slug", input.addonSlugs);
    const idBySlug = new Map((addons ?? []).map((addon) => [addon.slug as string, addon.id as string]));
    const links = input.addonSlugs
      .filter((slug) => idBySlug.has(slug))
      .map((slug, index) => ({ plan_id: planId, addon_id: idBySlug.get(slug), sort_order: index + 1 }));
    if (links.length) {
      const { error } = await supabase.from("digital_plan_addons").insert(links);
      if (error) return dbError(error, "Plan saved, but its add-ons could not be updated.");
    }
  }

  return { ok: true, value: { id: planId! } };
}

export async function setPlanFlags(id: string, flags: { isActive?: boolean; isRecommended?: boolean }, userId: string): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  if (flags.isRecommended) {
    const { error } = await supabase.from("digital_plans").update({ is_recommended: false, updated_by: userId }).eq("is_recommended", true).neq("id", id);
    if (error) return dbError(error, "Could not update the recommended plan.");
  }
  const patch: Record<string, unknown> = { updated_by: userId };
  if (flags.isActive !== undefined) patch.is_active = flags.isActive;
  if (flags.isRecommended !== undefined) patch.is_recommended = flags.isRecommended;
  const { error } = await supabase.from("digital_plans").update(patch).eq("id", id);
  if (error) return dbError(error, "Could not update the plan.");
  return { ok: true, value: { id } };
}

/** Write the order the admin arranged, 1..n. */
export async function reorder(table: "digital_plans" | "digital_addons", ids: string[]): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase.from(table).update({ sort_order: index + 1 }).eq("id", id);
    if (error) return dbError(error, "Could not save the order.");
  }
  return { ok: true, value: { id: ids[0] ?? "" } };
}

export async function deletePlan(id: string): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  const { error } = await supabase.from("digital_plans").delete().eq("id", id);
  if (error) return dbError(error, "Could not delete the plan.");
  return { ok: true, value: { id } };
}

/* ───────────────────────── Add-on writes ───────────────────────── */

export async function saveAddon(id: string | null, input: AddonInput): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  const row = {
    slug: input.slug,
    name: input.name,
    description: input.description,
    price_paise: input.pricePaise,
    unit: input.unit,
    price_is_starting: input.priceIsStarting,
    note: input.note || null,
    is_active: input.isActive,
  };
  if (id) {
    const { error } = await supabase.from("digital_addons").update(row).eq("id", id);
    if (error) return dbError(error, "Could not save the add-on.");
    return { ok: true, value: { id } };
  }
  const { data: last } = await supabase.from("digital_addons").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("digital_addons")
    .insert({ ...row, sort_order: ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) return dbError(error ?? { message: "no row" }, "Could not create the add-on.");
  return { ok: true, value: { id: data.id as string } };
}

export async function deleteAddon(id: string): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  const { error } = await supabase.from("digital_addons").delete().eq("id", id);
  if (error) return dbError(error, "Could not delete the add-on.");
  return { ok: true, value: { id } };
}

/* ───────────────────────── Enquiries & quotations ───────────────────────── */

type EnquiryRow = {
  id: string;
  reference: string;
  plan_id: string | null;
  plan_slug: string;
  plan_name: string;
  monthly_price_paise: number;
  setup_fee_paise: number;
  price_is_starting: boolean;
  commitment_months: number;
  name: string;
  mobile: string;
  email: string | null;
  business_name: string | null;
  requirements: string | null;
  addon_slugs: string[] | null;
  lead_id: string | null;
  status: string;
  quote_monthly_paise: number | null;
  quote_setup_paise: number | null;
  quote_lines: unknown;
  quote_gst_percent: number | string;
  quote_commitment_months: number | null;
  quote_notes: string | null;
  quote_valid_until: string | null;
  quote_token: string | null;
  quoted_at: string | null;
  approved_at: string | null;
  approval_name: string | null;
  declined_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const ENQUIRY_COLUMNS =
  "id, reference, plan_id, plan_slug, plan_name, monthly_price_paise, setup_fee_paise, price_is_starting, commitment_months, name, mobile, email, business_name, requirements, addon_slugs, lead_id, status, quote_monthly_paise, quote_setup_paise, quote_lines, quote_gst_percent, quote_commitment_months, quote_notes, quote_valid_until, quote_token, quoted_at, approved_at, approval_name, declined_at, admin_notes, created_at, updated_at";

function mapEnquiry(row: EnquiryRow): DigitalEnquiry {
  return {
    id: row.id,
    reference: row.reference,
    planId: row.plan_id,
    planSlug: row.plan_slug,
    planName: row.plan_name,
    monthlyPricePaise: row.monthly_price_paise,
    setupFeePaise: row.setup_fee_paise,
    priceIsStarting: row.price_is_starting,
    commitmentMonths: row.commitment_months,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    businessName: row.business_name,
    requirements: row.requirements,
    addonSlugs: row.addon_slugs ?? [],
    leadId: row.lead_id,
    status: row.status as EnquiryStatus,
    quoteMonthlyPaise: row.quote_monthly_paise,
    quoteSetupPaise: row.quote_setup_paise,
    quoteLines: asArray<QuoteLine>(row.quote_lines),
    quoteGstPercent: Number(row.quote_gst_percent),
    quoteCommitmentMonths: row.quote_commitment_months,
    quoteNotes: row.quote_notes,
    quoteValidUntil: row.quote_valid_until,
    quoteToken: row.quote_token,
    quotedAt: row.quoted_at,
    approvedAt: row.approved_at,
    approvalName: row.approval_name,
    declinedAt: row.declined_at,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Record an enquiry. The plan and its prices come from the database by slug,
 * never from the browser, and are copied onto the enquiry as they stand now.
 */
export async function createEnquiry(
  input: EnquiryInput,
  leadId: string | null,
): Promise<WriteResult<{ id: string; reference: string; plan: DigitalPlan }>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable. Please try WhatsApp.", status: 503 };

  const plans = await loadPlans(false).catch(() => null);
  if (!plans) return { ok: false, error: "Service unavailable. Please try WhatsApp.", status: 503 };
  const plan = plans.find((item) => item.slug === input.planSlug);
  if (!plan) return { ok: false, error: "This plan is not available.", status: 404 };

  const { data, error } = await supabase
    .from("digital_plan_enquiries")
    .insert({
      plan_id: plan.id,
      plan_slug: plan.slug,
      plan_name: plan.name,
      monthly_price_paise: plan.monthlyPricePaise,
      setup_fee_paise: plan.setupFeePaise,
      price_is_starting: plan.priceIsStarting,
      commitment_months: plan.commitmentMonths,
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      business_name: input.businessName,
      requirements: input.requirements,
      addon_slugs: input.addonSlugs,
      lead_id: leadId,
    })
    .select("id, reference")
    .single();
  if (error || !data) return dbError(error ?? { message: "no row" }, "Your enquiry could not be saved. Please try WhatsApp.");
  return { ok: true, value: { id: data.id as string, reference: data.reference as string, plan } };
}

/** The plan a public enquiry is about, for building the CRM lead before the insert. */
export async function getActivePlanBySlug(slug: string): Promise<DigitalPlan | null> {
  const plans = await loadPlans(false).catch(() => []);
  return plans.find((plan) => plan.slug === slug) ?? null;
}

export async function listEnquiries(filter: { status?: string; query?: string } = {}): Promise<DigitalEnquiry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  let query = supabase.from("digital_plan_enquiries").select(ENQUIRY_COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
  const q = filter.query?.trim().replace(/[%,()]/g, "");
  if (q) query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,business_name.ilike.%${q}%,reference.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) {
    console.error("[digital-plans] list enquiries failed", error.code ?? error.message);
    return [];
  }
  return ((data ?? []) as EnquiryRow[]).map(mapEnquiry);
}

export async function getEnquiry(id: string): Promise<DigitalEnquiry | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("digital_plan_enquiries").select(ENQUIRY_COLUMNS).eq("id", id).maybeSingle();
  return data ? mapEnquiry(data as EnquiryRow) : null;
}

export async function updateEnquiry(id: string, patch: { status?: EnquiryStatus; adminNotes?: string | null }): Promise<WriteResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  const row: Record<string, unknown> = {};
  if (patch.status) row.status = patch.status;
  if (patch.adminNotes !== undefined) row.admin_notes = patch.adminNotes;
  const { error } = await supabase.from("digital_plan_enquiries").update(row).eq("id", id);
  if (error) return dbError(error, "Could not update the enquiry.");
  return { ok: true, value: { id } };
}

/**
 * Save the quotation and give it a private link. Revising a quotation after
 * the customer approved it clears the approval: they must approve the new
 * figures, not the old ones.
 */
export async function saveQuote(id: string, quote: QuoteInput, userId: string): Promise<WriteResult<{ id: string; token: string }>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database client unavailable.", status: 500 };
  const existing = await getEnquiry(id);
  if (!existing) return { ok: false, error: "Enquiry not found.", status: 404 };
  if (existing.status === "won") return { ok: false, error: "This customer is already active; record changes in a new enquiry.", status: 409 };

  const token = existing.quoteToken ?? randomBytes(24).toString("base64url");
  const { error } = await supabase
    .from("digital_plan_enquiries")
    .update({
      quote_monthly_paise: quote.monthlyPaise,
      quote_setup_paise: quote.setupPaise,
      quote_lines: quote.lines,
      quote_gst_percent: quote.gstPercent,
      quote_commitment_months: quote.commitmentMonths,
      quote_notes: quote.notes,
      quote_valid_until: quote.validUntil,
      quote_token: token,
      quoted_at: new Date().toISOString(),
      quoted_by: userId,
      approved_at: null,
      approval_name: null,
      declined_at: null,
      status: "quoted",
    })
    .eq("id", id);
  if (error) return dbError(error, "Could not save the quotation.");
  return { ok: true, value: { id, token } };
}

export async function getEnquiryByToken(token: string): Promise<DigitalEnquiry | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("digital_plan_enquiries").select(ENQUIRY_COLUMNS).eq("quote_token", token).maybeSingle();
  return data ? mapEnquiry(data as EnquiryRow) : null;
}

export function quoteIsOpen(enquiry: DigitalEnquiry, today = new Date().toISOString().slice(0, 10)): boolean {
  return enquiry.status === "quoted" && Boolean(enquiry.quotedAt) && (!enquiry.quoteValidUntil || enquiry.quoteValidUntil >= today);
}

/**
 * The customer's answer to their quotation. Approval only records consent to
 * the quoted figures; it does not start a subscription or take a payment.
 */
export async function respondToQuote(
  token: string,
  response: { approve: true; name: string } | { approve: false },
): Promise<WriteResult<DigitalEnquiry>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };
  const enquiry = await getEnquiryByToken(token);
  if (!enquiry) return { ok: false, error: "Quotation not found.", status: 404 };
  if (!quoteIsOpen(enquiry)) return { ok: false, error: "This quotation is no longer open. Please contact us for an updated one.", status: 409 };

  const now = new Date().toISOString();
  const patch = response.approve
    ? { status: "approved", approved_at: now, approval_name: response.name, declined_at: null }
    : { status: "declined", declined_at: now };
  // Conditional on the status still being "quoted", so a double click cannot write twice.
  const { data, error } = await supabase
    .from("digital_plan_enquiries")
    .update(patch)
    .eq("id", enquiry.id)
    .eq("status", "quoted")
    .select(ENQUIRY_COLUMNS)
    .maybeSingle();
  if (error) return dbError(error, "Could not record your response.");
  if (!data) return { ok: false, error: "This quotation was already answered.", status: 409 };
  return { ok: true, value: mapEnquiry(data as EnquiryRow) };
}
