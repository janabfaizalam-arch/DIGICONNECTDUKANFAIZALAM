type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

export function extractDprFormPayload(formData: unknown) {
  const root = asRecord(formData);
  const details = asRecord(root.details);
  const dpr = asRecord(details.dpr ?? root.dpr);
  const personal = asRecord(dpr.personal ?? root.personal);
  const business = asRecord(dpr.business ?? root.business);
  const project = asRecord(dpr.project ?? root.project);
  const machineryRaw = dpr.machinery ?? root.machinery;
  const machinery = Array.isArray(machineryRaw) ? machineryRaw.map(asRecord) : [];
  const plan = String(dpr.plan ?? details.selectedPlan ?? root.selectedPlan ?? "");

  return {
    personal,
    business,
    project,
    machinery,
    plan,
    hasDpr: Boolean(Object.keys(personal).length || Object.keys(project).length || machinery.length),
  };
}
