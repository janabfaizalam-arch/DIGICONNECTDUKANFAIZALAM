import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths, syncServiceCatalogAndAgentPortal, writeServiceAuditLog } from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { ids, action, pricingValue, commissionValue } = body;

    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ message: "No services selected." }, { status: 400 });
    }

    const { data: services, error: fetchError } = await supabase
      .from("services")
      .select("*")
      .in("id", ids);

    if (fetchError || !services) {
      return NextResponse.json({ message: fetchError?.message ?? "Error fetching services." }, { status: 500 });
    }

    const updatedSlugs: string[] = [];

    for (const service of services) {
      const updatePayload: {
        updated_at: string;
        status?: string;
        is_active?: boolean;
        sale_price?: number;
        base_price?: number;
        metadata?: Record<string, unknown> & {
          customer_fee?: number;
          agent_payout?: number;
        };
      } = { updated_at: new Date().toISOString() };
      let auditAction = "";
      let auditChanges: Record<string, unknown> = {};

      const metadata = service.metadata || {};
      const currentCustomerFee = Number(metadata.customer_fee || service.sale_price || service.base_price || 0);
      const currentAgentPayout = Number(metadata.agent_payout || 0);
      const currentPayoutType = metadata.payout_type || "fixed";
      const currentPayoutPercentage = Number(metadata.payout_percentage || 0);

      if (action === "enable") {
        updatePayload.status = "published";
        updatePayload.is_active = true;
        auditAction = "enable";
        auditChanges = { status: { old: service.status, new: "published" }, is_active: { old: service.is_active, new: true } };
      } else if (action === "disable") {
        updatePayload.status = "draft";
        updatePayload.is_active = false;
        auditAction = "disable";
        auditChanges = { status: { old: service.status, new: "draft" }, is_active: { old: service.is_active, new: false } };
      } else if (action === "archive") {
        updatePayload.status = "archived";
        updatePayload.is_active = false;
        auditAction = "archive";
        auditChanges = { status: { old: service.status, new: "archived" }, is_active: { old: service.is_active, new: false } };
      } else if (action === "update_pricing") {
        const val = Number(pricingValue);
        if (Number.isNaN(val) || val < 0) continue;
        updatePayload.sale_price = val;
        updatePayload.base_price = val;
        updatePayload.metadata = { ...metadata, customer_fee: val };
        auditAction = "price_change";
        auditChanges = { pricing: { old: currentCustomerFee, new: val } };
      } else if (action === "update_commission") {
        const val = Number(commissionValue);
        if (Number.isNaN(val) || val < 0) continue;
        updatePayload.metadata = { ...metadata, agent_payout: val };
        auditAction = "commission_change";
        auditChanges = { commission: { old: currentAgentPayout, new: val } };
      } else if (action === "delete") {
        // Hard delete services in bulk
        const { error: delError } = await supabase.from("services").delete().eq("id", service.id);
        if (!delError) {
          // Sync deletes
          await supabase.from("service_catalog").delete().eq("slug", service.slug);
          await supabase.from("agent_services").delete().eq("slug", service.slug);
          updatedSlugs.push(service.slug);
        }
        continue;
      } else if (action === "duplicate") {
        // Handled below sequentially
        continue;
      }

      if (Object.keys(updatePayload).length > 1) {
        const { error: updateError } = await supabase.from("services").update(updatePayload).eq("id", service.id);
        if (!updateError) {
          updatedSlugs.push(service.slug);

          // Get final sync variables
          const finalCustomerFee = updatePayload.metadata?.customer_fee !== undefined ? updatePayload.metadata.customer_fee : currentCustomerFee;
          const finalAgentPayout = updatePayload.metadata?.agent_payout !== undefined ? updatePayload.metadata.agent_payout : currentAgentPayout;
          const finalStatus = updatePayload.status !== undefined ? updatePayload.status : service.status;

          try {
            await syncServiceCatalogAndAgentPortal(supabase, service.slug, {
              title: service.title,
              description: service.short_description || "",
              category: service.category,
              customer_fee: finalCustomerFee,
              agent_payout: finalAgentPayout,
              payout_type: currentPayoutType,
              payout_percentage: currentPayoutPercentage,
              required_documents: service.documents || [],
              is_active: finalStatus === "published",
              sort_order: service.sort_order || 0,
            });
          } catch (syncError) {
            console.error(`[Bulk Sync] Failed for service ${service.slug}:`, syncError);
          }

          // Write audit log
          await writeServiceAuditLog(supabase, service.id, user.id, auditAction, auditChanges);
        }
      }
    }

    // Handle Bulk Duplication separately
    if (action === "duplicate") {
      for (const service of services) {
        const copySlug = `${service.slug}-copy-${Date.now().toString(36)}`;
        const { data: copied, error: copyError } = await supabase
          .from("services")
          .insert({
            title: `${service.title} Copy`,
            slug: copySlug,
            short_description: service.short_description,
            overview: service.overview,
            full_description: service.full_description,
            benefits: service.benefits,
            documents: service.documents,
            process: service.process,
            old_price: service.old_price,
            offer_price: service.offer_price,
            base_price: service.base_price,
            sale_price: service.sale_price,
            price_label: service.price_label,
            cta_type: service.cta_type,
            badge: service.badge,
            icon: service.icon,
            status: "draft",
            is_active: false,
            featured: false,
            is_featured: false,
            show_on_homepage: false,
            created_by: user.id,
            updated_by: user.id,
            metadata: {
              ...(service.metadata || {}),
              payout_type: service.metadata?.payout_type || "fixed",
              payout_percentage: service.metadata?.payout_percentage || 0,
              agent_payout: service.metadata?.agent_payout || 0,
              customer_fee: service.metadata?.customer_fee || service.sale_price || 0,
            },
          })
          .select("id, slug")
          .single();

        if (!copyError && copied) {
          updatedSlugs.push(copied.slug);
          // Log duplicate
          await writeServiceAuditLog(supabase, copied.id, user.id, "duplicate", { original_id: service.id });
        }
      }
    }

    // Revalidate paths for updated services
    for (const slug of updatedSlugs) {
      revalidateServicePaths(slug);
    }

    return NextResponse.json({ message: `Bulk action '${action}' completed successfully.` });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }
}
