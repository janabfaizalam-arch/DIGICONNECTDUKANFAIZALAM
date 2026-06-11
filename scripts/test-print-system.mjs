import assert from "assert";

console.log("=========================================");
console.log("    PRINT SYSTEM VERIFICATION SUITE       ");
console.log("=========================================");

// 1. Assert Pricing Calculation logic (must match RATES in Next.js APIs)
const RATES = {
  A4: { mono: 2.0, color: 10.0 },
  A3: { mono: 5.0, color: 20.0 },
};

function calculatePrice(pages, copies, size, mode) {
  const rate = RATES[size][mode];
  return pages * copies * rate;
}

try {
  console.log("[Test] Testing pricing calculations...");
  
  // Test case 1: Standard A4 Black & White (10 pages, 3 copies)
  let p1 = calculatePrice(10, 3, "A4", "mono");
  assert.strictEqual(p1, 60.0, "A4 mono calculation error");
  console.log("  - Case 1: 10 pages, 3 copies, A4 mono = ₹60.00 (Pass)");

  // Test case 2: Premium A4 Color (5 pages, 2 copies)
  let p2 = calculatePrice(5, 2, "A4", "color");
  assert.strictEqual(p2, 100.0, "A4 color calculation error");
  console.log("  - Case 2: 5 pages, 2 copies, A4 color = ₹100.00 (Pass)");

  // Test case 3: Large A3 Mono (2 pages, 5 copies)
  let p3 = calculatePrice(2, 5, "A3", "mono");
  assert.strictEqual(p3, 50.0, "A3 mono calculation error");
  console.log("  - Case 3: 2 pages, 5 copies, A3 mono = ₹50.00 (Pass)");

  // Test case 4: Large A3 Color (10 pages, 1 copy)
  let p4 = calculatePrice(10, 1, "A3", "color");
  assert.strictEqual(p4, 200.0, "A3 color calculation error");
  console.log("  - Case 4: 10 pages, 1 copy, A3 color = ₹200.00 (Pass)");

  console.log("✓ Pricing calculation assertions passed!");
} catch (err) {
  console.error("❌ Pricing calculation assertion failed:", err.message);
  process.exit(1);
}

// 2. Validate PDF page count regex detection mechanism
console.log("\n[Test] Testing PDF page count parser logic...");
function countPdfPages(pdfString) {
  const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
  return pageMatches && pageMatches.length > 0 ? pageMatches.length : 1;
}

try {
  const mockPdfBinarySinglePage = "%PDF-1.4 ... /Type /Page ... %%EOF";
  assert.strictEqual(countPdfPages(mockPdfBinarySinglePage), 1, "Single page mock PDF failed");
  console.log("  - Case 1: Single page mock PDF = 1 page (Pass)");

  const mockPdfBinaryMultiPage = "%PDF-1.4 ... /Type/Page ... /Type   /Page ... /Type /Page ... %%EOF";
  assert.strictEqual(countPdfPages(mockPdfBinaryMultiPage), 3, "Multi-page mock PDF failed");
  console.log("  - Case 2: Multi-page mock PDF = 3 pages (Pass)");

  console.log("✓ PDF page count parsing logic passed!");
} catch (err) {
  console.error("❌ PDF page count parser test failed:", err.message);
  process.exit(1);
}

// 3. Test Agent Concurrent Lock simulation
console.log("\n[Test] Testing agent concurrency locking model simulation...");
class PrintJobSimulation {
  constructor() {
    this.print_status = "queued";
    this.claimed_by = null;
  }

  // Atomic claim operation simulation
  claim(agentId) {
    if (this.print_status === "queued") {
      this.print_status = "printing";
      this.claimed_by = agentId;
      return true; // Success
    }
    return false; // Already claimed or not queued
  }
}

try {
  const simJob = new PrintJobSimulation();
  
  // Simulate Agent A and Agent B calling claim at the same time
  const claimA = simJob.claim("agent-A");
  const claimB = simJob.claim("agent-B");

  assert.strictEqual(claimA, true, "Agent A should have claimed the job");
  assert.strictEqual(claimB, false, "Agent B should have failed to claim the job");
  assert.strictEqual(simJob.claimed_by, "agent-A", "Job claimed_by should remain agent-A");
  console.log("  - Concurrency Lock: Agent A claimed successfully, Agent B was blocked. (Pass)");

  console.log("✓ Agent concurrency lock simulation passed!");
} catch (err) {
  console.error("❌ Concurrency lock test failed:", err.message);
  process.exit(1);
}

console.log("\n=========================================");
console.log("✓ ALL LOCAL CORE PRINT SYSTEM TESTS PASSED!");
console.log("=========================================");
