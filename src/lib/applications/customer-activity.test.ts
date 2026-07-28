import { describe, expect, it } from "vitest";

import {
  isCustomerSafeActivityNote,
  mapStatusLogToCustomerActivity,
  mapTimelineToCustomerActivity,
  mergeCustomerActivity,
  sanitizeCustomerActivityDescription,
} from "@/lib/applications/customer-activity";

describe("customer activity sanitizer", () => {
  it("excludes internal/admin notes", () => {
    expect(isCustomerSafeActivityNote("Internal admin note about commission")).toBe(false);
    expect(sanitizeCustomerActivityDescription("WhatsApp provider log failed")).toBeNull();
    expect(sanitizeCustomerActivityDescription("Please upload your Aadhaar")).toBe(
      "Please upload your Aadhaar",
    );
  });

  it("maps status logs without actor metadata", () => {
    const item = mapStatusLogToCustomerActivity({
      id: "1",
      new_status: "in_progress",
      note: "Internal admin review",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(item.title).toContain("in progress");
    expect(item.description).toBeNull();
    expect(item).not.toHaveProperty("actor_name");
  });

  it("drops customer_visible false timeline rows", () => {
    expect(
      mapTimelineToCustomerActivity({
        id: "t1",
        event_title: "Final uploaded",
        event_description: "ready",
        created_at: "2026-01-01T00:00:00Z",
        customer_visible: false,
      }),
    ).toBeNull();
  });

  it("merges near-duplicate status events", () => {
    const merged = mergeCustomerActivity([
      {
        id: "a",
        title: "Status: submitted",
        description: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "b",
        title: "Status transition",
        description: null,
        created_at: "2026-01-01T00:00:01.000Z",
      },
    ]);
    expect(merged).toHaveLength(1);
  });
});
