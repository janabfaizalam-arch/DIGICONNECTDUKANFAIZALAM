import "server-only";

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

import type { Invoice } from "@/lib/portal-types";

/**
 * A downloadable PDF of an online (application) invoice — the file the
 * WhatsApp invoice link opens. Same content as `/invoice/[id]`, laid out for
 * paper, in the style of the offline invoice PDF.
 */

function rupees(value: unknown) {
  const amount = Number(value ?? 0);
  return `Rs ${Number.isFinite(amount) ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;
}

function text(value: unknown, fallback = "-") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
}

const PAYMENT_LABELS: Record<string, string> = {
  verified: "Paid",
  paid: "Paid",
  pending: "Payment pending",
  failed: "Payment failed",
  refunded: "Refunded",
};

function toBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function buildApplicationInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "public", "digiconnect-dukan-logo-original.png");
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: { Title: invoice.invoice_number, Author: "DigiConnect Dukan" },
  });
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, 112).fill("#eff6ff");
  if (fs.existsSync(logoPath)) doc.image(logoPath, 40, 28, { fit: [58, 58] });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(22).text("DigiConnect Dukan", 112, 30);
  doc.fillColor("#475569").font("Helvetica-Bold").fontSize(10).text("Powered by RNOS India Pvt Ltd", 112, 58);
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text("Official service invoice", 112, 75);
  doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(10).text("INVOICE", 390, 30, { width: 165, align: "right" });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text(invoice.invoice_number, 330, 48, { width: 225, align: "right" });
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(formatDate(invoice.created_at), 330, 68, { width: 225, align: "right" });

  let y = 140;
  doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8).text("BILL TO", 40, y);
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(text(invoice.customer_name, "Customer"), 40, y + 13, { width: 250 });
  doc.fillColor("#475569").font("Helvetica").fontSize(9);
  doc.text(text(invoice.customer_mobile, ""), 40, y + 30, { width: 250 });
  doc.text(text(invoice.customer_email, ""), 40, y + 43, { width: 250 });

  doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8).text("PAYMENT", 330, y, { width: 225, align: "right" });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(
    PAYMENT_LABELS[String(invoice.payment_status).toLowerCase()] ?? text(invoice.payment_status),
    330,
    y + 13,
    { width: 225, align: "right" },
  );
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text("Support: +91 7007595931, 9305086491", 330, y + 30, { width: 225, align: "right" });
  doc.text("rnos.in", 330, y + 43, { width: 225, align: "right" });

  y = 230;
  doc.rect(40, y, pageWidth - 80, 26).fill("#f1f5f9");
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(9);
  doc.text("SERVICE", 52, y + 9);
  doc.text("QTY", 380, y + 9, { width: 40, align: "center" });
  doc.text("AMOUNT", 440, y + 9, { width: 103, align: "right" });
  y += 34;

  const services = invoice.service_name
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  for (const service of services.length ? services : ["Service"]) {
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(service, 52, y, { width: 310 });
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text("Digital service application support", 52, y + 14, { width: 310 });
    doc.fillColor("#0f172a").font("Helvetica").fontSize(10).text("1", 380, y, { width: 40, align: "center" });
    doc.text(services.length > 1 ? "Included" : rupees(invoice.amount), 440, y, { width: 103, align: "right" });
    y += 34;
    doc.moveTo(40, y - 6).lineTo(pageWidth - 40, y - 6).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  }

  y += 10;
  const wallet = Number(invoice.wallet_used_amount ?? 0);
  if (wallet > 0) {
    doc.fillColor("#334155").font("Helvetica").fontSize(10).text("Wallet used", 330, y, { width: 110 });
    doc.text(`- ${rupees(wallet)}`, 440, y, { width: 103, align: "right" });
    y += 18;
  }
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Total", 330, y, { width: 110 });
  doc.text(rupees(invoice.amount), 440, y, { width: 103, align: "right" });

  y += 60;
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text(
    "Thank you for choosing DigiConnect Dukan. Keep this invoice for your records and application tracking.",
    40,
    y,
    { width: pageWidth - 80 },
  );

  return toBuffer(doc);
}
