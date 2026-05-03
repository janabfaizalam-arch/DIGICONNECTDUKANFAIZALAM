import { MessageCircle } from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

export function HomepageContactActions() {
  return (
    <a
      href={generateWhatsAppLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with DigiConnect Dukan on WhatsApp"
      className="whatsapp-floating-button"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
