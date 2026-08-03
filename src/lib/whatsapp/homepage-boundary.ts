/**
 * Homepage WhatsApp / AiSensy boundary notes
 *
 * Click-to-WhatsApp CTAs on the homepage use public `wa.me` links via
 * `@/lib/whatsapp` helpers (`buildWhatsAppUrl`, `buildSupportWhatsAppMessage`).
 * They must never call the AiSensy Campaign API from the browser.
 *
 * Server-side AiSensy (`src/lib/whatsapp/aisensy.ts`) remains the only place
 * that may use AISENSY_* credentials for OTP and application notifications.
 *
 * Future homepage-driven messaging (lead capture, review request, missing-doc
 * reminders) should:
 * 1. Create a CRM / support lead through an authenticated API route
 * 2. Enqueue a server job that calls `sendAisensyCampaign` with approved templates
 * 3. Validate webhooks with shared-secret / signature checks and idempotency keys
 * 4. Avoid logging message bodies that contain personal data
 *
 * Do not activate production campaign sends until credentials and templates are approved.
 */

export const HOMEPAGE_WHATSAPP_BOUNDARY = "wa.me-cta-only" as const;
