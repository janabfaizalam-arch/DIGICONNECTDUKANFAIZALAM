import { redirect } from "next/navigation";
import { User, Landmark, ShieldCheck, Heart } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAgencyPartnerByUserId, getAPKycDocuments } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function APProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const kycDocs = await getAPKycDocuments(ap.id);

  const sections = [
    {
      title: "Personal / Business Profile",
      icon: User,
      gradient: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/20",
      fields: [
        ["Full Name", ap.full_name],
        ["Business / Shop Name", ap.business_name || "—"],
        ["Partner Code", ap.partner_code],
        ["Mobile Number", ap.mobile],
        ["WhatsApp Number", ap.whatsapp || "—"],
        ["Email Address", ap.email],
        ["Partner Type", ap.partner_type.replace("_", " ")],
        ["Full Address", `${ap.address || ""}, ${ap.district || ""}, ${ap.state || ""} - ${ap.pin || ""}`],
      ],
    },
    {
      title: "Settlement Bank Details",
      icon: Landmark,
      gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20",
      fields: [
        ["Bank Name", ap.bank_name || "—"],
        ["Account Holder Name", ap.bank_account_name || "—"],
        ["Account Number", ap.bank_account_number || "—"],
        ["IFSC Code", ap.bank_ifsc || "—"],
        ["UPI ID", ap.upi_id || "—"],
      ],
    },
    {
      title: "KYC & Identifiers",
      icon: ShieldCheck,
      gradient: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20",
      fields: [
        ["Aadhaar Number", ap.aadhaar_number || "—"],
        ["PAN Number", ap.pan_number || "—"],
        ["GSTIN", ap.gstin || "—"],
        ["KYC Status", ap.kyc_status.toUpperCase()],
      ],
    },
    {
      title: "Nominee & Emergency Contact",
      icon: Heart,
      gradient: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/20",
      fields: [
        ["Emergency Mobile", ap.emergency_contact || "—"],
        ["Nominee Name", ap.nominee_name || "—"],
        ["Nominee Relation", ap.nominee_relation || "—"],
        ["Referral Source", ap.referral_source || "—"],
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-400">
              DigiPartner Profile
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              Partner Settings
            </h1>
            <p className="text-slate-400 text-sm">
              Review personal identification, settlement bank details, KYC compliance status, and security nominee settings.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider border ${
                ap.status === "active"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}
            >
              Status: {ap.status}
            </span>
          </div>
        </div>

        {/* Profile Info Cards */}
        <div className="grid gap-6">
          {sections.map((section) => (
            <Card
              key={section.title}
              className="border border-white/5 bg-slate-900/20 p-5 md:p-7 rounded-3xl backdrop-blur-md space-y-4"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5 pb-3 border-b border-white/5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border ${section.gradient.split(" ")[2]}`}>
                  <section.icon className="h-4 w-4" />
                </span>
                {section.title}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {section.fields.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-slate-950 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1.5 break-words font-semibold text-slate-200 text-sm">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {/* KYC Documents Panel */}
          <Card className="border border-white/5 bg-slate-900/20 p-5 md:p-7 rounded-3xl backdrop-blur-md space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              Verification Documents
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {kycDocs.length ? (
                kycDocs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950 p-4 hover:border-blue-500/20 transition-all duration-150"
                  >
                    <div className="space-y-0.5 truncate">
                      <span className="font-extrabold text-white text-xs block truncate capitalize">
                        {doc.document_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {doc.file_name}
                      </span>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold capitalize border shrink-0 ${
                        doc.status === "accepted"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : doc.status === "rejected"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </a>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500 col-span-2">
                  No verification proof documents uploaded. Contact support to submit KYC proof.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
