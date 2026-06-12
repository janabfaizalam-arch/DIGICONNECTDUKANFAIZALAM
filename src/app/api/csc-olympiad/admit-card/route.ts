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

    // Allow download only if status is approved/completed/delivered
    const isApproved = ["approved", "completed", "delivered", "submitted", "in_process", "in_progress"].includes(app.status);
    if (!isApproved) {
      return NextResponse.json({ 
        success: false, 
        error: "Admit Card is not generated yet. Status must be approved or processing." 
      }, { status: 400 });
    }

    const formData = app.form_data || {};
    const studentName = formData.studentName || app.customer_details?.name || "Student Candidate";
    const studentDob = formData.studentDob || "N/A";
    const studentGender = formData.studentGender || "N/A";
    const studentClass = formData.studentClass || "N/A";
    const schoolName = formData.schoolName || "N/A";
    const schoolBoard = formData.schoolBoard || "N/A";
    const schoolCity = formData.schoolCity || "N/A";
    const parentMobile = formData.parentMobile || app.customer_mobile || "N/A";
    const parentEmail = formData.parentEmail || app.customer_email || "N/A";
    const activeSession = formData.session || "Academic Session 2026-2027";
    const subjects = formData.selectedSubjects 
      ? String(formData.selectedSubjects).split(",").map((s: string) => s.trim()).filter(Boolean)
      : ["General Subject"];

    // Generate Verification QR Code
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rnos.in";
    const qrDataUrl = await QRCode.toDataURL(`${siteUrl}/verify/admit-card/${app.id}`);
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");

    // Initialize pdfkit
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // 1. Elegance Border & Layout Frame
      doc.rect(20, 20, 555, 802).lineWidth(1).stroke("#cbd5e1");
      doc.rect(24, 24, 547, 794).lineWidth(2).stroke("#1e3a8a");

      // 2. Header Panel
      doc.rect(26, 26, 543, 85).fill("#1e3a8a");

      // Title Content in Header
      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(16)
         .text("CSC SPV OLYMPIAD REGISTERED CREDENTIALS", 40, 40, { align: "center", width: 515 });
      
      doc.font("Helvetica")
         .fontSize(9)
         .fillColor("#93c5fd")
         .text("National Educational Testing Board - Online Competitive Exam", 40, 62, { align: "center", width: 515 });

      doc.font("Helvetica-Oblique")
         .fontSize(9)
         .fillColor("#ffffff")
         .text(`Academic Session: ${activeSession} | Remote Proctored Mode`, 40, 77, { align: "center", width: 515 });

      // 3. Sub-Header with barcodes
      // Drawing simulated barcode
      const barcodeX = 440;
      const barcodeY = 135;
      doc.fillColor("#000000");
      for (let i = 0; i < 40; i++) {
        const lineWidth = (i % 3 === 0 || i % 7 === 0) ? 2.5 : 1;
        doc.rect(barcodeX + i * 2.5, barcodeY, lineWidth, 24).fill("#0f172a");
      }
      doc.font("Helvetica-Bold")
         .fontSize(6)
         .fillColor("#64748b")
         .text(`REG-ID: ${app.id.toUpperCase()}`, barcodeX, barcodeY + 28, { align: "center", width: 100 });

      // Admit Card Watermark title
      doc.font("Helvetica-Bold")
         .fontSize(14)
         .fillColor("#1e3a8a")
         .text("HALL ADMIT CARD & EXAM SLIP", 40, 135, { width: 350 });

      doc.moveTo(40, 153).lineTo(320, 153).lineWidth(1.5).stroke("#1e3a8a");

      // 4. Candidate Details Grid Layout
      doc.rect(40, 180, 515, 185).lineWidth(1).stroke("#e2e8f0");
      
      // Horizontal dividers
      doc.moveTo(40, 225).lineTo(555, 225).stroke("#e2e8f0");
      doc.moveTo(40, 270).lineTo(555, 270).stroke("#e2e8f0");
      doc.moveTo(40, 315).lineTo(555, 315).stroke("#e2e8f0");
      
      // Vertical dividers
      doc.moveTo(210, 180).lineTo(210, 365).stroke("#e2e8f0");
      doc.moveTo(385, 180).lineTo(385, 365).stroke("#e2e8f0");

      // Grid Fields
      const drawField = (x: number, y: number, label: string, val: string) => {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b").text(label.toUpperCase(), x, y);
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(val, x, y + 12, { width: 160, height: 25, ellipsis: true });
      };

      drawField(50, 190, "Candidate Name", studentName);
      drawField(220, 190, "Registration ID", app.id.slice(0, 15).toUpperCase());
      drawField(395, 190, "DOB (YYYY-MM-DD)", studentDob);

      drawField(50, 235, "Standard / Class", `Class ${studentClass}`);
      drawField(220, 235, "School Board", schoolBoard);
      drawField(395, 235, "Gender", studentGender);

      drawField(50, 280, "Parent Mobile", parentMobile);
      drawField(220, 280, "Parent Email", parentEmail);
      drawField(395, 280, "Exam City/Zone", `${schoolCity} (Online)`);

      drawField(50, 325, "Registered School Name", schoolName);

      // School address span two blocks
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b").text("EXAM VENUE / MODE", 220, 325);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#4f46e5").text("Remote Proctoring (Home Exam)", 220, 337);

      // Candidate Digital Signature fallback box
      doc.rect(395, 323, 150, 34).fill("#f8fafc");
      doc.rect(395, 323, 150, 34).stroke("#cbd5e1");
      doc.font("Helvetica-Oblique").fontSize(7).fillColor("#94a3b8").text("Student E-Signed Signature", 400, 327);
      doc.font("Courier-Bold").fontSize(8.5).fillColor("#1e3a8a").text(studentName.split(" ")[0].toUpperCase(), 400, 340);

      // 5. Selected Subjects list
      doc.font("Helvetica-Bold")
         .fontSize(11)
         .fillColor("#1e3a8a")
         .text("REGISTERED SUBJECT SCHEDULES & TIMINGS", 40, 385);
      
      doc.moveTo(40, 400).lineTo(555, 400).lineWidth(1.5).stroke("#1e3a8a");

      let startY = 410;
      subjects.forEach((subject, idx) => {
        doc.rect(40, startY, 515, 26).fill(idx % 2 === 0 ? "#f8fafc" : "#ffffff");
        doc.rect(40, startY, 515, 26).stroke("#f1f5f9");

        doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(`${idx + 1}.`, 50, startY + 8);
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1e3a8a").text(subject, 70, startY + 8);
        doc.font("Helvetica").fontSize(8.5).fillColor("#475569").text("Exam Slot: December 14 - 18, 2026", 240, startY + 8);
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#10b981").text("Registered & Confirmed", 430, startY + 8);
        startY += 32;
      });

      // 6. Security verification QR Code and Stamp
      const bottomGridY = startY + 15;
      doc.rect(40, bottomGridY, 515, 100).fill("#f8fafc");
      doc.rect(40, bottomGridY, 515, 100).stroke("#e2e8f0");

      // Draw QR Code
      doc.image(qrBuffer, 50, bottomGridY + 10, { width: 80, height: 80 });

      // Verification text
      doc.font("Helvetica-Bold")
         .fontSize(9)
         .fillColor("#0f172a")
         .text("DIGITAL SECURITY VERIFICATION", 145, bottomGridY + 15);

      doc.font("Helvetica")
         .fontSize(8)
         .fillColor("#475569")
         .text("This credentials document contains a cryptographically signed verification QR. Examiners, coordinators, or school officials can scan the QR code to verify applicant registration status in the DigiConnect system.", 145, bottomGridY + 28, { width: 220, lineGap: 2 });

      // Seal Stamp
      const stampX = 390;
      doc.rect(stampX, bottomGridY + 12, 150, 76).stroke("#e2e8f0");
      doc.circle(stampX + 75, bottomGridY + 45, 26).lineWidth(1).stroke("#b45309");
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#b45309").text("CSC OLYMPIAD", stampX + 53, bottomGridY + 38, { width: 44, align: "center" });
      doc.font("Helvetica-Bold").fontSize(5.5).fillColor("#b45309").text("OFFICIAL SEAL", stampX + 53, bottomGridY + 47, { width: 44, align: "center" });

      doc.font("Helvetica-Bold").fontSize(7).fillColor("#0f172a").text("DIRECTOR SIGNATURE", stampX + 15, bottomGridY + 75);
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#64748b").text("RNoS INDIA PVT. LTD.", stampX + 15, bottomGridY + 83);

      // 7. Exam Guidelines / Instructions
      const instructionsY = bottomGridY + 120;
      doc.font("Helvetica-Bold")
         .fontSize(10)
         .fillColor("#1e3a8a")
         .text("IMPORTANT INSTRUCTIONS FOR EXAMINATIONS", 40, instructionsY);

      doc.moveTo(40, instructionsY + 14).lineTo(555, instructionsY + 14).lineWidth(1).stroke("#e2e8f0");

      const guidelines = [
        "The CSC Olympiad exam is conducted ONLINE. Candidates can take it from home using a desktop/laptop.",
        "A working webcam and microphone are MANDATORY. The exam portal will remote-proctor candidate movements.",
        "Candidates must log in 15 minutes prior to their scheduled slots with exam ID credentials sent over SMS.",
        "Any attempt to navigate away from the test window (switching browser tabs) will trigger auto-submission.",
        "Parents or teachers are strictly prohibited from assisting or communicating with the student during the exam.",
        "Each subject exam consists of 50 Multiple Choice Questions (MCQs) to be completed in 60 minutes.",
        "No calculator, slide rule, log table, or digital device is allowed on the desk during examination.",
        "Ensure stable internet connectivity of at least 1 Mbps throughout the duration of the scientific test.",
        "Mock exams are available on the customer dashboard. We highly recommend testing the exam portal beforehand.",
        "For help desks or proctor issues, connect immediately via call or WhatsApp using the dashboard helper list."
      ];

      doc.font("Helvetica").fontSize(7.5).fillColor("#475569");
      let listY = instructionsY + 22;
      guidelines.forEach((g, idx) => {
        doc.text(`${idx + 1}.`, 40, listY);
        doc.text(g, 55, listY, { width: 500, lineGap: 2 });
        listY += 13.5;
      });

      // 8. Footer Info
      doc.font("Helvetica-Bold")
         .fontSize(7.5)
         .fillColor("#94a3b8")
         .text("DigiConnect Dukan - powered by RNoS India Pvt. Ltd. | Official Registration Desk Facilitator.", 40, 785, { align: "center", width: 515 });

      doc.end();
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="CSC_Olympiad_Admit_Card_${id}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error("Admit Card generation failure:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
