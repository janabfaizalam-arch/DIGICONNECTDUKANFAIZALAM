import {
  BadgeCheck,
  Building2,
  CarFront,
  FileCheck2,
  IdCard,
  ShieldCheck,
} from "lucide-react";

export const services = [
  { title: "PAN Card", slug: "pan-card", icon: FileCheck2 },
  { title: "Aadhaar Update", slug: "aadhaar-update", icon: IdCard },
  { title: "Voter ID", slug: "voter-id", icon: BadgeCheck },
  { title: "Passport", slug: "passport", icon: ShieldCheck },
  { title: "Driving Licence", slug: "driving-licence", icon: CarFront },
  { title: "GST", slug: "gst-registration", icon: Building2 },
];

export const features = [
  "1000+ Happy Customers",
  "Fast Service",
  "Trusted Local Center",
];

export const processSteps = [
  "Apply",
  "Submit Documents",
  "Get Service",
];

export const contactDetails = {
  phone: "7007595931",
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
