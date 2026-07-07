import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SEED_SERVICES, SEED_PACKAGES } from "@/lib/services-v5-data";

export async function POST() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Database client unavailable." }, { status: 500 });
  }

  try {
    // 1. Seed Categories if not exist
    const categories = ["TAX", "gov-id", "banking", "licence", "company", "insurance", "cards"];
    for (const cat of categories) {
      const { data: catExists } = await supabase.from("service_categories").select("id").eq("slug", cat.toLowerCase()).maybeSingle();
      if (!catExists) {
        await supabase.from("service_categories").insert({
          name: cat,
          slug: cat.toLowerCase(),
          description: `${cat} Services`,
          sort_order: 10,
          is_active: true
        });
      }
    }

    // 2. Seed Services
    for (const seed of SEED_SERVICES) {
      const { data: catRow } = await supabase.from("service_categories").select("id").eq("slug", seed.category.toLowerCase()).maybeSingle();
      const catId = catRow?.id || null;

      const servicePayload = {
        slug: seed.slug,
        name: seed.name,
        title: seed.name,
        description: seed.description,
        category: seed.category,
        category_id: catId,
        sub_category: seed.sub_category,
        icon: seed.icon,
        banner_url: seed.banner_url || null,
        color_theme: seed.color_theme,
        animation_key: seed.animation_key,
        popular: seed.popular || false,
        trending: seed.trending || false,
        recommended: seed.recommended || false,
        is_new: seed.is_new || false,
        is_government: seed.is_government || false,
        is_private: seed.is_private || false,
        original_price: seed.original_price,
        selling_price: seed.selling_price,
        agent_cost: seed.agent_cost,
        partner_payout: seed.partner_payout,
        wallet_cashback: seed.wallet_cashback,
        wallet_redeem_allowed: seed.wallet_redeem_allowed !== false,
        gst_included: seed.gst_included || false,
        gst_percentage: seed.gst_percentage || 18.00,
        enquiry_only: seed.enquiry_only || false,
        apply_online: seed.apply_online || true,
        emi_allowed: seed.emi_allowed || false,
        cod_allowed: seed.cod_allowed || false,
        target_financial: seed.target_financial || false,
        target_business: seed.target_business || false,
        target_personal: seed.target_personal || false,
        target_professional: seed.target_professional || false,
        target_student: seed.target_student || false,
        target_senior_citizen: seed.target_senior_citizen || false,
        target_women: seed.target_women || false,
        target_farmer: seed.target_farmer || false,
        target_business_owner: seed.target_business_owner || false,
        target_nri: seed.target_nri || false,
        overview: seed.overview,
        benefits: seed.benefits,
        features: seed.features,
        eligibility: seed.eligibility,
        who_should_apply: seed.who_should_apply,
        who_should_not_apply: seed.who_should_not_apply,
        advantages: seed.advantages,
        disadvantages: seed.disadvantages,
        timeline: seed.timeline,
        validity: seed.validity,
        renewal: seed.renewal,
        penalty: seed.penalty,
        professional_fees: seed.professional_fees,
        government_fees: seed.government_fees,
        refund_policy: seed.refund_policy,
        cancellation_policy: seed.cancellation_policy,
        checklist_url: seed.checklist_url || null,
        sample_certificate_url: seed.sample_certificate_url || null,
        department: seed.department,
        act: seed.act,
        rules: seed.rules,
        important_notes: seed.important_notes,
        video_url: seed.video_url || null,
        pdf_url: seed.pdf_url || null,
        faqs: seed.faqs,
        customer_reviews: seed.customer_reviews,
        government_links: seed.government_links,
        latest_updates: seed.latest_updates,
        ratings: 4.8,
        status: "published",
        is_active: true
      };

      // Check if service already exists
      const { data: existingService } = await supabase.from("services").select("id").eq("slug", seed.slug).maybeSingle();
      let serviceId: string;

      if (existingService) {
        serviceId = existingService.id;
        const { error: updateErr } = await supabase.from("services").update(servicePayload).eq("id", serviceId);
        if (updateErr) throw new Error(`Update services failed: ${updateErr.message}`);
      } else {
        const { data: newService, error: insertErr } = await supabase.from("services").insert(servicePayload).select("id").single();
        if (insertErr || !newService) throw new Error(`Insert service failed: ${insertErr?.message}`);
        serviceId = newService.id;
      }

      // Sync Variants
      await supabase.from("service_variants").delete().eq("service_id", serviceId);
      for (const variant of seed.variants) {
        const { error: varErr } = await supabase.from("service_variants").insert({
          service_id: serviceId,
          slug: variant.slug,
          name: variant.name,
          description: variant.description,
          original_price: variant.original_price,
          selling_price: variant.selling_price,
          offer_price: variant.offer_price,
          agent_cost: variant.agent_cost,
          partner_payout: variant.partner_payout,
          wallet_cashback: variant.wallet_cashback,
          wallet_redeem_allowed: variant.wallet_redeem_allowed,
          gst_included: variant.gst_included,
          gst_percentage: variant.gst_percentage,
          timeline: variant.timeline,
          government_fees: variant.government_fees,
          professional_fees: variant.professional_fees,
          required_documents: variant.required_documents,
          form_fields: variant.form_fields,
          is_active: true
        });
        if (varErr) throw new Error(`Insert variant failed: ${varErr.message}`);
      }

      // Sync Comparisons
      await supabase.from("service_comparisons").delete().eq("service_id", serviceId);
      for (const comp of seed.comparisons) {
        const { error: compErr } = await supabase.from("service_comparisons").insert({
          service_id: serviceId,
          title: comp.title,
          description: comp.description,
          headers: comp.headers,
          rows: comp.rows,
          is_active: true
        });
        if (compErr) throw new Error(`Insert comparison failed: ${compErr.message}`);
      }
    }

    // 3. Seed Packages
    for (const pkg of SEED_PACKAGES) {
      const packagePayload = {
        slug: pkg.slug,
        name: pkg.name,
        description: pkg.description,
        original_price: pkg.original_price,
        selling_price: pkg.selling_price,
        agent_cost: pkg.agent_cost,
        partner_payout: pkg.partner_payout,
        wallet_cashback: pkg.wallet_cashback,
        items: pkg.items,
        is_active: true
      };

      const { data: existingPkg } = await supabase.from("service_packages").select("id").eq("slug", pkg.slug).maybeSingle();
      if (existingPkg) {
        await supabase.from("service_packages").update(packagePayload).eq("id", existingPkg.id);
      } else {
        await supabase.from("service_packages").insert(packagePayload);
      }
    }

    return NextResponse.json({ ok: true, message: "V5 Database Enterprise catalog seeded successfully." });
  } catch (error) {
    console.error("[seed-v5] Seeding failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
