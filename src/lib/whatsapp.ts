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

export function cleanIndianCustomerWhatsAppNumber(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const withoutCountry = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  const mobile = withoutCountry.slice(-10);

  if (!/^[6-9]\d{9}$/.test(mobile)) return "";
  return `91${mobile}`;
}

export function buildCustomerWhatsAppUrl(message: string, mobile: unknown) {
  const number = cleanIndianCustomerWhatsAppNumber(mobile);
  if (!number) return "";
  return buildWhatsAppUrl(message, number);
}

export function buildAdminCustomerWhatsAppMessage(params: {
  applicationId?: string | null;
  serviceName?: string | null;
  customerName?: string | null;
  kind: "documents_required" | "payment_pending" | "in_progress" | "completed" | "objection" | "general";
}) {
  const serviceName = clean(params.serviceName) || "your service";
  const greeting = params.customerName ? `Hello ${params.customerName},` : "Hello,";
  const footer = params.applicationId ? `Application ID: ${params.applicationId}` : null;

  if (params.kind === "documents_required") {
    return compactLines([greeting, `Documents are required to continue your ${serviceName} application. Please share the pending documents.`, footer]);
  }

  if (params.kind === "payment_pending") {
    return compactLines([greeting, `Payment is pending for your ${serviceName} application. Please complete payment so we can proceed.`, footer]);
  }

  if (params.kind === "in_progress") {
    return compactLines([greeting, `Your ${serviceName} application is in progress. We will update you as soon as the next step is complete.`, footer]);
  }

  if (params.kind === "completed") {
    return compactLines([greeting, `Your ${serviceName} application has been completed/delivered. Please check the final document or contact us if you need help.`, footer]);
  }

  if (params.kind === "objection") {
    return compactLines([greeting, `An objection/reply is needed for your ${serviceName} application. Please contact us and share the required response/documents.`, footer]);
  }

  return compactLines([greeting, `We are contacting you about your ${serviceName} application.`, footer]);
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
