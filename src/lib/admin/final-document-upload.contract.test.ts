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
 */
describe("final document can be uploaded without completing or messaging", () => {
  const form = readSrc("src/components/portal/admin-update-form.tsx");
  const route = readSrc("src/app/api/admin/applications/[id]/final-document/route.ts");
  const machine = readSrc("src/lib/applications/status-machine.ts");

  it("still gates completion on a final document", () => {
    // The gate is correct; it was the missing control that was the bug.
    expect(machine).toContain("Upload a final document before marking completed.");
  });

  it("offers an upload control outside the Complete & Send dialog", () => {
    expect(form).toContain("uploadFinalDocumentOnly");
    expect(form).toContain('id="final-document-upload"');
    expect(form).toMatch(/Upload final document|Replace final document/);
  });

  it("uploads without completing the application or messaging the customer", () => {
    expect(form).toMatch(/uploadFinalDocumentOnly[\s\S]{0,600}completeAndSend", "false"/);
  });

  it("does not require a customer mobile to attach the document", () => {
    // hasValidMobile guards the WhatsApp actions; it must not guard the upload.
    const uploadFn = form.slice(
      form.indexOf("function uploadFinalDocumentOnly"),
      form.indexOf("function completeAndSend"),
    );
    expect(uploadFn.length).toBeGreaterThan(0);
    expect(uploadFn).not.toContain("hasValidMobile");
  });

  it("is served by an endpoint that honours completeAndSend=false", () => {
    expect(route).toContain('String(formData.get("completeAndSend") ?? "true")');
    // Status only moves to completed when the caller asked for it.
    expect(route).toContain('if (completeAndSend) appUpdates.status = "completed"');
  });

  it("warns on the panel before the save is refused", () => {
    expect(form).toContain("needsFinalDocument");
    expect(form).toContain("COMPLETION_STATUSES.includes(status)");
  });
});
