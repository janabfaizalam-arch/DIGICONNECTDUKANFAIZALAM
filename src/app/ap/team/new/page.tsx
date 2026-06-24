import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isActiveAgent, isCeoPartnerType } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { Crown, ArrowLeft } from "lucide-react";
import { CreateTeamMemberForm } from "./create-team-member-form";

export const dynamic = "force-dynamic";

export default async function CreateTeamMemberPage() {
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

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Back Nav */}
        <Link
          href="/ap/team"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Team
        </Link>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Create Team Member</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Add a new Shop Owner or Field Executive to your team. They will be able to log in at{" "}
            <span className="font-mono text-slate-700">/ap/login</span> with their credentials.
          </p>
        </div>

        {/* Form */}
        <CreateTeamMemberForm />
      </div>
    </main>
  );
}
