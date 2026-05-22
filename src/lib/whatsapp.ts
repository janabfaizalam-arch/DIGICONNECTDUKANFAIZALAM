export const WHATSAPP_NUMBER = "917007595931";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function amountText(amount?: string | number | null) {
  if (amount === null || amount === undefined || amount === "") return "";
  const numeric = Number(amount);
  if (Number.isFinite(numeric)) {
    return `Rs ${numeric.toLocaleString("en-IN")}`;
  }
  return clean(amount);
}

function compactLines(lines: Array<string | null | undefined>) {
  const message = lines.map(clean).filter(Boolean).join("\n");
  return message || "I need support from DigiConnect Dukan. Please help me with service details and next steps.";
}

export function buildWhatsAppUrl(message: string, number = WHATSAPP_NUMBER) {
  const safeMessage = clean(message) || "I need support from DigiConnect Dukan. Please help me with service details and next steps.";
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(safeMessage)}`;
}

export function buildServiceWhatsAppMessage(params: {
  serviceName?: string | null;
  category?: string | null;
  action?: "apply" | "enquiry" | "documents" | "fees" | "support";
  page?: string | null;
}) {
  const serviceName = clean(params.serviceName) || "a DigiConnect Dukan service";
  const action = params.action ?? "enquiry";

  if (action === "apply") {
    return compactLines([
      `I want to apply for ${serviceName}.`,
      "Please share required documents, fees, and processing time.",
      params.category ? `Category: ${params.category}` : null,
      params.page ? `Page: ${params.page}` : null,
    ]);
  }

  if (action === "documents") {
    return compactLines([
      `I need the document checklist for ${serviceName}.`,
      "Please share the required documents and upload guidance.",
      params.category ? `Category: ${params.category}` : null,
    ]);
  }

  if (action === "fees") {
    return compactLines([
      `I want to know the fees for ${serviceName}.`,
      "Please share pricing, payment process, and processing time.",
      params.category ? `Category: ${params.category}` : null,
    ]);
  }

  if (action === "support") {
    return compactLines([
      `I need help with ${serviceName}.`,
      "Please guide me with the process, documents, fees, and next steps.",
      params.page ? `Page: ${params.page}` : null,
    ]);
  }

  return compactLines([
    `I want to know about ${serviceName}.`,
    "Please share service details, required documents, fees, and processing time.",
    params.category ? `Category: ${params.category}` : null,
    params.page ? `Page: ${params.page}` : null,
  ]);
}

export function buildApplicationWhatsAppMessage(params: {
  applicationId?: string | null;
  serviceName?: string | null;
  status?: string | null;
  customerName?: string | null;
  mobile?: string | null;
  action?: "apply_help" | "status_support" | "admin_followup" | "agent_support";
}) {
  const action = params.action ?? "status_support";
  const serviceName = clean(params.serviceName);

  if (action === "apply_help") {
    return compactLines([
      `I need help completing my application${serviceName ? ` for ${serviceName}` : ""}.`,
      "Please guide me with the required details, documents, and payment process.",
    ]);
  }

  if (action === "admin_followup") {
    return compactLines([
      "I need support regarding a customer application.",
      params.applicationId ? `Application ID: ${params.applicationId}` : null,
      serviceName ? `Service: ${serviceName}` : null,
      params.status ? `Current Status: ${params.status}` : null,
      params.customerName ? `Customer: ${params.customerName}` : null,
      params.mobile ? `Mobile: ${params.mobile}` : null,
    ]);
  }

  if (action === "agent_support") {
    return compactLines([
      "I am an agent and need support regarding a customer application.",
      params.applicationId ? `Application ID: ${params.applicationId}` : null,
      serviceName ? `Service: ${serviceName}` : null,
      params.status ? `Current Status: ${params.status}` : null,
      params.customerName ? `Customer: ${params.customerName}` : null,
      params.mobile ? `Mobile: ${params.mobile}` : null,
    ]);
  }

  return compactLines([
    "I need support regarding my application.",
    params.applicationId ? `Application ID: ${params.applicationId}` : null,
    serviceName ? `Service: ${serviceName}` : null,
    params.status ? `Current Status: ${params.status}` : null,
  ]);
}

export function buildInvoiceWhatsAppMessage(params: {
  invoiceNumber?: string | null;
  serviceName?: string | null;
  amount?: string | number | null;
  status?: string | null;
}) {
  return compactLines([
    "I need help regarding this invoice.",
    params.invoiceNumber ? `Invoice No: ${params.invoiceNumber}` : null,
    params.serviceName ? `Service: ${params.serviceName}` : null,
    amountText(params.amount) ? `Amount: ${amountText(params.amount)}` : null,
    params.status ? `Status: ${params.status}` : null,
  ]);
}

export function buildSupportWhatsAppMessage(params: {
  page?: "homepage" | "header" | "footer" | "customer_dashboard" | "floating" | "contact" | "account" | string;
  customerName?: string | null;
  mobile?: string | null;
  topic?: string | null;
}) {
  if (params.page === "homepage") {
    return "I want to know about DigiConnect Dukan online services. Please share service details and process.";
  }

  return compactLines([
    "I need support for my DigiConnect Dukan account/application.",
    params.topic ? `Topic: ${params.topic}` : null,
    params.customerName ? `Name: ${params.customerName}` : null,
    params.mobile ? `Mobile: ${params.mobile}` : null,
    params.page ? `Page: ${params.page}` : null,
  ]);
}

export function buildAgentWhatsAppMessage(params: {
  agentName?: string | null;
  applicationId?: string | null;
  serviceName?: string | null;
  customerName?: string | null;
  topic?: string | null;
}) {
  return compactLines([
    "I am an agent and need support regarding customer application.",
    params.agentName ? `Agent: ${params.agentName}` : null,
    params.applicationId ? `Application ID: ${params.applicationId}` : null,
    params.serviceName ? `Service: ${params.serviceName}` : null,
    params.customerName ? `Customer: ${params.customerName}` : null,
    params.topic ? `Topic: ${params.topic}` : null,
  ]);
}
