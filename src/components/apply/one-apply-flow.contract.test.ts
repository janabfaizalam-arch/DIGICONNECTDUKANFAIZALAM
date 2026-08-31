import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  collectApplyAnswers,
  toApplyFields,
  validateApplyFields,
  type ServiceFieldRow,
} from "@/lib/apply/fields";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();
const code = readCode;

const route = code("src/app/apply/[slug]/page.tsx");
const shared = code("src/components/apply/shared.ts");
const hook = code("src/components/apply/use-apply-flow.ts");
const step = code("src/components/apply/step-customer.tsx");
const loader = code("src/lib/apply/service-fields.ts");
const adminTabs = code("src/components/admin/admin-engine-config-tabs.tsx");
const engineApi = code("src/app/api/admin/services/[id]/engine/route.ts");

/* ─────────────────────────────────────────────────────────────────────────
   One flow
   ───────────────────────────────────────────────────────────────────────── */

/**
 * There were four ways to file an application: the shared flow, a twelve-step
 * ITR wizard, a DPR wizard with a machinery table, and a 3,161-line form
 * carrying a branch per service — which nothing had rendered for some time but
 * which still had to be read by anyone changing the others.
 *
 * One flow now. Every service files through it, and what a particular service
 * needs beyond the shared questions is configuration rather than code.
 */
describe("every service files through one flow", () => {
  it("routes every slug to the same component", () => {
    expect(route).toContain("ApplyFlow");
    expect(route).not.toContain("ItrApplicationWizard");
    expect(route).not.toContain("DprApplicationWizard");
  });

  it("has deleted the wizards and the form they duplicated", () => {
    for (const path of [
      "src/components/services/dpr/dpr-application-wizard.tsx",
      "src/components/services/dpr/dpr-wizard-steps.tsx",
      "src/components/services/itr/itr-application-wizard.tsx",
      "src/components/services/itr/itr-wizard-steps.tsx",
      "src/components/portal/service-application-form.tsx",
      "src/components/portal/cm-yuva-application-fields.tsx",
      "src/components/portal/eshram-application-fields.tsx",
      "src/components/portal/pvc-card-application-fields.tsx",
    ]) {
      expect(existsSync(join(root, path)), `${path} is back`).toBe(false);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The shared questions
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Six, and no more. An alternate number and a free-text note used to be asked
 * of everybody and read by nobody; a form that asks for what it will not use
 * is a form people abandon.
 */
describe("the shared form asks six things", () => {
  it("carries exactly the six base fields", () => {
    const form = shared.slice(shared.indexOf("export interface CustomerForm"));
    const body = form.slice(0, form.indexOf("}"));
    const keys = [...body.matchAll(/^\s*(\w+):/gm)].map((match) => match[1]);
    expect(keys.sort()).toEqual(
      ["address", "city", "district", "mobile", "name", "pincode", "state"].sort(),
    );
  });

  it("no longer asks for an alternate number or a note", () => {
    for (const [name, source] of Object.entries({ shared, hook, step })) {
      expect(source, `${name} still asks for an alternate number`).not.toContain("altMobile");
      expect(source, `${name} still asks for a note`).not.toMatch(/customer\.note/);
    }
  });

  it("fills city, district and state from the pincode", () => {
    expect(hook).toMatch(/city:\s*d\.city/);
    expect(hook).toMatch(/district:\s*d\.district/);
    expect(hook).toMatch(/state:\s*d\.state/);
  });

  it("requires no document to submit", () => {
    // Three slots, and nothing in validation refers to them.
    expect(shared).toMatch(/DOC_SLOTS = \[[\s\S]{0,600}?\] as const/);
    const validation = hook.slice(hook.indexOf("const validateCustomer"), hook.indexOf("const handleFileChange"));
    expect(validation).not.toContain("docFiles");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Extra questions, from admin
   ───────────────────────────────────────────────────────────────────────── */

/**
 * `service_fields` and the Fields tab of the admin service editor already
 * existed. They were never wired to the customer-facing form, so the questions
 * were configurable and invisible. Adding a question to a service is an admin
 * edit now, not a deployment.
 */
describe("a service's own questions come from the admin panel", () => {
  it("reads them from the table the admin editor writes", () => {
    expect(loader, "the flow reads service_fields").toContain("service_fields");
    expect(engineApi, "the admin editor writes service_fields").toContain("service_fields");
  });

  it("renders and validates them in the same step as the base fields", () => {
    expect(step).toContain("extraFields");
    expect(hook).toContain("validateApplyFields");
    expect(hook).toContain("collectApplyAnswers");
  });

  it("lets an administrator set the choices, placeholder and help text", () => {
    expect(adminTabs).toMatch(/options:/);
    expect(adminTabs).toContain("placeholder:");
    expect(adminTabs).toContain("help_text:");
    expect(engineApi).toContain("help_text");
  });

  it("submits answers under the question that was asked", () => {
    const fields = toApplyFields([
      { field_key: "gstin", label: "GST number", field_type: "text", validation_chains: [] },
    ]);
    expect(collectApplyAnswers(fields, { gstin: "22AAAAA0000A1Z5" })).toEqual({
      "GST number": "22AAAAA0000A1Z5",
    });
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The translation is forgiving
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A bad configuration must never stop somebody applying. Every one of these
 * used to be a way to take the application page down.
 */
describe("a malformed field is dropped, not thrown", () => {
  it("survives a JSON column that is a string, or null, or nonsense", () => {
    const rows = [
      { field_key: "a", label: "A", field_type: "dropdown", options: '["One","Two"]', validation_chains: '[{"rule":"required"}]' },
      { field_key: "b", label: "B", field_type: "text", options: null, validation_chains: null },
      { field_key: "c", label: "C", field_type: "text", options: "not json", validation_chains: "nope" },
    ] as ServiceFieldRow[];

    const fields = toApplyFields(rows);
    expect(fields).toHaveLength(3);
    expect(fields[0].options).toEqual(["One", "Two"]);
    expect(fields[0].required).toBe(true);
    expect(fields[1].required).toBe(false);
    expect(fields[2].options).toBeUndefined();
  });

  it("drops a row with no key or no label, and de-duplicates keys", () => {
    const fields = toApplyFields([
      { field_key: "", label: "No key", field_type: "text" },
      { field_key: "x", label: "", field_type: "text" },
      { field_key: "y", label: "Kept", field_type: "text" },
      { field_key: "y", label: "Duplicate", field_type: "text" },
    ] as ServiceFieldRow[]);

    expect(fields.map((field) => field.id)).toEqual(["y"]);
    expect(fields[0].label).toBe("Kept");
  });

  it("does not put a file upload in a text box", () => {
    // Documents are the flow's own step; a service wanting a fourth file is
    // asking for a change there, not an input that pretends to be one.
    expect(toApplyFields([
      { field_key: "doc", label: "Extra document", field_type: "file_upload" },
    ] as ServiceFieldRow[])).toEqual([]);
  });

  it("shows a dropdown with no choices as a text box", () => {
    const [field] = toApplyFields([
      { field_key: "d", label: "D", field_type: "dropdown", options: [] },
    ] as ServiceFieldRow[]);
    expect(field.control).toBe("text");
  });

  it("reports a missing required answer against its own field", () => {
    const fields = toApplyFields([
      { field_key: "pan", label: "PAN", field_type: "pan", validation_chains: [{ rule: "required" }] },
    ] as ServiceFieldRow[]);
    expect(validateApplyFields(fields, {})).toEqual({ pan: "PAN is required." });
    expect(validateApplyFields(fields, { pan: "ABCDE1234F" })).toEqual({});
  });

  it("falls back to no extra questions when the database cannot answer", () => {
    // Every failure path in the loader returns an empty list rather than
    // throwing: the base form still submits.
    expect(loader).toMatch(/return \[\];/);
    expect(loader).toContain("catch");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The retired wizards' questions survived
   ───────────────────────────────────────────────────────────────────────── */

describe("the DPR and ITR questions moved rather than vanished", () => {
  it("seeds them into service_fields", () => {
    const sql = code("supabase/migrations/20260831060000_service_fields_on_the_apply_form.sql");

    expect(sql).toContain("alter table public.service_fields");
    for (const column of ["options", "placeholder", "help_text"]) {
      expect(sql, `the ${column} column is not added`).toContain(column);
    }

    // The questions each wizard used to ask.
    for (const key of ["business_name", "scheme", "project_cost", "loan_amount", "machinery"]) {
      expect(sql, `DPR lost "${key}"`).toContain(key);
    }
    for (const key of ["assessment_year", "applicant_type", "income_sources", "tax_regime"]) {
      expect(sql, `ITR lost "${key}"`).toContain(key);
    }

    // Re-running must never overwrite what an administrator has since edited.
    expect(sql).toContain("on conflict (service_id, field_key) do nothing");
  });
});
