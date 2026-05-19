import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDate } from "@/lib/admin-format";
import { getOfflineInvoice } from "@/lib/offline-invoices";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

function currency(value: unknown) {
  const amount = Number(value ?? 0);
  return `Rs ${Number.isFinite(amount) ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;
}

function text(value: unknown, fallback = "-") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function pdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function drawLabelValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x, y, { width });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(value, x, y + 13, { width, lineGap: 2 });
}

function drawAmountRow(doc: PDFKit.PDFDocument, label: string, value: string, y: number, bold = false) {
  doc.fillColor("#334155").font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).text(label, 365, y, { width: 95 });
  doc.fillColor("#0f172a").font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).text(value, 460, y, { width: 75, align: "right" });
}

async function buildInvoicePdf(request: Request, id: string) {
  const invoice = await getOfflineInvoice(id);
  if (!invoice) return null;

  const supabase = getSupabaseAdmin();
  const { data: adminUser } = invoice.created_by && supabase
    ? await supabase.from("profiles").select("full_name, email").eq("id", invoice.created_by).maybeSingle()
    : { data: null };
  const adminName = text(adminUser?.full_name ?? adminUser?.email, "Admin");
  const baseUrl = new URL(request.url).origin;
  const invoiceUrl = `${baseUrl}/admin/offline-invoices/${invoice.id}`;
  const qrDataUrl = await QRCode.toDataURL(invoiceUrl, { margin: 1, width: 160 }).catch(() => "");
  const qrBuffer = qrDataUrl ? Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64") : null;
  const logoPath = path.join(process.cwd(), "public", "digiconnect-dukan-logo-original.png");
  const hasLogo = fs.existsSync(logoPath);

  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: invoice.invoice_number, Author: "DigiConnect Dukan" } });
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 80;
  const subtotal = Number(invoice.quantity) * Number(invoice.unit_price);
  const taxable = Math.max(subtotal - Number(invoice.discount), 0);
  const taxAmount = (taxable * Number(invoice.tax_percent)) / 100;

  doc.rect(0, 0, pageWidth, 112).fill("#eff6ff");
  if (hasLogo) doc.image(logoPath, 40, 28, { width: 58, height: 58, fit: [58, 58] });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(22).text("DigiConnect Dukan", 112, 30);
  doc.fillColor("#475569").font("Helvetica-Bold").fontSize(10).text("Powered by RNOS India Pvt Ltd", 112, 58);
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text("GST-ready offline service invoice", 112, 75);
  doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(10).text("TAX INVOICE", 390, 30, { width: 145, align: "right" });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(15).text(invoice.invoice_number, 320, 48, { width: 215, align: "right" });
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text(`Date: ${safeDate(invoice.created_at)}`, 390, 70, { width: 145, align: "right" });

  doc.roundedRect(40, 132, contentWidth, 118, 10).strokeColor("#dbeafe").lineWidth(1).stroke();
  doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(10).text("BILL TO", 58, 150);
  drawLabelValue(doc, "Customer", invoice.customer_name, 58, 172, 145);
  drawLabelValue(doc, "Mobile", invoice.mobile, 220, 172, 95);
  drawLabelValue(doc, "Email", text(invoice.email), 330, 172, 190);
  drawLabelValue(doc, "Customer GSTIN", text(invoice.gst_number, "Unregistered"), 58, 213, 145);
  drawLabelValue(doc, "Address", [invoice.address, invoice.city, invoice.state, invoice.pincode].filter(Boolean).join(", ") || "-", 220, 213, 300);

  doc.roundedRect(40, 270, contentWidth, 82, 10).strokeColor("#e2e8f0").lineWidth(1).stroke();
  drawLabelValue(doc, "Supplier", "DigiConnect Dukan", 58, 288, 145);
  drawLabelValue(doc, "GSTIN", "As applicable", 220, 288, 105);
  drawLabelValue(doc, "Admin Name", adminName, 340, 288, 180);
  drawLabelValue(doc, "Payment Status", invoice.payment_status, 58, 323, 145);
  drawLabelValue(doc, "Payment Method", invoice.payment_method, 220, 323, 145);
  drawLabelValue(doc, "Amount Paid", currency(invoice.amount_paid), 385, 323, 135);

  const tableTop = 382;
  doc.roundedRect(40, tableTop, contentWidth, 38, 8).fill("#0f172a");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  doc.text("SERVICE", 58, tableTop + 14, { width: 230 });
  doc.text("QTY", 310, tableTop + 14, { width: 45, align: "right" });
  doc.text("UNIT PRICE", 365, tableTop + 14, { width: 75, align: "right" });
  doc.text("AMOUNT", 456, tableTop + 14, { width: 64, align: "right" });

  doc.roundedRect(40, tableTop + 48, contentWidth, 96, 8).strokeColor("#e2e8f0").lineWidth(1).stroke();
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(invoice.service_name, 58, tableTop + 64, { width: 230 });
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text(text(invoice.service_category, ""), 58, tableTop + 82, { width: 230 });
  if (invoice.description) doc.fillColor("#475569").font("Helvetica").fontSize(8).text(invoice.description, 58, tableTop + 101, { width: 230, lineGap: 2 });
  doc.fillColor("#0f172a").font("Helvetica").fontSize(10);
  doc.text(String(invoice.quantity), 310, tableTop + 66, { width: 45, align: "right" });
  doc.text(currency(invoice.unit_price), 365, tableTop + 66, { width: 75, align: "right" });
  doc.font("Helvetica-Bold").text(currency(subtotal), 456, tableTop + 66, { width: 64, align: "right" });

  const summaryTop = tableTop + 174;
  doc.roundedRect(40, summaryTop, 275, 104, 10).fill("#f8fafc").strokeColor("#e2e8f0").stroke();
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("Payment Details", 58, summaryTop + 18);
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(`Amount paid: ${currency(invoice.amount_paid)}`, 58, summaryTop + 42);
  doc.text(`Balance due: ${currency(invoice.balance_due)}`, 58, summaryTop + 60);
  doc.text(`Invoice created by: ${adminName}`, 58, summaryTop + 78);

  doc.roundedRect(340, summaryTop, 195, 142, 10).strokeColor("#e2e8f0").stroke();
  drawAmountRow(doc, "Subtotal", currency(subtotal), summaryTop + 18);
  drawAmountRow(doc, "Discount", currency(invoice.discount), summaryTop + 39);
  drawAmountRow(doc, `Tax (${invoice.tax_percent}%)`, currency(taxAmount), summaryTop + 60);
  drawAmountRow(doc, "Extra Charges", currency(invoice.extra_charges), summaryTop + 81);
  doc.moveTo(358, summaryTop + 108).lineTo(518, summaryTop + 108).strokeColor("#e2e8f0").stroke();
  drawAmountRow(doc, "Total", currency(invoice.total_amount), summaryTop + 119, true);

  if (qrBuffer && qrBuffer.length) {
    doc.image(qrBuffer, 40, 675, { width: 74 });
    doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8).text("Scan to verify invoice", 122, 694, { width: 160 });
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(invoiceUrl, 122, 710, { width: 220 });
  }

  doc.fillColor("#64748b").font("Helvetica").fontSize(8).text("This is a system-generated invoice for offline/walk-in service billing.", 40, 785, { width: contentWidth, align: "center" });

  return pdfBuffer(doc);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const buffer = await buildInvoicePdf(request, id);
  if (!buffer) return NextResponse.json({ message: "Offline invoice not found." }, { status: 404 });

  const invoice = await getOfflineInvoice(id);
  const fileName = `${invoice?.invoice_number ?? "offline-invoice"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
