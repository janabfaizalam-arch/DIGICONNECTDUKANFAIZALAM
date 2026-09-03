import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const flow = readCode("src/components/print/station-print-flow.tsx");
const create = readCode("src/app/api/print/jobs/create/route.ts");
const upload = readCode("src/app/api/print/jobs/upload/route.ts");

/**
 * The customer's side of the counter, end to end.
 *
 * This page shipped as a shell: it picked a file, showed a price, and its
 * "Pay and print" button had no handler at all. It looked finished, which is
 * why it took a customer standing at a counter to find out that nothing
 * happened when they tapped it.
 */

describe("the pay button", () => {
  it("actually does something when tapped", () => {
    // The regression this exists for: a styled button with no onClick.
    expect(flow).toContain("onClick={() => void payAndPrint()}");
  });

  it("runs the three server calls the job needs, in order", () => {
    const upload_ = flow.indexOf("/api/print/jobs/upload");
    const create_ = flow.indexOf("/api/print/jobs/create");
    const order = flow.indexOf("/api/print/payment/create-order");
    const verify = flow.indexOf("/api/print/payment/verify");

    expect(upload_).toBeGreaterThan(-1);
    expect(create_).toBeGreaterThan(upload_);
    expect(order).toBeGreaterThan(create_);
    expect(verify).toBeGreaterThan(order);
  });

  it("sends this counter's code, or the shop's printer never sees the job", () => {
    expect(flow).toContain("station_code: station.code");
  });

  it("cannot be tapped before there is something to print and someone to call", () => {
    expect(flow).toContain(
      "disabled={closed || offline || !uploaded || uploading || paying || mobile.length < 10}",
    );
  });

  it("loads the payment script the page depends on", () => {
    expect(flow).toContain("checkout.razorpay.com/v1/checkout.js");
    expect(flow).toContain("setRazorpayReady(true)");
  });

  it("tells the customer their money is safe when confirmation fails after paying", () => {
    // The worst moment in this flow: paid, and the verify call failed.
    expect(flow).toMatch(/money is safe/i);
  });
});

describe("the job a counter creates", () => {
  it("belongs to the station it was ordered at", () => {
    expect(create).toContain("station_id: station ? station.id : null");
  });

  it("charges the shop's own rates, not the platform's", () => {
    /*
      A shop sets its own prices — that is the product. Checking the amount
      against the platform's ₹2 would reject every order at a counter that
      charges anything else as a price mismatch.
    */
    expect(create).toContain("pageRateFor(station, paper_size, color_mode)");
    expect(create).toContain("station.rates[key]");
  });

  it("refuses a closed counter before taking any money", () => {
    expect(create).toContain("accepting_orders");
    expect(create).toMatch(/counter is closed/i);
    expect(create).toContain("409");
  });

  it("carries the deletion deadline the shop promised its customers", () => {
    expect(create).toContain("auto_delete_minutes * 60_000");
    expect(create).toContain("expires_at");
  });

  it("gives the customer a pickup pin so two orders do not get swapped", () => {
    expect(create).toContain("pickup_pin");
    expect(flow).toMatch(/Say this at the desk/i);
  });

  it("still works for the platform's own page, which has no station", () => {
    // station_code is optional; without it the platform rates apply.
    expect(create).toContain("stationCode ? await getStationByCode(stationCode) : null");
    expect(create).toContain("if (!station) return RATES[paperSize][colorMode]");
  });
});

describe("what a phone is allowed to send", () => {
  it("accepts the photo formats phones actually produce", () => {
    // The page promises "PDF, photo or Word". A .webp is a photo, and it is
    // what WhatsApp and Android screenshots hand over.
    expect(upload).toContain('"webp"');
    expect(upload).toContain('"image/webp"');
    expect(flow).toContain(".webp");
  });

  it("says what can be printed instead of only what cannot", () => {
    expect(upload).toMatch(/Send a PDF, a photo/i);
  });
});

describe("who decides the price", () => {
  it("treats a claimed amount as a confirmation, never as the price", () => {
    /*
      The old check was `Math.abs(amount - expected) > 0.01` with amount
      required. `Math.abs(undefined - x)` is NaN and `NaN > 0.01` is false —
      so a request that simply left the amount out sailed through a line that
      read like a guard. It is now conditional, and rejects a non-number.
    */
    expect(create).toContain("amount !== undefined && amount !== null");
    expect(create).toContain("!Number.isFinite(claimed)");
  });

  it("computes the figure from the counter's rates before comparing anything", () => {
    const rate = create.indexOf("pageRateFor(station, paper_size, color_mode)");
    const compare = create.indexOf("amount !== undefined");
    expect(rate).toBeGreaterThan(-1);
    expect(compare).toBeGreaterThan(rate);
  });
});

describe("where the payment key comes from", () => {
  const order = readCode("src/app/api/print/payment/create-order/route.ts");

  it("reads the publishable key the way every other payment on this site does", () => {
    /*
      I invented a `key_id` field on the order response and required it. The
      route has never returned one, so a counter that was configured perfectly
      well told its customer "Payment is not configured for this counter."
    */
    expect(flow).toContain("process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID");
    expect(flow).not.toContain("order.key_id");
  });

  it("expects only the fields the order route actually returns", () => {
    // The guard against repeating that mistake: what the client reads must
    // be something the server sends.
    for (const field of ["order_id", "amount", "currency"]) {
      expect(order, `create-order does not return ${field}`).toContain(`${field}:`);
    }
    expect(order).not.toContain("key_id");
  });

  it("reads the amount as a number whatever type the SDK hands back", () => {
    expect(flow).toContain("const amountPaise = Number(order.amount)");
    expect(flow).toContain("Number.isFinite(amountPaise)");
  });

  it("says the shop can still be paid at the desk when payments are off", () => {
    expect(flow).toMatch(/pay at the desk/i);
  });
});

describe("a photo the printer can actually read", () => {
  it("converts webp in the browser, where a decoder definitely exists", () => {
    /*
      PJ-10015 died on the shop's computer: "No application is associated
      with the specified file for this operation." Windows' own drawing
      library has no webp decoder either, so fixing the print path alone
      would not have printed this customer's page. The browser holding the
      photo can decode it — that is how it is on screen — so it converts
      before the file is ever sent.
    */
    expect(flow).toContain("async function toPrintableImage");
    expect(flow).toContain("createImageBitmap(file)");
    expect(flow).toContain('canvas.toBlob(resolve, type, quality)');
  });

  it("converts before uploading, not after", () => {
    expect(flow).toContain("const sending = await toPrintableImage(picked)");
    expect(flow).toContain('form.append("file", sending)');
  });

  it("leaves every other format exactly as the customer chose it", () => {
    expect(flow).toContain("if (!isWebp) return file");
  });

  it("uploads the original rather than nothing if converting fails", () => {
    // A job that fails at the printer can be reprinted. A customer who
    // cannot upload at all just leaves.
    expect(flow).toMatch(/catch \{\s*return file;\s*\}/);
  });

  it("caps the long edge so a lossless copy stays uploadable", () => {
    expect(flow).toContain("longest > 3000");
    expect(flow).toContain("15 * 1024 * 1024");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Money is not taken for pages that cannot come out
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A customer paid ₹2 at a live counter and nothing printed. The shop's
 * computer was not running the Print Station, so the job queued where nobody
 * was reading; the screen said "Paid. Printing now." and stayed there. The
 * shop learnt about it from the customer.
 *
 * Three separate holes, one incident: the server took the order, the
 * customer's screen lied about it, and the shop had no way to see it.
 */
describe("a counter that cannot print does not get to charge", () => {
  const create = readCode("src/app/api/print/jobs/create/route.ts");
  const panel = readCode("src/components/ap/print-station-setup.tsx");
  const stations = readCode("src/lib/print/stations.ts");

  it("refuses on the server, where the money actually moves", () => {
    // The client can be stale, reloaded, or simply older than this deploy.
    expect(create).toContain("station && !station.agent_connected");
    expect(create).toContain("nothing would print");
  });

  it("says so before the payment, not after", () => {
    const refusal = create.indexOf("station && !station.agent_connected");
    const insert = create.indexOf('.from("print_jobs")');
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(insert);
  });

  it("counts what is stuck without listing anybody's document", () => {
    expect(stations).toContain("export async function countWaitingJobs");
    expect(stations).toContain('.select("id", { count: "exact", head: true })');
    expect(stations).toContain('.eq("print_status", "queued")');
  });

  it("puts that number where the shop will see it", () => {
    expect(panel).toContain("waitingJobs > 0");
    expect(panel).toMatch(/paid \{waitingJobs === 1 \? "job" : "jobs"\} waiting to print/);
  });
});
