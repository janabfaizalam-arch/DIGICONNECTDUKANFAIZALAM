# CRM Permission Matrix

Date: 2026-08-05  
Canonical runtime roles: `admin` | `agency_partner` | `customer`  
Finer job titles (Owner, Manager, Counter, Accountant) are **UI/capability aliases** mapped onto `admin` until a dedicated role migration is approved.

Legend: **Y** = allowed · **N** = denied · **S** = scoped (own / assigned / created)

| Capability | Admin | Agency Partner | Customer |
|------------|:-----:|:--------------:|:--------:|
| `customers.view` | Y | S | self |
| `customers.create` | Y | S | N (self-signup only) |
| `customers.edit` | Y | S | self (limited) |
| `customers.merge` | Y | N | N |
| `applications.view` | Y | S | self |
| `applications.create` | Y | S | self (website) |
| `applications.status_change` | Y | S (workflow) | N |
| `applications.assign` | Y | N | N |
| `payments.view` | Y | S | self |
| `payments.edit` | Y | S (collect) | N |
| `documents.view` | Y | S | self (visible) |
| `documents.upload` | Y | S | self (permitted) |
| `exports.run` | Y | N | N |
| `staff.manage` | Y | team (CEO types) | N |
| `roles.manage` | Y | N | N |
| `services.manage` | Y | N | N |
| `integrations.manage` | Y | N | N |
| `analytics.view` | Y | S | N |
| `audit.view` | Y | N | N |
| `leads.view` | Y | S | N |
| `leads.convert` | Y | S | N |
| `messaging.view` | Y | N | N |
| `messaging.resend` | Y | N | N |
| `messaging.cancel` | Y | N | N |
| `walk_in.create` | Y | Y | N |

### Phase 3 notes
- Walk-in application API requires `applications.create` **and** `walk_in.create`.
- Price override requires `payments.edit` + non-empty reason; amount still resolved server-side from `agent_services`.
- Assignment at create: admin may pass `assigneeUserId` (`applications.assign`); partners cannot assign outside scope and cannot set arbitrary global assignees via this path.
- Default when no rule/assignee: **Unassigned** queue (`assigned_agent_id` null + assignment history reason `unassigned_queue`).
- WhatsApp manual resend requires `messaging.resend` (admin only in matrix).
- Limitation: finer staff roles are not first-class DB roles yet — do not invent fake roles; extend via additive migration later.

### Phase 4 foundation notes
- Canonical ops on `public.leads`; `crm_leads` read adapter only.
- Partner ingest ownership derived from authenticated actor — client cannot spoof `partner_id`.
- Duplicate suggestions for partners are scope-filtered (no cross-partner PII).
- Partner lead reassignment remains admin-capability gated (`applications.assign` / `staff.manage`).
- Customers have no lead portal access.

### Phase 4 conversion notes
- Convert requires `leads.convert` + lead ownership scope for partners.
- Existing customer match requires explicit `existingCustomerId` (admin/partner-visible only).
- Cross-partner customer matches are not exposed.
- Convert RPC is `service_role` only; Next.js authZ is mandatory before call.
- Terminal Lost cannot convert without authorized reopen transition.

### Phase 5A communications notes
- Outbox list/retry/cancel/explicit resend: admin only (`messaging.view` / `messaging.resend` / `messaging.cancel`).
- Partners do **not** see other partners’ messages (no partner messaging list capability).
- Customers must not see internal provider errors or retry details.
- Cron `/api/cron/comms-outbox` uses Bearer `COMMS_CRON_SECRET` or `CRON_SECRET` — not session cookies.
- Webhook uses `AISENSY_WEBHOOK_SECRET` (shared secret; no invented signature).

Enforcement: `src/lib/crm/permissions.ts` + existing route gates + RLS. Hiding UI is not sufficient.
