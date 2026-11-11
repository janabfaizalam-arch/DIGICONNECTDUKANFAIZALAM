import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { emptyDpr } from "./defaults";
import { buildDpr, type DprInput } from "./engine";
import type { ProjectReportPayload } from "./schema";
import { finalBlockerFor } from "./validation";

/** Reads and writes for DPRs. Callers must have checked the admin role. */

export type ProjectReportRecord = {
  id: string;
  reference: string;
  status: "draft" | "final";
  input: DprInput;
  createdAt: string;
  updatedAt: string;
};

export type ProjectReportListItem = {
  id: string;
  reference: string;
  businessName: string;
  promoterName: string;
  mobile: string | null;
  scheme: string;
  projectCost: number;
  bankLoan: number;
  status: "draft" | "final";
  updatedAt: string;
};

type Row = Record<string, unknown>;

export function referenceFor(serial: unknown) {
  return `DIGI-DPR-${String(serial ?? 0).padStart(5, "0")}`;
}

/** Stored input merged over today's defaults, so a field added later never arrives undefined. */
export function normaliseInput(raw: unknown): DprInput {
  const base = emptyDpr();
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<DprInput>;
  return { ...base, ...value, narrative: { ...(value.narrative ?? {}) }, depreciationRates: { ...(value.depreciationRates ?? {}) } };
}

function rowToRecord(row: Row): ProjectReportRecord {
  return {
    id: String(row.id),
    reference: referenceFor(row.serial_no),
    status: row.status === "final" ? "final" : "draft",
    input: normaliseInput(row.input),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function payloadToRow(payload: ProjectReportPayload) {
  const report = buildDpr(payload.input);
  return {
    business_name: payload.input.businessName,
    promoter_name: payload.input.promoters.find((p) => p.name.trim())?.name ?? "",
    mobile: payload.input.promoters.find((p) => p.mobile.trim())?.mobile ?? null,
    scheme: payload.input.scheme,
    project_cost: report.cost.total,
    bank_loan: report.means.bankLoan,
    input: { version: 1, ...payload.input },
    status: payload.status,
  };
}

/** A report can be final only when its means of finance add up to the project cost and every statement reconciles. */
export function finalBlocker(payload: ProjectReportPayload) {
  return finalBlockerFor(payload);
}

export async function listProjectReports({ query = "", status = "all" }: { query?: string; status?: string } = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as ProjectReportListItem[];
  let request = supabase
    .from("project_reports")
    .select("id, serial_no, business_name, promoter_name, mobile, scheme, project_cost, bank_loan, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status === "draft" || status === "final") request = request.eq("status", status);
  const q = query.trim().replace(/[%,()]/g, " ").trim();
  if (q) {
    const serial = /^(?:DIGI-DPR-)?0*(\d+)$/i.exec(q)?.[1];
    request = serial ? request.eq("serial_no", Number(serial)) : request.or(`business_name.ilike.%${q}%,promoter_name.ilike.%${q}%,mobile.ilike.%${q}%`);
  }
  const { data, error } = await request;
  if (error) {
    console.error("[project-reports] list failed", error.message);
    return [] as ProjectReportListItem[];
  }
  return (data ?? []).map((row: Row) => ({
    id: String(row.id),
    reference: referenceFor(row.serial_no),
    businessName: String(row.business_name ?? ""),
    promoterName: String(row.promoter_name ?? ""),
    mobile: (row.mobile as string | null) ?? null,
    scheme: String(row.scheme ?? "none"),
    projectCost: Number(row.project_cost ?? 0),
    bankLoan: Number(row.bank_loan ?? 0),
    status: row.status === "final" ? ("final" as const) : ("draft" as const),
    updatedAt: String(row.updated_at ?? ""),
  }));
}

export async function getProjectReport(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("project_reports").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Row);
}

export async function createProjectReport(payload: ProjectReportPayload, userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, message: "Is server par database set nahi hai." };
  const { data, error } = await supabase
    .from("project_reports")
    .insert({ ...payloadToRow(payload), created_by: userId, updated_by: userId })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[project-reports] create failed", error?.message);
    return { ok: false as const, message: "DPR save nahi ho payi. Dobara koshish karein." };
  }
  return { ok: true as const, id: String(data.id) };
}

export async function updateProjectReport(id: string, payload: ProjectReportPayload, userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, message: "Is server par database set nahi hai." };
  const { data, error } = await supabase
    .from("project_reports")
    .update({ ...payloadToRow(payload), updated_by: userId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[project-reports] update failed", error.message);
    return { ok: false as const, message: "DPR save nahi ho payi. Dobara koshish karein." };
  }
  if (!data) return { ok: false as const, message: "DPR nahi mili." };
  return { ok: true as const, id };
}

export async function deleteProjectReport(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error } = await supabase.from("project_reports").delete().eq("id", id);
  if (error) console.error("[project-reports] delete failed", error.message);
  return !error;
}
