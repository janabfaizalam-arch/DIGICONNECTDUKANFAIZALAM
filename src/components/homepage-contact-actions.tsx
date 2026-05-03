import { MessageCircle, Phone } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export function HomepageContactActions() {
  return (
    <>
      <a
        href={generateWhatsAppLink()}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with DigiConnect Dukan on WhatsApp"
        className="whatsapp-floating-button"
      >
        <MessageCircle className="h-5 w-5" />
      </a>

      <div className="mobile-bottom-contact-bar md:hidden">
        <a href={`tel:+91${contactDetails.primaryPhone}`} className="mobile-bottom-contact-button mobile-bottom-contact-call">
          <Phone className="h-4 w-4" />
          Call Now
        </a>
        <a
          href={generateWhatsAppLink()}
          target="_blank"
          rel="noreferrer"
          className="mobile-bottom-contact-button mobile-bottom-contact-whatsapp"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </>
  );
}
