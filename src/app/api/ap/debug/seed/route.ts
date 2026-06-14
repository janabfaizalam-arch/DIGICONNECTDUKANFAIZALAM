import { NextResponse } from "next/server";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database service unavailable." }, { status: 500 });
    }

    // 1. Seed or update GST Registration service in public.services
    let serviceId: string;
    const { data: existingService } = await supabase
      .from("services")
      .select("id")
      .eq("slug", "gst-registration")
      .maybeSingle();

    if (existingService) {
      serviceId = existingService.id;
      await supabase
        .from("services")
        .update({
          name: "GST Registration Service",
          description: "New GST Identification Number registration for firms and individuals.",
          base_customer_fee: 500.00,
          tat_hours: 72,
          metadata: { category: "Taxation", is_dynamic: true }
        })
        .eq("id", serviceId);
    } else {
      const { data: newService, error: insertErr } = await supabase
        .from("services")
        .insert({
          slug: "gst-registration",
          name: "GST Registration Service",
          description: "New GST Identification Number registration for firms and individuals.",
          base_customer_fee: 500.00,
          tat_hours: 72,
          metadata: { category: "Taxation", is_dynamic: true }
        })
        .select("id")
        .single();

      if (insertErr || !newService) {
        throw new Error("Failed to seed GST registration service: " + insertErr?.message);
      }
      serviceId = newService.id;
    }

    // 2. Clear old fields and workflows to rewrite them
    await supabase.from("service_fields").delete().eq("service_id", serviceId);
    await supabase.from("service_workflows").delete().eq("service_id", serviceId);

    // 3. Seed dynamic field configuration registry (Service Fields)
    const fieldsToInsert = [
      {
        service_id: serviceId,
        field_key: "business_name",
        label: "Trade/Business Name",
        field_type: "text",
        sort_order: 1,
        validation_chains: [
          { rule: "required", msg: "Business name is required." },
          { rule: "minLength", val: 3, msg: "Business name must be at least 3 characters." }
        ]
      },
      {
        service_id: serviceId,
        field_key: "proprietor_name",
        label: "Proprietor Full Name",
        field_type: "text",
        sort_order: 2,
        validation_chains: [
          { rule: "required", msg: "Proprietor name is required." }
        ]
      },
      {
        service_id: serviceId,
        field_key: "mobile_number",
        label: "Contact Mobile",
        field_type: "mobile",
        sort_order: 3,
        validation_chains: [
          { rule: "required", msg: "Mobile number is required." },
          { rule: "mobile" }
        ]
      },
      {
        service_id: serviceId,
        field_key: "email_address",
        label: "Contact Email",
        field_type: "email",
        sort_order: 4,
        validation_chains: [
          { rule: "required", msg: "Email address is required." },
          { rule: "email" }
        ]
      },
      {
        service_id: serviceId,
        field_key: "proprietor_pan",
        label: "Proprietor PAN Card Number",
        field_type: "pan",
        sort_order: 5,
        validation_chains: [
          { rule: "required", msg: "PAN number is required." },
          { rule: "pan" }
        ]
      },
      {
        service_id: serviceId,
        field_key: "proprietor_aadhaar",
        label: "Proprietor Aadhaar Number",
        field_type: "aadhaar",
        sort_order: 6,
        validation_chains: [
          { rule: "required", msg: "Aadhaar number is required." },
          { rule: "aadhaar" }
        ]
      },
      {
        service_id: serviceId,
        field_key: "business_address",
        label: "Business Address",
        field_type: "address",
        sort_order: 7,
        validation_chains: [
          { rule: "required", msg: "Business address is required." }
        ]
      },
      {
        service_id: serviceId,
        field_key: "pan_card_doc",
        label: "Upload PAN Card Copy",
        field_type: "file_upload",
        sort_order: 8,
        validation_chains: [
          { rule: "required", msg: "Please upload a copy of the PAN card." }
        ]
      },
      {
        service_id: serviceId,
        field_key: "aadhaar_doc",
        label: "Upload Aadhaar Card Copy",
        field_type: "file_upload",
        sort_order: 9,
        validation_chains: [
          { rule: "required", msg: "Please upload a copy of the Aadhaar card." }
        ]
      }
    ];

    const { error: fieldsErr } = await supabase.from("service_fields").insert(fieldsToInsert);
    if (fieldsErr) {
      throw new Error("Failed to insert fields: " + fieldsErr.message);
    }

    // 4. Seed status workflows steps (State Machines)
    const workflowsToInsert = [
      {
        service_id: serviceId,
        step_key: "submitted",
        label: "Submitted",
        sort_order: 1,
        allowed_transitions: ["in_process", "rejected"]
      },
      {
        service_id: serviceId,
        step_key: "in_process",
        label: "Under Review",
        sort_order: 2,
        allowed_transitions: ["completed", "rejected"]
      },
      {
        service_id: serviceId,
        step_key: "completed",
        label: "Completed",
        sort_order: 3,
        allowed_transitions: []
      },
      {
        service_id: serviceId,
        step_key: "rejected",
        label: "Rejected",
        sort_order: 4,
        allowed_transitions: []
      }
    ];

    const { error: workflowsErr } = await supabase.from("service_workflows").insert(workflowsToInsert);
    if (workflowsErr) {
      throw new Error("Failed to insert workflows: " + workflowsErr.message);
    }

    // 5. Seed Rules-based Commission structures
    // Clear old commission rules for this service first
    const { data: oldRules } = await supabase
      .from("commission_rules")
      .select("id")
      .eq("service_id", serviceId);

    if (oldRules && oldRules.length > 0) {
      const ruleIds = oldRules.map((r) => r.id);
      await supabase.from("commission_slabs").delete().in("rule_id", ruleIds);
      await supabase.from("commission_rules").delete().in("id", ruleIds);
    }

    // Insert new slab rule
    const { data: newRule, error: ruleErr } = await supabase
      .from("commission_rules")
      .insert({
        name: "GST Registration Slab-Based Payout",
        description: "Volume-based incentive slabs for GST Registration applications.",
        scope_type: "service",
        service_id: serviceId,
        rule_type: "slab",
        is_active: true,
        priority: 10,
        metadata: { basis: "volume_count" }
      })
      .select("id")
      .single();

    if (ruleErr || !newRule) {
      throw new Error("Failed to insert commission rule: " + ruleErr?.message);
    }

    // Insert slabs
    const slabsToInsert = [
      {
        rule_id: newRule.id,
        min_volume: 1,
        max_volume: 5,
        commission_amount: 100.00
      },
      {
        rule_id: newRule.id,
        min_volume: 6,
        max_volume: 20,
        commission_amount: 150.00
      },
      {
        rule_id: newRule.id,
        min_volume: 21,
        max_volume: null, // Unlimited
        commission_amount: 200.00
      }
    ];

    const { error: slabsErr } = await supabase.from("commission_slabs").insert(slabsToInsert);
    if (slabsErr) {
      throw new Error("Failed to insert slabs: " + slabsErr.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Database seeded successfully with dynamic GST Registration configurations.",
      serviceId
    });
  } catch (err: unknown) {
    console.error("[seed] error:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
