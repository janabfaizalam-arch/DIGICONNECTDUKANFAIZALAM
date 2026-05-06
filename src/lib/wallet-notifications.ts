import { generateWhatsAppLink } from "@/lib/whatsapp";

export type WalletNotificationKind = "cashback_credited" | "wallet_expiring" | "wallet_used";

export function getWalletNotificationCopy(kind: WalletNotificationKind, amount: number, serviceName?: string) {
  const formattedAmount = `₹${amount.toLocaleString("en-IN")}`;

  if (kind === "cashback_credited") {
    return {
      title: "DigiWallet cashback credited",
      message: `${formattedAmount} cashback has been credited to your DigiWallet after successful completion${serviceName ? ` of ${serviceName}` : ""}.`,
      emailSubject: `Your DigiWallet cashback is credited: ${formattedAmount}`,
      whatsappText: `DigiConnect Dukan: ${formattedAmount} cashback has been credited to your DigiWallet. Use up to 50% on your next eligible service.`,
    };
  }

  if (kind === "wallet_expiring") {
    return {
      title: "DigiWallet balance expiring soon",
      message: `${formattedAmount} wallet credit is expiring soon. Use it on a future eligible service.`,
      emailSubject: `Your DigiWallet credit is expiring soon`,
      whatsappText: `DigiConnect Dukan: ${formattedAmount} DigiWallet credit is expiring soon. Use it before expiry on an eligible service.`,
    };
  }

  return {
    title: "DigiWallet used successfully",
    message: `${formattedAmount} DigiWallet credit was used successfully${serviceName ? ` for ${serviceName}` : ""}.`,
    emailSubject: `DigiWallet used successfully: ${formattedAmount}`,
    whatsappText: `DigiConnect Dukan: ${formattedAmount} DigiWallet credit was used successfully. Thank you for choosing us.`,
  };
}

export function getWalletWhatsAppLink(mobile: string, kind: WalletNotificationKind, amount: number, serviceName?: string) {
  const digits = mobile.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const copy = getWalletNotificationCopy(kind, amount, serviceName);

  return generateWhatsAppLink(normalized, copy.whatsappText);
}
