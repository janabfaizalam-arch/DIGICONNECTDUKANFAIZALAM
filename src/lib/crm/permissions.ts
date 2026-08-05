import "server-only";

import { getCurrentUser, getCurrentUserRole, type AppRole } from "@/lib/auth";
import {
  capabilitiesForRole,
  roleHasCapability,
  type CrmCapability,
} from "@/lib/crm/permissions-core";

export type { CrmCapability };
export { capabilitiesForRole, roleHasCapability };

export async function currentUserHasCapability(capability: CrmCapability): Promise<{
  ok: boolean;
  role: AppRole | string | null;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, role: null };
  const role = await getCurrentUserRole(user);
  return { ok: roleHasCapability(role, capability), role };
}
