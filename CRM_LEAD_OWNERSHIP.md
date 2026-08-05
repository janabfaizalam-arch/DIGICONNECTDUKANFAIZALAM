# DigiConnect Dukan — CRM Lead Ownership (Phase 4)

Last updated: 2026-08-05  
Status: **Phase 4 implementation ready locally** (completion commit pending approval)

## Canonical source

**`public.leads`** is the operational source of truth for website, Digi Partner, walk-in, referral, field, WhatsApp-ready, Sheets-ready, and manual entry.

**`public.crm_leads`** remains a prototype Kanban store (readable via adapter only). New production writes must not target it. Demo seed data was removed from the pipeline API.

## Semantics

| Stage | Meaning |
|-------|---------|
| `application_created` | Application linked/created from lead workflow (pre-won) |
| `won` | Terminal converted success (legacy status often `converted`) |
| `lost` | Terminal loss — **lost reason required** |

Conversion RPC marks leads `pipeline_stage = won` + `status = converted` atomically with application create.

## Ownership rules

| Actor | Can view | Can create | Can reassign | Duplicate suggestions | Convert |
|-------|----------|------------|--------------|------------------------|---------|
| Admin | All | Yes (`manual`) | Yes | Global (authorized) | Yes |
| Agency partner | Own `agent_id` / `assigned_to` / `partner_id` | Yes (`agency_partner`) | No (global) | **Own scope only** | Yes (own leads) |
| Customer | No | Website form only | No | N/A | N/A |
| System ingest | N/A | website / whatsapp / sheets keys | N/A | N/A | N/A |

Ownership on partner ingest/convert is derived from **authenticated `actorId`**, never from client-supplied partner UUIDs.

## Conflict resolution

1. **Ingestion idempotency** keyed by source (+ partner scope for AP) + mobile + service + day, or `source:ext:{externalId}`.
2. One partner **cannot** block another’s valid ingest for the same mobile/service/day.
3. Duplicate suggestions are **advisory** — never auto-merge.
4. Cross-partner duplicate matches are **not exposed** to partners.
5. Customer mobile matches require **explicit authorized link** before conversion; silent auto-link is forbidden.
6. Cross-partner customer matches are not revealed to partners (generic failure / no matched id).
7. Sheets remains outbound application/customer mirror — does not create leads (no sync loop). DB is authoritative for leads.
8. WhatsApp inbound (ready, inactive) must use provider message id as `externalId`.

## Follow-up queues

- Overdue / today / upcoming computed server-side.
- Today/upcoming use Asia/Kolkata calendar-day bounds.
- Display formatting uses `Asia/Kolkata`.
- DB timestamps remain `timestamptz` (UTC storage).

## Env names only (inactive inbound)

- AiSensy / WhatsApp webhook secrets (reuse existing conventions) — **do not enable live**
- `GOOGLE_SHEETS_*` for outbound CRM sync — do **not** enable Sheets→leads writers

## Remaining before production enablement

- Apply migrations on a staging environment first
- Explicit approval for push / deploy / live webhooks
