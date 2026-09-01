import { describe, expect, it } from "vitest";

import {
  applicationReference,
  looksLikeReference,
  referenceTail,
  serviceCode,
} from "@/lib/applications/reference";

/**
 * An application was identified everywhere by `c08ecef1-13fe-4491-8a99-…`.
 * A customer reading that down a phone gets it wrong twice, so in practice
 * nobody used it: staff searched by name and hoped there was only one.
 */
describe("an application reference says something", () => {
  it("reads service, day and a short tail", () => {
    expect(
      applicationReference({
        id: "c08ecef1-13fe-4491-8a99-bce9adc02069",
        service: "Aadhaar HOF Update",
        created_at: "2026-08-30T13:51:00.000Z",
      }),
    ).toBe("AAD-260830-C08E");
  });

  it("keeps an acronym whole rather than slicing it", () => {
    // ITR, GST, DPR and PVC read better than the first three letters of a
    // word would, and they are what the shop already says.
    expect(serviceCode("ITR Filing")).toBe("ITR");
    expect(serviceCode("GST Registration")).toBe("GST");
    expect(serviceCode("PVC Card Printing")).toBe("PVC");
  });

  it("skips words that carry no meaning", () => {
    // "Pan Card With Only Aadhaar" should read PAN, not WIT.
    expect(serviceCode("Pan Card With Only Aadhaar")).toBe("PAN");
    expect(serviceCode("Application for Bank Statement")).toBe("BAN");
  });

  it("uses the day the shop would call it, not UTC's", () => {
    // A file taken at half past eleven at night in India is that day's.
    expect(
      applicationReference({
        id: "abcd1234",
        service: "ITR Filing",
        created_at: "2026-08-30T18:30:00.000Z", // 2026-08-31 00:00 IST
      }),
    ).toContain("-260831-");
  });

  it("drops the letters that collide with digits", () => {
    // Said aloud, letter O and digit 0 are the same sound, as are I and 1.
    // The digits are kept and the letters dropped, so a code read down a
    // phone can only be written one way.
    const reference = applicationReference({
      id: "OI0l9abc-dead",
      service: "ITR Filing",
      created_at: "2026-08-30T06:00:00.000Z",
    });
    expect(reference.split("-")[2]).toBe("09AB");
  });

  it("gives every row a code, however incomplete", () => {
    // A placeholder that is obviously wrong beats an empty cell or a throw.
    expect(applicationReference({})).toBe("APP-000000-XXXX");
    expect(applicationReference({ id: "x", service: "", created_at: "nonsense" })).toBe("APP-000000-XXXX");
  });

  it("is stable — the same row always reads the same", () => {
    const row = { id: "c08ecef1", service: "Bank Statement", created_at: "2026-08-29T06:08:00.000Z" };
    expect(applicationReference(row)).toBe(applicationReference(row));
  });
});

/**
 * Staff quote the reference now, so somebody typing it back has to find the
 * file. It is derived rather than stored, so what the database can match is
 * its last part.
 */
describe("a reference can be searched back", () => {
  it("recognises one", () => {
    expect(looksLikeReference("AAD-260830-C08E")).toBe(true);
    expect(looksLikeReference("aad-260830-c08e")).toBe(true);
    expect(looksLikeReference("Mo Sohail")).toBe(false);
    expect(looksLikeReference("c08ecef1-13fe-4491")).toBe(false);
  });

  it("hands back the part the database stores", () => {
    expect(referenceTail("AAD-260830-C08E")).toBe("C08E");
    expect(referenceTail("  itr-260901-9ab0 ")).toBe("9AB0");
    expect(referenceTail("just a name")).toBeNull();
  });
});
