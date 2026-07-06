import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isActiveAgent, isCeoPartnerType } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  Users,
  UserPlus2,
  ShieldCheck,
  MapPin,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CEOTeamPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  const active = await isActiveAgent(user);
  if (!active) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap || !isCeoPartnerType(ap.partner_type)) {
    redirect("/ap/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let teamMembers: {
    id: string;
    full_name: string;
    partner_code: string;
    partner_type: string;
    mobile: string;
    email: string;
    status: string;
    kyc_status: string;
    district: string | null;
    state: string | null;
    created_at: string;
  }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("agency_partners")
      .select("id, full_name, partner_code, partner_type, mobile, email, status, kyc_status, district, state, created_at")
      .eq("created_by_user_id", user.id)
      .order("created_at", { ascending: false });

    teamMembers = data ?? [];
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-indigo-600" />
              <h1 className="text-2xl font-black tracking-tight text-slate-900">My Team</h1>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Manage your team of Shop Owners and Field Executives
            </p>
          </div>
          <Link
            href="/ap/team/new"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-150 shadow-md shadow-blue-500/10"
          >
            <UserPlus2 className="h-4 w-4" />
            Create Team Member
          </Link>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-[20px] bg-white border border-slate-200/50 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Members</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{teamMembers.length}</p>
          </div>
          <div className="rounded-[20px] bg-white border border-slate-200/50 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shop Owners</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {teamMembers.filter(m => m.partner_type === "shop_owner").length}
            </p>
          </div>
          <div className="rounded-[20px] bg-white border border-slate-200/50 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Field Executives</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {teamMembers.filter(m => m.partner_type === "field_executive").length}
            </p>
          </div>
        </div>

        {/* Team List */}
        {teamMembers.length === 0 ? (
          <div className="rounded-[24px] bg-white border border-slate-200/50 p-12 text-center shadow-sm">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-extrabold text-slate-800">No team members yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start building your team by creating Shop Owners and Field Executives.
            </p>
            <Link
              href="/ap/team/new"
              className="inline-flex items-center gap-2 mt-5 h-10 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-150 shadow-md shadow-blue-500/10"
            >
              <UserPlus2 className="h-4 w-4" />
              Create First Team Member
            </Link>
          </div>
        ) : (
          <div className="rounded-[24px] bg-white border border-slate-200/50 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-4">Member</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Created</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors items-center"
                >
                  {/* Member Info */}
                  <div className="sm:col-span-4 space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-900">{member.full_name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{member.partner_code}</p>
                    <p className="text-[10px] text-slate-500 sm:hidden">
                      {member.mobile} · {member.email}
                    </p>
                  </div>

                  {/* Role */}
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                      {member.partner_type.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="sm:col-span-2 hidden sm:flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {member.district || member.state || "—"}
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      member.status === "active"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-amber-50 border-amber-100 text-amber-700"
                    )}>
                      <ShieldCheck className={cn(
                        "h-3 w-3",
                        member.status === "active" ? "text-emerald-500" : "text-amber-500"
                      )} />
                      {member.status}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="sm:col-span-2 text-right">
                    <span className="text-[10px] font-medium text-slate-400">
                      {new Date(member.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="pt-2">
          <Link
            href="/ap/dashboard"
            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
