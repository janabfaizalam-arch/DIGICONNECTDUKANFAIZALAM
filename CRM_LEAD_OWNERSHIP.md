# DigiConnect Dukan — CRM Lead Ownership (Phase 4 foundation)

Last updated: 2026-08-05  
Checkpoint label: **Phase 4 foundation** (not Phase 4 complete)

## Canonical source

**`public.leads`** is the operational source of truth for website, Digi Partner, walk-in, referral, field, WhatsApp-ready, Sheets-ready, and manual entry.

**`public.crm_leads`** remains a prototype Kanban store (readable via adapter only). New production writes must not target it. Demo seed data was removed from the pipeline API.

## Semantics

| Stage | Meaning |
|-------|---------|
| `application_created` | An application is linked / created from the lead |
| `won` | Commercially closed-won / converted (legacy status often `converted`) |
| `lost` | Terminal loss — **lost reason required** |

## Ownership rules

| Actor | Can view | Can create | Can reassign | Duplicate suggestions |
|-------|----------|------------|--------------|------------------------|
| Admin | All | Yes (`manual`) | Yes | Global (authorized) |
| Agency partner | Own `agent_id` / `assigned_to` / `partner_id` | Yes (`agency_partner`) | No (global) | **Own scope only** |
| Customer | No | Website form only | No | N/A |
| System ingest | N/A | website / whatsapp / sheets keys | N/A | N/A |

Ownership on partner ingest is derived from **authenticated `actorId`**, never from client-supplied partner UUIDs.

## Conflict resolution

1. **Ingestion idempotency** keyed by source (+ partner scope for AP) + mobile + service + day, or `source:ext:{externalId}`.
2. One partner **cannot** block another’s valid ingest for the same mobile/service/day.
3. Duplicate suggestions are **advisory** — never auto-merge.
4. Cross-partner duplicate matches are **not exposed** to partners.
5. Sheets remains outbound application/customer mirror — does not create leads (no sync loop).
6. WhatsApp inbound (future) must use provider message id as `externalId`.

## Remaining after foundation

- Transactional lead conversion
- Dedicated admin/AP lead operations UI
- Follow-up queues UX
- Live WhatsApp/Sheets adapters (ready, not activated)
