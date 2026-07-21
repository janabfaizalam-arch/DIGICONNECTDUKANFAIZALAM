import { AdminPartnerNotFound } from "@/components/admin/admin-partner-not-found";

/** Nested not-found for /admin/agency-partners/[id] — stays inside AdminShell. */
export default function AgencyPartnerDetailNotFound() {
  return <AdminPartnerNotFound reason="missing" />;
}
