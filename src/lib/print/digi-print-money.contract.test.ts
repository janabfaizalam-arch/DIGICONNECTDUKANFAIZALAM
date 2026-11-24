import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

/**
 * Digi Print's money and printing rules, pinned at the source.
 *
 * Found in the audit of the old system: the customer's payment never reached
 * the partner's wallet, the "approval" switch did nothing, a retried checkout
 * orphaned the first Razorpay order, a crashed PC left paid jobs stuck at
 * "printing" forever, and any station could mark any of its jobs printed.
 */

const completion = readCode("src/lib/payments/complete-non-application-payment.ts");
const verify = readCode("src/app/api/print/payment/verify/route.ts");
const createOrder = readCode("src/app/api/print/payment/create-order/route.ts");
const wallet = readCode("src/lib/ap-wallet.ts");
const agentJobs = readCode("src/app/api/print/agent/jobs/route.ts");
const agentClaim = readCode("src/app/api/print/agent/claim-job/route.ts");
const agentStatus = readCode("src/app/api/print/agent/update-status/route.ts");
const partnerJobs = readCode("src/lib/print/partner-jobs.ts");
const partnerRoute = readCode("src/app/api/ap/print-station/jobs/route.ts");
const migration = readCode("supabase/migrations/20261124090000_digi_print_wallet_approval_printers.sql");

describe("the shop gets paid", () => {
  it("credits the partner wallet when a print payment completes", () => {
    expect(completion).toContain("creditPrintEarning");
    expect(completion).toContain("splitPrintEarning");
  });

  it("is reached by both the browser verify call and the webhook", () => {
    expect(verify).toContain("completePrintPayment");
    expect(readCode("src/app/api/razorpay/webhook/route.ts")).toContain("completePrintPayment");
  });

  it("credits once per job, however many callers race", () => {
    expect(wallet).toContain('"print_job"');
    expect(wallet).toMatch(/findLedgerEntryByReference\(\s*params\.agencyPartnerId,\s*"print_job"/);
  });

  it("counts print_earning as a credit in every balance", () => {
    expect(wallet).toMatch(/CREDIT_TYPES = \[[^\]]*"print_earning"/);
    expect(readCode("src/lib/ap/finance.ts")).toContain('"print_earning"');
    expect(migration).toContain("'print_earning'");
  });

  it("confirms the capture with Razorpay before printing", () => {
    expect(verify).toContain("payments.fetch");
    expect(verify).toContain('"captured"');
  });
});

describe("approval is a real switch", () => {
  it("holds a paid job for the shop when the station asks for it", () => {
    expect(completion).toContain('station?.require_approval ? "awaiting_approval" : "queued"');
    expect(migration).toContain("'awaiting_approval'");
  });

  it("lets only the station's own partner approve, refund or reprint", () => {
    expect(partnerRoute).toContain("getStationForPartner");
    for (const fn of ["approveJob", "reprintJob", "rejectAndRefund"]) {
      const body = partnerJobs.slice(partnerJobs.indexOf(`export async function ${fn}`));
      expect(body.slice(0, 2500)).toContain('.eq("station_id", station.id)');
    }
  });

  it("takes the earning back when a job is refunded", () => {
    expect(partnerJobs).toContain("reversePrintEarning");
    // The job is pulled from the printer before Razorpay is asked to refund.
    expect(partnerJobs.indexOf('print_status: "cancelled"')).toBeLessThan(partnerJobs.indexOf("payments.refund"));
  });
});

describe("a paid job always prints", () => {
  it("reuses one Razorpay order per job", () => {
    expect(createOrder).toContain("if (job.razorpay_order_id)");
    expect(createOrder).toContain('.is("razorpay_order_id", null)');
  });

  it("offers a job back after its printer went silent mid-print", () => {
    expect(agentJobs).toContain("and(print_status.eq.printing,claim_expires_at.lt.");
    expect(agentClaim).toContain("and(print_status.eq.printing,claim_expires_at.lt.");
  });

  it("accepts a status report only for a job this agent is printing", () => {
    expect(agentStatus).toContain('.eq("print_status", "printing")');
    expect(agentStatus).toContain('.eq("claimed_by_agent", agentId)');
  });

  it("keeps a station's printers off the platform's global printer table", () => {
    expect(agentJobs).toContain('station ? null : searchParams.get("printers")');
  });
});

describe("the customer cannot set their own price", () => {
  const create = readCode("src/app/api/print/jobs/create/route.ts");
  const upload = readCode("src/app/api/print/jobs/upload/route.ts");

  it("builds every order from the upload route's signed receipt", () => {
    expect(create).toContain("readUploadReceipt(body.upload_receipt)");
    expect(create).toContain("storage_path: upload.path");
    expect(create).toContain("Math.max(claimedPages, upload.pages)");
  });

  it("never bills fewer sheets than the file's real pages", () => {
    expect(create).toMatch(/sheetCount = Math\.max\([^;]*upload\.pages\)/);
  });

  it("counts PDF pages with a real parser before signing", () => {
    expect(upload).toContain("countPdfPages(buffer)");
    expect(upload).toContain("issueUploadReceipt");
  });

  it("lets one uploaded file back only one order", () => {
    expect(create).toContain('.eq("storage_path", upload.path)');
  });

  it("does not let anyone walk orders by sequential job number", () => {
    expect(readCode("src/app/api/print/jobs/status/route.ts")).not.toContain('eq("job_number"');
  });
});

describe("the shop's switches are enforced on the server", () => {
  const create = readCode("src/app/api/print/jobs/create/route.ts");

  it("refuses A3 and colour when the shop turned them off", () => {
    expect(create).toContain('paper_size === "A3" && !station.offer_a3');
    expect(create).toContain('color_mode === "color" && !station.offer_color');
  });

  it("refuses services that are not live (passport photos, for now)", () => {
    expect(create).toContain("!isServiceLive(requestedService)");
    expect(readCode("src/lib/print/smart-print.ts")).toContain('LIVE_SERVICE_IDS: SmartPrintServiceId[] = ["document", "id_copy"]');
  });

  it("never prices on a setting the customer was not shown", () => {
    expect(create).toContain('finish: "normal"');
    expect(create).toContain('quality: "standard"');
  });
});

describe("one-click connector updates", () => {
  it("serves the program to a station's own connector only, never the key", () => {
    const route = readCode("src/app/api/print/agent/update/route.ts");
    expect(route).toContain("if (!caller.station)");
    expect(route).toContain("files: PRINT_STATION_FILES");
    expect(route).not.toContain("agentToken");
  });

  it("tells the connector about an update the partner requested", () => {
    expect(readCode("src/app/api/print/agent/jobs/route.ts")).toContain("requested: station.update_requested");
  });
});
