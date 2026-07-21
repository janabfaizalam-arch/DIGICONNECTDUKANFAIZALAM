/**
 * Safe Digi Partner marketing captions.
 * Never invent prices, discounts, cashback or government claims.
 */

export function buildPartnerWhatsAppCaption(input: {
  serviceTitle: string;
  partnerName: string;
  partnerCode: string;
}): string {
  const title = input.serviceTitle.trim() || "DigiConnect Dukan services";
  const name = input.partnerName.trim() || "Digi Partner";
  const code = input.partnerCode.trim() || "—";

  return [
    `Namaste! I am ${name} (Digi Partner ${code}) with DigiConnect Dukan.`,
    `I can help you with ${title} — document guidance, application support and status updates.`,
    `DigiConnect Dukan — Connecting People. Empowering Digital India.`,
    `Powered by RNoS India Pvt. Ltd.`,
  ].join("\n\n");
}

/** True when a caption contains fabricated commercial claims we must never ship. */
export function captionContainsFabricatedClaims(caption: string): boolean {
  return /(cashback|guaranteed approval|govt approved discount|₹\s*\d)/i.test(caption);
}
