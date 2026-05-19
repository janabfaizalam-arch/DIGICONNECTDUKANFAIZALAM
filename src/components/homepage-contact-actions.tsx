import { MessageCircle } from "lucide-react";

import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export function HomepageContactActions() {
  const whatsappUrl = buildWhatsAppUrl(buildSupportWhatsAppMessage({ page: "floating", topic: "Website service enquiry" }));

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with DigiConnect Dukan on WhatsApp"
      className="whatsapp-floating-button"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
