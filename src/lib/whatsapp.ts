const whatsappNumber = "917007595931";

function normalizeMobile(mobile?: string) {
  const digits = String(mobile ?? "").replace(/\D/g, "");

  if (!digits) {
    return whatsappNumber;
  }

  return digits.length === 10 ? `91${digits}` : digits;
}

export function generateWhatsAppLink(mobileOrServiceName?: string, customMessage?: string) {
  const message = customMessage
    ? customMessage
    : mobileOrServiceName
      ? `I want to apply for ${mobileOrServiceName}. Please share required documents and charges.`
      : "I want to apply for a service from DigiConnect Dukan. Please share details.";
  const recipient = customMessage ? normalizeMobile(mobileOrServiceName) : whatsappNumber;

  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}
