/**
 * Homepage WhatsApp boundary notes
 *
 * Click-to-WhatsApp CTAs on the homepage use public `wa.me` links via
 * `@/lib/whatsapp` helpers (`buildWhatsAppUrl`, `buildSupportWhatsAppMessage`).
 * They must never call the Meta WhatsApp Cloud API from the browser.
 *
 * The server-side client (`src/lib/whatsapp/client.ts`) is the only place
 * that may use META_WHATSAPP_* credentials for OTP and application notifications.
 *
 * Future homepage-driven messaging (lead capture, review request, missing-doc
 * reminders) should:
 * 1. Create a CRM / support lead through an authenticated API route
 * 2. Enqueue a server job that calls `sendWhatsAppTemplate` with approved templates
 * 3. Validate webhooks with shared-secret / signature checks and idempotency keys
 * 4. Avoid logging message bodies that contain personal data
 *
 * Do not activate production template sends until credentials and templates are approved.
 */

export const HOMEPAGE_WHATSAPP_BOUNDARY = "wa.me-cta-only" as const;
