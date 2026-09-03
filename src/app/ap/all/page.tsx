import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { apNavGroups } from "@/lib/ap/nav";
import { canManagePartnerTeam } from "@/lib/ap/partner-type";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Everything the panel can do, on one screen.
 *
 * "Kuchh feature kahin hain, kuchh kahin, kuchh dikh hi nahin rahe" — the
 * screens existed, the doors did not. The sidebar and the phone's sheet solve
 * that while you are working; this is the page you open when you cannot
 * remember what the panel even has, and it is why every item in the map
 * carries a sentence rather than only a label.
 *
 * A half-wired screen says so here, in plain words. Being led into one is
 * worse than being told about it.
 */
export default async function ApDirectoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const partner = await getAgencyPartnerByUserId(user.id);
  const groups = apNavGroups({ canManageTeam: canManagePartnerTeam(partner?.partner_type) });
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--dc-flame)]">
            Digi Partner
          </p>
          <h1 className="mt-1.5 text-[1.6rem] font-black tracking-tight text-slate-900 sm:text-[2rem]">
            Sab kuch, ek jagah
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] font-medium leading-relaxed text-slate-600">
            Aapke panel ke {total} section — har ek ke saath ek line, ki wo hai kis kaam ke liye.
            Yaad na aaye to yahin se dhoond lijiye.
          </p>
        </header>

        {groups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section key={group.id} className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <GroupIcon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-black text-slate-900">{group.label}</h2>
                  <p className="text-[12.5px] font-medium text-slate-500">{group.blurb}</p>
                </div>
              </div>

              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex h-full min-h-[64px] items-start gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.995]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Icon className="h-4.5 w-4.5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-bold text-slate-900">{item.label}</span>
                          <span className="mt-0.5 block text-[12px] font-medium leading-snug text-slate-500">
                            {item.description}
                          </span>
                          {item.partial ? (
                            <span className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-amber-700">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                              {item.partial}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
