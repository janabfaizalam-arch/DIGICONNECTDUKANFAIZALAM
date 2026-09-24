import { ApContentShell } from "@/components/ap/ap-content-shell";
import { ApSidebar } from "@/components/ap/ap-sidebar";
import { APPanelNav } from "@/components/ap/ap-panel-nav";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { canManagePartnerTeam } from "@/lib/ap/partner-type";
import { getCurrentUser } from "@/lib/auth";

/**
 * The DC Partner shell.
 *
 * A top bar for identity and search, a sidebar on a computer for the whole
 * map, and a dock plus a "Sab kuch" sheet on a phone. The partner's type is
 * resolved once, here, so the team section appears for the partners who have
 * a team and for nobody else — rather than each screen deciding for itself.
 */
export default async function APLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const partner = user ? await getAgencyPartnerByUserId(user.id) : null;
  const canManageTeam = canManagePartnerTeam(partner?.partner_type);

  return (
    // data-dcp scopes the panel's design system (see globals.css). Everything
    // inside gets the tinted surface ladder, IBM Plex Sans and the focus ring;
    // nothing outside the panel is touched.
    <div data-dcp>
      <APPanelNav canManageTeam={canManageTeam} />
      <div className="mx-auto flex w-full max-w-[1600px]">
        <ApSidebar canManageTeam={canManageTeam} />
        <ApContentShell>{children}</ApContentShell>
      </div>
    </div>
  );
}
