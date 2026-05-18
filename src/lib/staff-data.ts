import { hydrateApplications } from "@/lib/crm";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getAssignedStaffApplications(staffId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as Application[];
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("assigned_staff_id", staffId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[staff-data] Assigned applications query failed", error.message);
    return [] as Application[];
  }

  return (await hydrateApplications((data ?? []) as Application[])) as Application[];
}

export async function getAssignedStaffApplication(staffId: string, applicationId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("assigned_staff_id", staffId)
    .maybeSingle();

  if (error) {
    console.error("[staff-data] Assigned application query failed", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const [application] = (await hydrateApplications([data as Application])) as Application[];

  return application ?? null;
}
