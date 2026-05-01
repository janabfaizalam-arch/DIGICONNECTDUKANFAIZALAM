import {
  BadgeCheck,
  Building2,
  CarFront,
  ClipboardCheck,
  FileCheck2,
  FileHeart,
  FileText,
  HeartPulse,
  IdCard,
  Landmark,
  Store,
  ShieldCheck,
  Tractor,
  Utensils,
  WalletCards,
} from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

export const services = [
  { title: "Aadhaar Card Update & Print", slug: "aadhaar-update", icon: IdCard },
  { title: "PAN Card Apply/Correction", slug: "pan-card", icon: FileCheck2 },
  { title: "Voter ID", slug: "voter-id", icon: BadgeCheck },
  { title: "Ration Card", slug: "ration-card", icon: WalletCards },
  { title: "Labour Card / e-Shram Card", slug: "labour-card-e-shram-card", icon: ClipboardCheck },
  { title: "Ayushman Card", slug: "ayushman-card", icon: HeartPulse },
  { title: "Passport Assistance", slug: "passport-assistance", icon: ShieldCheck },
  { title: "Driving Licence", slug: "driving-licence", icon: CarFront },
  { title: "Birth & Death Certificate", slug: "birth-death-certificate", icon: FileHeart },
  { title: "Income, Caste, Domicile Certificate", slug: "income-caste-domicile-certificate", icon: FileText },
  { title: "GST Registration & Filing", slug: "gst-registration", icon: Building2 },
  { title: "MSME Certificate", slug: "msme", icon: Landmark },
  { title: "PM Kisan / Pension Schemes", slug: "pm-kisan-pension-schemes", icon: Tractor },
  { title: "Food License", slug: "food-license", icon: Utensils },
  { title: "Trade License / Shop Act", slug: "trade-license", icon: Store },
];

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
    title: "Powered by RNoS India Pvt Ltd",
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
  officeSupportPhone: "9305086491",
  email: "digiconnectdukan@rnos.in",
  website: "https://www.rnos.in",
  availability: "Service available across India",
};

export function createWhatsappLink(serviceName?: string) {
  return generateWhatsAppLink(serviceName);
}
