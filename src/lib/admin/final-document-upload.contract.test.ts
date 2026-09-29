import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

/* ─────────────────────────────────────────────────────────────────────────
   An admin told to upload a final document must have somewhere to upload it
   ───────────────────────────────────────────────────────────────────────── */

/**
 * They did not. `canTransitionStatus` refuses to complete an application with
 * no final document on file, so setting the status to Completed and pressing
 * Save Changes returned "Upload a final document before marking completed."
 * — and the only file input on the whole panel lived inside the "Complete &
 * Send on WhatsApp" dialog, behind a button that is itself disabled without a
 * valid customer mobile. An application whose customer had no usable number
 * could therefore never be completed by any route at all.
 *
 * The first attempt at this added a separate upload button beside the form,
 * which worked but left completing an application a two-step job that an
 * admin had to know about. PATCH /api/admin/applications/[id] had accepted a
 * `finalDocument` file all along — uploading it and counting it toward the
 * gate in the same request — so the file now rides Save Changes itself.
 */
describe("final document can be attached from the Save Changes panel", () => {
  const form = readSrc("src/components/portal/admin-update-form.tsx");
  const route = readSrc("src/app/api/admin/applications/[id]/route.ts");
  const machine = readSrc("src/lib/applications/status-machine.ts");

  it("still gates completion on a final document", () => {
    // The gate is correct; it was the missing control that was the bug.
    expect(machine).toContain("Upload a final document before marking completed.");
  });

  it("offers a file input outside the Complete & Send dialog", () => {
    expect(form).toContain('id="final-document-upload"');
    expect(form).toContain("Final document");
  });

  it("names the input what the Save Changes endpoint reads", () => {
    // The whole fix: PATCH already looked for this field.
    expect(form).toContain('name="finalDocument"');
    expect(route).toContain('formData.get("finalDocument")');
  });

  it("counts a file being uploaded toward the completion gate", () => {
    expect(route).toContain("const uploadingFinal = finalDocument instanceof File && finalDocument.size > 0");
    expect(route).toMatch(/hasFinalDocument = Boolean\(\s*uploadingFinal/);
  });

  it("enables Save Changes when only a file was chosen", () => {
    // Without this the one-step flow is unreachable: nothing else is dirty.
    expect(form).toMatch(/notesChanged \|\| Boolean\(finalFile\)/);
  });

  it("does not require a customer mobile to attach the document", () => {
    // hasValidMobile guards the WhatsApp actions; it must not guard the form.
    const formEl = form.slice(form.indexOf("<form onSubmit"), form.indexOf("</form>"));
    expect(formEl.length).toBeGreaterThan(0);
    expect(formEl).not.toContain("hasValidMobile");
  });

  it("warns only while neither a stored document nor a chosen file exists", () => {
    expect(form).toContain("needsFinalDocument");
    expect(form).toMatch(/COMPLETION_STATUSES\.includes\(status\)[\s\S]{0,80}!finalFile/);
  });

  it("clears the chosen file once it has been saved", () => {
    // A file input cannot be cleared by state alone, hence the remount key.
    expect(form).toContain("setFileInputKey");
    expect(form).toContain("key={fileInputKey}");
  });
});
