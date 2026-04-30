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

export const services = [
  { title: "Aadhaar Card Update & Print", slug: "aadhaar-update", icon: IdCard },
  { title: "PAN Card Apply/Correction", slug: "pan-card", icon: FileCheck2 },
  { title: "Voter ID", slug: "voter-id", icon: BadgeCheck },
  { title: "Ration Card", slug: "ration-card", icon: WalletCards },
  { title: "Labour Card / e-Shram Card", slug: "labour-card-e-shram-card", icon: ClipboardCheck },
  { title: "Ayushman Card", slug: "ayushman-card", icon: HeartPulse },
  { title: "Passport Assistance", slug: "passport", icon: ShieldCheck },
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
    title: "Fast Same Day Process",
    description: "Urgent requests par quick start aur clear next-step update.",
  },
  {
    title: "Local Office Support",
    description: "Orai aur Jalaun offices par direct customer assistance.",
  },
  {
    title: "Document Guidance",
    description: "Form submit karne se pehle required papers ki simple checklist.",
  },
  {
    title: "Secure & Private Handling",
    description: "Customer documents ko carefully aur responsibly handle kiya jata hai.",
  },
  {
    title: "Powered by RNoS India Pvt Ltd",
    description: "Professional process, organized records aur reliable support.",
  },
  {
    title: "Call/WhatsApp Support",
    description: "Application se pehle aur baad me quick help available.",
  },
];

export const processSteps = [
  {
    title: "Apply Online / WhatsApp",
    description: "Service choose karke form bharein ya WhatsApp par request bhejein.",
  },
  {
    title: "Submit Documents",
    description: "Team aapko exact document list batayegi, phir files submit karein.",
  },
  {
    title: "Get Service Update",
    description: "Process start hote hi status update call ya WhatsApp par milta rahega.",
  },
];

export const contactDetails = {
  phone: "9305086491",
  ownerPhone: "7007595931",
  officePhone: "9305086491",
  email: "digiconnectdukan@rnos.in",
  website: "https://www.rnos.in",
  whatsapp: "917007595931",
  offices: [
    "Machchhar Choraha, Orai",
    "Tehsil Road, Jalaun",
  ],
};

export function createWhatsappLink(source = "Website") {
  const message = `Mujhe service chahiye. Source: ${source}`;

  return `https://wa.me/${contactDetails.whatsapp}?text=${encodeURIComponent(message)}`;
}
