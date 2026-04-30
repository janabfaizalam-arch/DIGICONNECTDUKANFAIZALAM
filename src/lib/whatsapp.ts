const whatsappNumber = "917007595931";

export function generateWhatsAppLink(serviceName?: string) {
  const message = serviceName
    ? `I want to apply for ${serviceName}. Please share required documents and charges.`
    : "I want to apply for a service from DigiConnect Dukan. Please share details.";

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
