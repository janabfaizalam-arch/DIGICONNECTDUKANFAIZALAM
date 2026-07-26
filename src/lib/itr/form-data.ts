type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function pickField(sources: AnyRecord[], key: string): string {
  for (const source of sources) {
    const hit = text(source[key]);
    if (hit) return hit;
  }
  return "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }
  const single = text(value);
  return single ? [single] : [];
}

function deriveIncomeSourcesFromAmounts(sources: AnyRecord[]): string[] {
  const derived: string[] = [];
  const salary = Number(sources.map((s) => s.salaryIncome).find(Boolean) ?? 0);
  const business = Number(sources.map((s) => s.businessIncome).find(Boolean) ?? 0);
  const capGains = Number(sources.map((s) => s.capitalGains).find(Boolean) ?? 0);
  const rent = Number(sources.map((s) => s.rentIncome).find(Boolean) ?? 0);
  const other = Number(sources.map((s) => s.otherIncome).find(Boolean) ?? 0);

  if (salary > 0) derived.push("salary");
  if (business > 0) derived.push("business");
  if (capGains > 0) derived.push("capital_gains");
  if (rent > 0) derived.push("house_property");
  if (other > 0) derived.push("other");

  return derived;
}

export type ItrDocumentChecklistItem = {
  key: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  status?: string;
};

export function extractItrFormPayload(formData: unknown) {
  const root = asRecord(formData);
  const details = asRecord(root.details);
  const itr = asRecord(details.itr ?? root.itr);
  const sourceStack = [itr, details, root];

  const assessmentYear = pickField(sourceStack, "assessmentYear");
  const applicantType = pickField(sourceStack, "applicantType") || pickField(sourceStack, "incomeProfile");
  const filingType = pickField(sourceStack, "filingType");
  const taxRegime = pickField(sourceStack, "taxRegime");
  const packagePlan =
    pickField(sourceStack, "package") ||
    pickField(sourceStack, "plan") ||
    pickField(sourceStack, "selectedPlan");
  const recommendedForm =
    pickField(sourceStack, "recommendedForm") ||
    pickField(sourceStack, "recommendedFormType") ||
    pickField(sourceStack, "recommendedItrForm");

  const explicitSources = asStringArray(
    itr.incomeSources ?? details.incomeSources ?? root.incomeSources,
  );
  const incomeSources = explicitSources.length
    ? explicitSources
    : deriveIncomeSourcesFromAmounts(sourceStack);

  const financial = {
    salaryIncome: pickField(sourceStack, "salaryIncome"),
    businessIncome: pickField(sourceStack, "businessIncome"),
    capitalGains: pickField(sourceStack, "capitalGains"),
    rentIncome: pickField(sourceStack, "rentIncome"),
    otherIncome: pickField(sourceStack, "otherIncome"),
    deductions80C: pickField(sourceStack, "deductions80C"),
    deductions80D: pickField(sourceStack, "deductions80D"),
    hraExempt: pickField(sourceStack, "hraExempt"),
    otherDeductions: pickField(sourceStack, "otherDeductions"),
    estimatedTax: pickField(sourceStack, "estimatedTax"),
    taxPayable: pickField(sourceStack, "taxPayable"),
    refundDue: pickField(sourceStack, "refundDue"),
    tdsCredit: pickField(sourceStack, "tdsCredit"),
    advanceTaxPaid: pickField(sourceStack, "advanceTaxPaid"),
  };

  const panNumber = pickField(sourceStack, "panNumber");
  const aadhaarNumber = pickField(sourceStack, "aadhaarNumber");

  const checklistRaw = itr.documentChecklist ?? details.documentChecklist ?? root.documentChecklist;
  let documentChecklist: ItrDocumentChecklistItem[] = [];
  if (Array.isArray(checklistRaw)) {
    documentChecklist = checklistRaw.map((item, index) => {
      const row = asRecord(item);
      return {
        key: text(row.key ?? row.documentKey ?? row.id) || `doc-${index}`,
        label: text(row.label ?? row.documentLabel ?? row.name) || "Document",
        required: Boolean(row.required ?? row.requiredDefault),
        uploaded: Boolean(row.uploaded ?? row.isUploaded ?? row.fileUrl ?? row.file_url),
        status: text(row.status) || undefined,
      };
    });
  } else if (checklistRaw && typeof checklistRaw === "object") {
    documentChecklist = Object.entries(asRecord(checklistRaw)).map(([key, value]) => {
      const row = asRecord(value);
      return {
        key,
        label: text(row.label ?? row.documentLabel ?? key),
        required: Boolean(row.required ?? row.requiredDefault),
        uploaded: Boolean(row.uploaded ?? row.isUploaded ?? row.fileUrl ?? row.file_url ?? value === true),
        status: text(row.status) || undefined,
      };
    });
  }

  const hasFinancialFlags = Object.values(financial).some(Boolean);
  const hasItr = Boolean(
    assessmentYear ||
      applicantType ||
      filingType ||
      taxRegime ||
      packagePlan ||
      recommendedForm ||
      incomeSources.length ||
      panNumber ||
      aadhaarNumber ||
      documentChecklist.length ||
      hasFinancialFlags,
  );

  return {
    assessmentYear,
    applicantType,
    filingType,
    taxRegime,
    packagePlan,
    recommendedForm,
    incomeSources,
    panNumber,
    aadhaarNumber,
    financial,
    documentChecklist,
    hasItr,
  };
}
