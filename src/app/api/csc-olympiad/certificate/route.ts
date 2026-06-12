import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Application ID is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized access. Please login." }, { status: 401 });
    }

    // Fetch the application
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    // Check ownership or admin/agent role
    const userRole = user.user_metadata?.role || "customer";
    if (app.user_id !== user.id && userRole !== "admin" && userRole !== "agent") {
      return NextResponse.json({ success: false, error: "Access denied to this resource" }, { status: 403 });
    }

    if (app.service_slug !== "csc-olympiad") {
      return NextResponse.json({ success: false, error: "This application is not for CSC Olympiad" }, { status: 400 });
    }

    // Allow download only if status is completed/delivered
    const isCompleted = ["completed", "delivered"].includes(app.status);
    if (!isCompleted) {
      return NextResponse.json({ 
        success: false, 
        error: "Certificate is not generated yet. The exam must be completed and marked." 
      }, { status: 400 });
    }

    const formData = app.form_data || {};
    const studentName = formData.studentName || app.customer_details?.name || "Student Candidate";
    const studentClass = formData.studentClass || "N/A";
    const schoolName = formData.schoolName || "N/A";
    const schoolBoard = formData.schoolBoard || "N/A";
    const activeSession = formData.session || "Academic Session 2026-2027";
    const subjects = formData.selectedSubjects 
      ? String(formData.selectedSubjects).split(",").map((s: string) => s.trim()).filter(Boolean)
      : ["General Subject"];

    // Generate Verification QR Code
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rnos.in";
    const qrDataUrl = await QRCode.toDataURL(`${siteUrl}/verify/certificate/${app.id}`);
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");

    // Initialize pdfkit in LANDSCAPE mode
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const w = 841.89; // landscape A4 width
      const h = 595.28; // landscape A4 height

      // 1. Certificate Background Fill
      doc.rect(0, 0, w, h).fill("#faf9f5");

      // 2. Elegant Gold & Blue Borders
      doc.rect(20, 20, w - 40, h - 40).lineWidth(1).stroke("#d97706"); // Gold outer
      doc.rect(25, 25, w - 50, h - 50).lineWidth(3).stroke("#1e3a8a"); // Blue middle
      doc.rect(32, 32, w - 64, h - 64).lineWidth(1).stroke("#d97706"); // Gold inner

      // Decorative Corners
      const drawCorner = (cx: number, cy: number) => {
        doc.rect(cx, cy, 15, 15).fill("#d97706");
      };
      drawCorner(32, 32);
      drawCorner(w - 47, 32);
      drawCorner(32, h - 47);
      drawCorner(w - 47, h - 47);

      // 3. Header Text
      doc.fillColor("#1e3a8a")
         .font("Helvetica-Bold")
         .fontSize(14)
         .text("NATIONAL CSC SPV OLYMPIAD", 40, 60, { align: "center", width: w - 80 });

      doc.fillColor("#d97706")
         .font("Helvetica")
         .fontSize(9)
         .text(`Academic Session: ${activeSession} | Educational Testing Services`, 40, 80, { align: "center", width: w - 80 });

      // Gold line separator
      doc.moveTo(220, 100).lineTo(w - 220, 100).lineWidth(1.5).stroke("#d97706");

      // 4. Main Certificate Title
      doc.fillColor("#1e3a8a")
         .font("Helvetica-Bold")
         .fontSize(28)
         .text("CERTIFICATE OF EXCELLENCE", 40, 120, { align: "center", width: w - 80 });

      doc.fillColor("#475569")
         .font("Helvetica-Oblique")
         .fontSize(11)
         .text("This certificate of honor and high merit is proudly presented to", 40, 175, { align: "center", width: w - 80 });

      // 5. Student Name (Large Gold Calligraphy font fallback)
      doc.fillColor("#d97706")
         .font("Helvetica-Bold")
         .fontSize(24)
         .text(studentName, 40, 205, { align: "center", width: w - 80 });

      // Divider below student name
      doc.moveTo(280, 235).lineTo(w - 280, 235).lineWidth(1).stroke("#cbd5e1");

      // 6. Educational details text block
      doc.fillColor("#475569")
         .font("Helvetica")
         .fontSize(11.5);

      const subjectsStr = subjects.join(", ");
      const bodyText = `a student of Class ${studentClass} from ${schoolName} (${schoolBoard}), for successfully participating in the National CSC Olympiad examinations and displaying exceptional academic proficiency, securing a meritorious position in the subjects of:`;

      doc.text(bodyText, 100, 255, { align: "center", width: w - 200, lineGap: 4 });

      // Highlighted subjects list
      doc.fillColor("#1e3a8a")
         .font("Helvetica-Bold")
         .fontSize(12)
         .text(subjectsStr, 80, 325, { align: "center", width: w - 160 });

      doc.fillColor("#64748b")
         .font("Helvetica")
         .fontSize(9.5)
         .text(`Registration Ref ID: ${app.id.toUpperCase()}`, 40, 360, { align: "center", width: w - 80 });

      // 7. Footer blocks: Signatures, Seal & QR Code
      const footerY = 410;

      // Left: Verification QR Code
      doc.image(qrBuffer, 80, footerY, { width: 85, height: 85 });
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#64748b").text("SCAN QR TO VERIFY ONLINE", 70, footerY + 92, { width: 105, align: "center" });

      // Center: Official Medal Stamp Seal
      const sealX = w / 2 - 50;
      doc.circle(sealX + 50, footerY + 45, 36).lineWidth(1.5).stroke("#d97706");
      doc.circle(sealX + 50, footerY + 45, 32).lineWidth(1).stroke("#1e3a8a");
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#d97706").text("CSC OLYMPIAD", sealX + 22, footerY + 36, { width: 56, align: "center" });
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#1e3a8a").text("GOLD MERIT", sealX + 22, footerY + 46, { width: 56, align: "center" });
      doc.font("Helvetica").fontSize(5.5).fillColor("#d97706").text("★ 2026-2027 ★", sealX + 22, footerY + 54, { width: 56, align: "center" });

      // Right: Coordinator signature
      const coordinatorX = w - 230;
      doc.moveTo(coordinatorX, footerY + 65).lineTo(coordinatorX + 150, footerY + 65).lineWidth(1).stroke("#64748b");
      
      // Simulated signature handwriting trace
      doc.font("Courier-Oblique").fontSize(10.5).fillColor("#1e3a8a").text("CSC Olympiad Secretariat", coordinatorX + 10, footerY + 45);
      
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("EXAMINATION COORDINATOR", coordinatorX, footerY + 72, { width: 150, align: "center" });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b").text("National CSC Testing Board", coordinatorX, footerY + 83, { width: 150, align: "center" });

      // Final certificate compliance footer
      doc.font("Helvetica-Bold")
         .fontSize(7.5)
         .fillColor("#94a3b8")
         .text("This credentials document has been digitalized and approved by the registration facilitation desk of DigiConnect Dukan (powered by RNoS India Pvt. Ltd.)", 40, 545, { align: "center", width: w - 80 });

      doc.end();
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="CSC_Olympiad_Certificate_${id}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error("Certificate generation failure:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
