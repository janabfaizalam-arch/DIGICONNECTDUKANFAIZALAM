import { emptyDpr } from "./defaults";
import type { DprInput } from "./engine";

/**
 * A worked example — a small flour mill under PMEGP — used by the tests and
 * by the form's "Example se bharein" button so a new admin can see a
 * complete DPR before making their own.
 */
export function sampleDpr(now = new Date()): DprInput {
  return {
    ...emptyDpr(now),
    templateId: "flour-mill",
    businessName: "Shree Ram Flour Mill",
    activity: "manufacturing of wheat flour (atta)",
    address: "Village Kusmilia",
    district: "Jalaun",
    state: "Uttar Pradesh",
    pincode: "285001",
    premises: "owned",
    bankName: "Bank of Baroda",
    bankBranch: "Orai",
    promoters: [
      {
        name: "Ramesh Kumar",
        fatherName: "Shyam Lal",
        age: 32,
        gender: "Male",
        qualification: "Intermediate",
        experience: "5 years of experience in running a flour mill",
        socialCategory: "OBC",
        mobile: "9876543210",
        email: "",
        address: "Orai, Jalaun",
      },
    ],
    scheme: "pmegp",
    sector: "manufacturing",
    area: "rural",
    category: "special",
    capitalItems: [
      { kind: "machinery", description: "Atta chakki 20 HP with motor", quantity: 1, rate: 450000 },
      { kind: "machinery", description: "Packing machine", quantity: 1, rate: 100000 },
      { kind: "electrical", description: "Wiring and panel", quantity: 1, rate: 50000 },
      { kind: "furniture", description: "Racks and table", quantity: 1, rate: 30000 },
      { kind: "preliminary", description: "Registration and project report", quantity: 1, rate: 20000 },
      { kind: "land", description: "Own plot", quantity: 1, rate: 300000 },
    ],
    debtorDays: 20,
    creditorDays: 20,
    products: [{ name: "Wheat flour (atta)", unit: "quintal", capacity: 3000, price: 3000, processLossPct: 0, rejectionPct: 0 }],
    // About 1.033 quintal of wheat per quintal of atta (cleaning loss and bran).
    rawMaterials: [{ name: "Wheat", unit: "quintal", quantity: 3100, rate: 2400, productIndex: 0, perUnit: 1.0333, lossPct: 0 }],
    staff: [
      { role: "Machine operator", count: 2, monthlySalary: 12000, direct: true },
      { role: "Accountant", count: 1, monthlySalary: 10000, direct: false },
    ],
    overheads: [
      { name: "Electricity / power", monthly: 25000, variable: true, direct: true },
      { name: "Repairs & maintenance", monthly: 2000, variable: false, direct: true },
      { name: "Office, telephone & stationery", monthly: 2000, variable: false, direct: false },
      { name: "Marketing & transport", monthly: 5000, variable: true, direct: false },
      { name: "Insurance of plant and stock", monthly: 600, variable: false, direct: false },
      { name: "Professional, audit and compliance fees", monthly: 1500, variable: false, direct: false },
    ],
  };
}
