import sharp from "sharp";
import path from "path";
import fs from "fs";

const assets = "C:/Users/DigiConnect Dukan/.cursor/projects/d-digiconnectdukanfaizalam/assets";
const outRoot = path.join(process.cwd(), "public/images/homepage");

const jobs = [
  { src: "hero-assistance-desktop.png", dest: "hero-assistance-desktop.webp", w: 1600, h: 560 },
  { src: "hero-assistance-mobile.png", dest: "hero-assistance-mobile.webp", w: 900, h: 720 },
  { src: "service-gst-registration.png", dest: "services/gst-registration.webp", w: 800, h: 520 },
  { src: "service-itr-filing.png", dest: "services/itr-filing.webp", w: 800, h: 520 },
  { src: "service-msme-registration.png", dest: "services/msme-registration.webp", w: 800, h: 520 },
  { src: "service-cibil-report.png", dest: "services/cibil-report.webp", w: 800, h: 520 },
  { src: "service-passport-service.png", dest: "services/passport-service.webp", w: 800, h: 520 },
  { src: "service-bill-payments.png", dest: "services/bill-payments.webp", w: 800, h: 520 },
  { src: "category-government.png", dest: "categories/government.webp", w: 640, h: 400, fit: "contain", bg: "#e8f8f1" },
  { src: "category-banking-finance.png", dest: "categories/banking-finance.webp", w: 640, h: 400, fit: "contain", bg: "#eaf4ff" },
  { src: "category-bill-payments.png", dest: "categories/bill-payments.webp", w: 640, h: 400, fit: "contain", bg: "#fff9ed" },
  { src: "category-insurance.png", dest: "categories/insurance.webp", w: 640, h: 400, fit: "contain", bg: "#fff1e8" },
  { src: "category-travel.png", dest: "categories/travel.webp", w: 640, h: 400, fit: "contain", bg: "#fff1f2" },
  { src: "category-business.png", dest: "categories/business.webp", w: 640, h: 400, fit: "contain", bg: "#f0ebff" },
];

for (const job of jobs) {
  const input = path.join(assets, job.src);
  const output = path.join(outRoot, job.dest);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (!fs.existsSync(input)) {
    console.error("MISSING", input);
    continue;
  }
  const fit = job.fit || "cover";
  let pipeline = sharp(input).resize(job.w, job.h, {
    fit,
    position: fit === "contain" ? "right bottom" : "centre",
    background: job.bg || "#ffffff",
  });
  if (fit === "contain" && job.bg) {
    pipeline = pipeline.flatten({ background: job.bg });
  }
  await pipeline.webp({ quality: 88 }).toFile(output);
  const st = fs.statSync(output);
  console.log(`${job.dest} ${(st.size / 1024).toFixed(1)}KB`);
}
