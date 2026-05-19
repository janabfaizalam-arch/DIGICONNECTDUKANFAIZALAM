import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { servicesData } from "@/lib/services-data";

export const services = servicesData.map((service) => ({
  title: service.title,
  slug: service.slug,
  icon: service.icon,
}));

export const features = [
  {
    title: "Fast Processing",
    description: "Quick application handling with clear next-step updates.",
  },
  {
    title: "Expert Guidance",
    description: "Clear document guidance before you submit your request.",
  },
  {
    title: "Secure Data Handling",
    description: "Customer documents are handled with care and privacy.",
  },
  {
    title: "Pan India Service",
    description: "Online digital services are available across India.",
  },
  {
    title: "Online Support",
    description: "Get help before and after your application through call or WhatsApp.",
  },
  {
    title: "Powered by RNOS India Pvt Ltd",
    description: "Professional process, organized records, and reliable service support.",
  },
];

export const processSteps = [
  {
    title: "Apply Online",
    description: "Choose a service and submit your request through the online form.",
  },
  {
    title: "Submit Documents",
    description: "Our team shares the required document list and helps you submit files.",
  },
  {
    title: "Get Service Update",
    description: "Track progress through dashboard updates, calls, and WhatsApp support.",
  },
];

export const contactDetails = {
  phone: "7007595931",
  primaryPhone: "7007595931",
  officeSupportPhone: "7007595931",
  email: "digiconnectdukan@rnos.in",
  website: "https://www.rnos.in",
  availability: "Service available across India",
};

export function createWhatsappLink(serviceName?: string) {
  return buildWhatsAppUrl(buildServiceWhatsAppMessage({ serviceName, action: serviceName ? "enquiry" : "support" }));
}
