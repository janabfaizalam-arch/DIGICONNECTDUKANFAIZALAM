# Supabase Migration Audit — DigiConnect Dukan

> **Audit Date**: 2026-06-15
> **Auditor**: Automated codebase analysis
> **Total Migrations**: 62

---

## Classification Summary

| Category | Count | Action |
|----------|-------|--------|
| REQUIRED (Core) | 43 | Keep — actively used by production |
| REQUIRED (Service Seeding) | 10 | Keep — seeds active services |
| LEGACY (Superseded) | 9 | Keep in `migrations/` — copies archived to `migrations_archive/` |
| DUPLICATE | 0 | None found |
| SAFE TO REMOVE | 0 | None — Supabase migrations are append-only |

---

## REQUIRED — Core Migrations (43)

| Timestamp | Filename | Objects |
|-----------|----------|---------|
| 20260430080000 | `create_profiles` | `profiles`, `users`, `services`, `applications`, `application_documents`, `payments`, `invoices`, `leads`, `service_categories` |
| 20260430090000 | `crm_agent_commissions` | `customers`, `service_catalog`, `commissions`, `status_logs`, `current_app_role()`, `is_admin_role()`, `is_agent_role()` |
| 20260430100000 | `agent_management_update` | profiles agent columns, super_admin seed |
| 20260501090000 | `agent_panel` | leads/applications agent columns + RLS |
| 20260501100000 | `gallery_management` | `gallery_images`, gallery storage bucket |
| 20260501110000 | `staff_panel` | staff columns, `is_staff_role()`, staff RLS |
| 20260504110000 | `customer_profiles` | `customer_profiles` + RLS + trigger |
| 20260505120000 | `admin_crm_cms` | lead CRM columns, `customer_notes`, `articles` |
| 20260506090000 | `digiwallet_cashback` | `wallets`, `cashback_campaigns`, `wallet_transactions`, `cashback_history`, wallet functions |
| 20260508143000 | `homepage_slides` | `homepage_slides` + storage bucket |
| 20260508190000 | `razorpay_payment_fields` | Razorpay columns + indexes on payments |
| 20260509100000 | `services_cms` | Service CMS columns + categories RLS |
| 20260512053205 | `remote_schema` | `admin_notes`, `notifications`, `ratings` + schema sync |
| 20260512143000 | `homepage_notices` | `homepage_notices` + RLS |
| 20260513100000 | `insurance_quotations` | `insurance_quotations` + RPC |
| 20260513123000 | `admin_notifications` | `admin_notifications` + RLS |
| 20260514130000 | `secure_referral_reward_wallet` | `reward_wallets`, canonical `wallet_transactions`, `referral_events`, `reward_audit_logs` + all canonical reward functions |
| 20260516110000 | `reward_wallet_e2e_repair` | Wallet schema repair + diagnostics view + backfill |
| 20260516123000 | `crm_payment_application_consistency` | CRM payment consistency fixes |
| 20260516133000 | `admin_crm_rebuild_diagnostics` | Admin CRM diagnostics |
| 20260516170000 | `razorpay_reconciliation` | Razorpay reconciliation logic |
| 20260517100000 | `canonical_reward_wallet_rules` | Canonical reward rules |
| 20260517113000 | `service_cms_page_builder` | Service CMS page builder columns |
| 20260517143000 | `agent_creation_profiles` | Agent profile creation |
| 20260517170000 | `agent_panel_workflow` | Agent panel workflow |
| 20260517183000 | `application_detail_canonical_data` | Application detail normalization |
| 20260518120000 | `three_role_security_hardening` | Three-role security RLS |
| 20260518143000 | `admin_application_detail_repair` | Admin application detail |
| 20260518173000 | `deep_audit_staff_security_indexes` | `application_status_logs` + staff indexes |
| 20260518183000 | `repair_staff_status_log_actor_column` | `actor_id` on status logs |
| 20260518190000 | `admin_applications_command_center_indexes` | Command center indexes |
| 20260518193000 | `offline_invoices` | `offline_invoices` table |
| 20260519120000 | `admin_control_room_identity_wallet_hardening` | Identity sync + indexes |
| 20260520100000 | `customer_signup_identity_uniqueness` | Identity compatibility |
| 20260520113000 | `remove_broken_identity_triggers` | Trigger cleanup |
| 20260520120000 | `master_production_stability` | Master repair + `claim_customer_applications()` |
| 20260520150000 | `agent_service_management` | `agent_services` table |
| 20260522120000 | `customer_oauth_mobile_location` | OAuth columns |
| 20260522190000 | `homepage_offer_strip_about_images` | `site_section_settings`, `homepage_offer_banners`, `about_page_images` |
| 20260523180500 | `application_documents_customer_flow_rls` | Document RLS repair |
| 20260524120000 | `application_documents_file_upload_repair` | Upload RLS hardening |
| 20260527140000 | `agency_partner_ecosystem` | `agency_partners`, `ap_agent_memberships`, `ap_commission_rules`, `ap_wallet_transactions`, `payout_requests` |
| 20260604120000 | `wallet_dual_cap_cashback_at_payment` | `process_rewards_on_payment_verified()` + dual 50% cap |

## REQUIRED — Service Seeding Migrations (10)

| Timestamp | Filename | Service |
|-----------|----------|---------|
| 20260520173000 | `pm_vishwakarma_agent_service` | PM Vishwakarma |
| 20260520183000 | `remove_pan_update_driving_licence` | PAN removal + DL update |
| 20260520190000 | `add_cibil_credit_health_service` | CIBIL Credit Health |
| 20260522133000 | `add_eshram_card_registration_service` | e-Shram Card |
| 20260522154500 | `seed_cibil_eshram_agent_services` | CIBIL + e-Shram agent config |
| 20260530183500 | `add_pvc_card_printing_service` | PVC Card Printing |
| 20260611100000 | `print_system` | Print printers + print jobs |
| 20260611110000 | `recover_stuck_claimed_jobs` | Print job claim recovery |
| 20260612110000 | `add_csc_olympiad_service` | CSC Olympiad |
| 20260613000000 | `ds_os_foundation` | DigiPartner DS-OS (pre-deployment) |

## LEGACY — Superseded Migrations (9)

| Timestamp | Filename | Superseded By |
|-----------|----------|---------------|
| 20260508120000 | `referral_reward_wallet_cashback` | `20260514130000` + `20260516110000` |
| 20260508130000 | `fix_referral_code_digest` | `20260508131000` |
| 20260508131000 | `fix_referral_code_digest_schema` | `20260514130000` |
| 20260508132000 | `fix_reward_identity_trigger_service_role` | `20260520113000` |
| 20260512130000 | `wallet_cashback_referral_direct_credit` | `20260514130000` |
| 20260518160000 | `deprecate_legacy_agent_panel` | `20260517170000` |
| 20260519133000 | `three_role_architecture_cleanup` | Applied data migration |
| 20260520114500 | `safe_claim_customer_applications` | `20260520120000` |
| 20260527163000 | `fix_profiles_role_constraint` | Applied constraint fix |

> **Note**: All LEGACY migrations remain in `supabase/migrations/`. Copies archived to `supabase/migrations_archive/` with `MANIFEST.md`.

---

## Dependency Graph — Key Tables

```
auth.users
├── profiles (id → auth.users.id)
│   ├── reward_wallets (user_id → profiles.id)
│   ├── referral_events (referrer/referred → profiles.id)
│   └── agency_partners (owner_user_id → profiles.id)
├── users (id → auth.users.id)
├── customer_profiles (id → auth.users.id)
├── applications (user_id → auth.users.id)
│   ├── application_documents (application_id → applications.id)
│   ├── payments (application_id → applications.id)
│   ├── invoices (application_id → applications.id)
│   ├── admin_notes (application_id → applications.id)
│   ├── notifications (application_id → applications.id)
│   ├── ratings (application_id → applications.id)
│   ├── commissions (application_id → applications.id)
│   ├── status_logs (application_id → applications.id)
│   └── wallet_transactions (application_id → applications.id)
├── customers (user_id/created_by → auth.users.id)
│   └── customer_notes (customer_id → customers.id)
├── wallets (user_id → auth.users.id)
├── leads (agent_id → auth.users.id)
└── services (standalone)
    ├── service_categories (category_id → service_categories.id)
    ├── service_catalog (standalone, synced from services)
    └── agent_services (service_id → services.id)

Standalone tables:
├── homepage_slides
├── homepage_notices
├── homepage_offer_banners
├── about_page_images
├── site_section_settings
├── gallery_images
├── articles
├── insurance_quotations
├── admin_notifications
├── offline_invoices
├── print_printers
├── print_jobs
└── cashback_campaigns
```
