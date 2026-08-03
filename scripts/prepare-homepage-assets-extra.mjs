import sharp from "sharp";
import path from "path";
import fs from "fs";

const assets = "C:/Users/DigiConnect Dukan/.cursor/projects/d-digiconnectdukanfaizalam/assets";
const outRoot = path.join(process.cwd(), "public/images/homepage");

const jobs = [
  { src: "category-cards-pvc.png", dest: "categories/cards-pvc.webp", w: 640, h: 400, fit: "contain", bg: "#e8f8f1" },
  { src: "category-loans-schemes.png", dest: "categories/loans-schemes.webp", w: 640, h: 400, fit: "contain", bg: "#e5f8f3" },
  { src: "category-tax-gst.png", dest: "categories/tax-gst.webp", w: 640, h: 400, fit: "contain", bg: "#fff1e6" },
  { src: "category-company-compliance.png", dest: "categories/company-compliance.webp", w: 640, h: 400, fit: "contain", bg: "#f0ebff" },
  { src: "trust-secure-assistance.png", dest: "illustrations/trust-secure.webp", w: 720, h: 540, fit: "cover" },
  { src: "tracking-timeline.png", dest: "illustrations/tracking-timeline.webp", w: 720, h: 540, fit: "cover" },
  { src: "rewards-wallet.png", dest: "illustrations/rewards-wallet.webp", w: 720, h: 540, fit: "cover" },
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
