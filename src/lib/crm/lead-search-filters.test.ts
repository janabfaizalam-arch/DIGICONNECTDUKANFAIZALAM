import { afterEach, describe, expect, it, vi } from "vitest";

import {
  asiaKolkataDay,
  buildLeadIngestionKey,
  buildLeadSearchFilter,
  isUuid,
  sanitizeLeadSearchTerm,
} from "@/lib/crm/leads-core";
import { getAsiaKolkataRangeForDates } from "@/lib/crm/lead-workflow-core";

describe("buildLeadSearchFilter", () => {
  it("never emits id.eq for a mobile number", () => {
    // Regression: a 10-digit mobile is all hex-safe characters, so a loose
    // "looks like a uuid" check produced id.eq.9876543210 and Postgres rejected
    // the whole query — lead search by phone number always failed.
    const filter = buildLeadSearchFilter("9876543210");
    expect(filter).not.toContain("id.eq");
    expect(filter).toContain("mobile.ilike.%9876543210%");
    expect(filter).toContain("mobile_normalized.ilike.%9876543210%");
  });

  it.each(["98765432", "12345678", "deadbeef", "abc-defab"])(
    "never emits id.eq for hex-looking term %s",
    (term) => {
      expect(buildLeadSearchFilter(term)).not.toContain("id.eq");
    },
  );

  it("emits id.eq only for a well-formed uuid", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(buildLeadSearchFilter(uuid)).toContain(`id.eq.${uuid}`);
  });

  it("searches name and service for ordinary text", () => {
    const filter = buildLeadSearchFilter("Ramesh");
    expect(filter).toContain("name.ilike.%Ramesh%");
    expect(filter).toContain("service.ilike.%Ramesh%");
    expect(filter).not.toContain("id.eq");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(buildLeadSearchFilter("")).toBeNull();
    expect(buildLeadSearchFilter("   ")).toBeNull();
    expect(buildLeadSearchFilter(null)).toBeNull();
  });

  it("strips characters that would break the PostgREST or() list", () => {
    // Commas separate conditions and parentheses group them — leaving either in
    // the term would corrupt the filter into a different query.
    expect(sanitizeLeadSearchTerm("a,b(c)%d*e\\f")).toBe("abcdef");
    const filter = buildLeadSearchFilter("foo,bar");
    expect(filter?.split(",").filter((part) => part.startsWith("name.ilike"))).toHaveLength(1);
  });
});

describe("isUuid", () => {
  it("accepts a canonical uuid and rejects near-misses", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("550e8400-e29b-41d4-a716-44665544000")).toBe(false);
    expect(isUuid("9876543210")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("getAsiaKolkataRangeForDates", () => {
  it("anchors a day-only range to IST, not UTC midnight", () => {
    const { startIso, endIso } = getAsiaKolkataRangeForDates({
      from: "2026-08-07",
      to: "2026-08-07",
    });
    // 00:00 IST is 18:30 UTC the previous day.
    expect(startIso).toBe("2026-08-06T18:30:00.000Z");
    // 23:59:59.999 IST is 18:29:59.999 UTC the same day.
    expect(endIso).toBe("2026-08-07T18:29:59.999Z");
  });

  it("covers the early-morning IST hours a UTC range would drop", () => {
    const { startIso, endIso } = getAsiaKolkataRangeForDates({ from: "2026-08-07", to: "2026-08-07" });
    // 02:00 IST on the 7th — inside the business day, but before UTC midnight.
    const earlyMorningIst = new Date("2026-08-07T02:00:00+05:30").toISOString();
    expect(earlyMorningIst >= startIso!).toBe(true);
    expect(earlyMorningIst <= endIso!).toBe(true);
  });

  it("passes through a full timestamp unchanged", () => {
    const { startIso } = getAsiaKolkataRangeForDates({ from: "2026-08-07T09:15:00Z" });
    expect(startIso).toBe("2026-08-07T09:15:00.000Z");
  });

  it("returns nulls for missing or unparseable input", () => {
    expect(getAsiaKolkataRangeForDates({})).toEqual({ startIso: null, endIso: null });
    expect(getAsiaKolkataRangeForDates({ from: "not-a-date" }).startIso).toBeNull();
  });
});

describe("buildLeadIngestionKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("buckets on the IST business day, not the UTC day", () => {
    // 02:00 IST on 8 Aug is still 7 Aug in UTC. Both submissions belong to the
    // same working day and must share one dedupe bucket.
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-08-07T21:00:00Z")); // 02:30 IST, 8 Aug
    const early = buildLeadIngestionKey({ source: "website", mobile: "9876543210", service: "ITR" });

    vi.setSystemTime(new Date("2026-08-08T06:00:00Z")); // 11:30 IST, 8 Aug
    const later = buildLeadIngestionKey({ source: "website", mobile: "9876543210", service: "ITR" });

    expect(early).toBe(later);
    expect(early).toContain("2026-08-08");
  });

  it("separates different IST days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T10:00:00Z"));
    const day1 = buildLeadIngestionKey({ source: "website", mobile: "9876543210" });
    vi.setSystemTime(new Date("2026-08-08T10:00:00Z"));
    const day2 = buildLeadIngestionKey({ source: "website", mobile: "9876543210" });
    expect(day1).not.toBe(day2);
  });

  it("scopes partner keys so one partner cannot block another", () => {
    const a = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      scopeId: "partner-a",
    });
    const b = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      scopeId: "partner-b",
    });
    expect(a).not.toBe(b);
  });

  it("prefers an external id when the source provides one", () => {
    const key = buildLeadIngestionKey({ source: "whatsapp", mobile: "9876543210", externalId: "wa-42" });
    expect(key).toBe("whatsapp:ext:wa-42");
  });
});

describe("asiaKolkataDay", () => {
  it("reports the IST calendar day across the UTC rollover", () => {
    expect(asiaKolkataDay(new Date("2026-08-07T20:00:00Z"))).toBe("2026-08-08");
    expect(asiaKolkataDay(new Date("2026-08-07T18:00:00Z"))).toBe("2026-08-07");
  });
});
