import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
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

    const formData = app.form_data || {};
    const studentName = formData.studentName || app.customer_details?.name || "Student";
    const studentClass = Number(formData.studentClass || 3);
    const activeSession = formData.session || "Academic Session 2026-2027";
    const subjects = formData.selectedSubjects 
      ? String(formData.selectedSubjects).split(",").map((s: string) => s.trim()).filter(Boolean)
      : ["General Subject"];

    // Initialize pdfkit A4 portrait
    const doc = new PDFDocument({ size: "A4", margin: 45 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // 1. Layout Frame
      doc.rect(20, 20, 555, 802).lineWidth(1).stroke("#cbd5e1");
      doc.rect(25, 25, 545, 792).lineWidth(1.5).stroke("#4f46e5"); // Indigo theme

      // Header Banner
      doc.rect(27, 27, 541, 70).fill("#4f46e5");
      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(15)
         .text("CSC OLYMPIAD SYLLABUS & PREPARATION GUIDE", 40, 40, { align: "center", width: 515 });
      doc.font("Helvetica")
         .fontSize(8.5)
         .fillColor("#e0e7ff")
         .text(`Academic Session: ${activeSession} | Customized Candidate Prep Guide`, 40, 60, { align: "center", width: 515 });

      // Student Header
      doc.fillColor("#0f172a")
         .font("Helvetica-Bold")
         .fontSize(12)
         .text("STUDENT PROFILE DETAILS", 40, 115);
      doc.moveTo(40, 130).lineTo(555, 130).lineWidth(1).stroke("#e2e8f0");

      doc.font("Helvetica").fontSize(9).fillColor("#475569");
      doc.text("Candidate Name:", 45, 140);
      doc.font("Helvetica-Bold").fillColor("#0f172a").text(studentName, 145, 140);

      doc.font("Helvetica").fillColor("#475569").text("Enrolled Class:", 45, 155);
      doc.font("Helvetica-Bold").fillColor("#0f172a").text(`Class ${studentClass}`, 145, 155);

      doc.font("Helvetica").fillColor("#475569").text("Registered Subjects:", 45, 170);
      doc.font("Helvetica-Bold").fillColor("#4f46e5").text(subjects.join(", "), 145, 170, { width: 390 });

      // Syllabus Section
      doc.font("Helvetica-Bold")
         .fontSize(12)
         .fillColor("#0f172a")
         .text("SUBJECT-WISE STUDY TOPICS & SCHEME", 40, 205);
      doc.moveTo(40, 220).lineTo(555, 220).lineWidth(1).stroke("#e2e8f0");

      // Generate syllabus based on class range
      let syllabusTopics: { subject: string; topics: string[] }[] = [];
      
      const isElementary = studentClass >= 3 && studentClass <= 5;
      const isMiddle = studentClass >= 6 && studentClass <= 8;
      const isSecondary = studentClass >= 9 && studentClass <= 10;
      const isHigherSecondary = studentClass >= 11 && studentClass <= 12;

      subjects.forEach((subj) => {
        const name = subj.toLowerCase();
        let topics: string[] = [];

        if (name.includes("math")) {
          if (isElementary) {
            topics = ["Numbers up to 5 digits, Roman Numerals", "Addition, Subtraction, Multiplication, Division", "Fractions, Decimals, Money arithmetic", "Basic Geometry (Shapes, Perimeter)", "Data handling and simple graphs"];
          } else if (isMiddle) {
            topics = ["Integers, Rational Numbers, Decimals", "Simple Algebraic expressions, Linear equations", "Exponents and Powers", "Practical Geometry, Triangles, Quadrilaterals", "Ratio and Proportion, Direct/Inverse relations"];
          } else if (isSecondary) {
            topics = ["Real Numbers, Polynomials, Linear Eq in 2 variables", "Arithmetic Progressions (AP), Coordinate Geometry", "Trigonometric ratios & basic identities", "Surface Area and Volume calculations", "Probability theory and statistics measures"];
          } else {
            topics = ["Sets, Relations and Functions, Trigonometry", "Complex Numbers, Quadratic Equations", "Permutations & Combinations, Binomial theorem", "Limits & Derivatives, Mathematical reasoning", "Probability, Linear Inequalities"];
          }
        } else if (name.includes("science") || name.includes("physics") || name.includes("chemistry") || name.includes("biology")) {
          if (isElementary) {
            topics = ["Plants and Animals life cycles", "Human body parts & basic hygiene", "Matter (Solids, Liquids, Gases)", "Natural resources & environment care", "Light, Shadow, and basic forces"];
          } else if (isMiddle) {
            topics = ["Crop production, Microorganisms, Synthetic fibres", "Metals and Non-metals, Combustion and Flame", "Cell structure and functions in animals/plants", "Force, Pressure, Friction, and Sound waves", "Chemical effects of electric current"];
          } else if (isSecondary) {
            topics = ["Chemical reactions, Acid-Base theory, Metals/Non-metals", "Carbon compounds & Periodic Classification", "Life processes, Control & coordination in organisms", "Light reflection/refraction, Human Eye structures", "Electricity, Magnetic effects of current"];
          } else {
            topics = ["Physics: Kinematics, Laws of Motion, Work-Energy", "Chemistry: Atomic structure, Chemical bonding, Thermodynamics", "Biology: Diversity of life, Cell biology, Human physiology"];
          }
        } else if (name.includes("english") || name.includes("hindi")) {
          if (isElementary) {
            topics = ["Nouns, Pronouns, Verbs, Adjectives", "Synonyms, Antonyms, Spellings", "Punctuation and capitalization", "Prepositions and Conjunctions", "Reading comprehension short stories"];
          } else if (isMiddle) {
            topics = ["Tenses, Subject-Verb agreement", "Prepositions, Conjunctions, Adverbs", "Active and Passive voice", "Direct and Indirect speech", "Unseen passages and vocabulary checks"];
          } else {
            topics = ["Advanced Tenses, Modals, Subject-Verb concord", "Clauses (Noun, Relative, Adverbial clauses)", "Reported Speech and editing exercises", "Reading Comprehension from high-level passages", "Error spot corrections and idioms"];
          }
        } else if (name.includes("computer") || name.includes("cyber") || name.includes("coding")) {
          if (isElementary) {
            topics = ["Introduction to Computers (Hardware, Software)", "Working with Paint and Word processor", "Input & Output devices functions", "Keyboard shortcuts & basic internet safety"];
          } else if (isMiddle) {
            topics = ["Fundamentals of Scratch programming / algorithms", "Introduction to HTML structures and tag systems", "Microsoft Excel sheets & basic formulas", "E-Safety, digital footprints and passwords"];
          } else {
            topics = ["Python programming constructs (loops, list operations)", "Computer networks topologies, transmission media", "Cybersecurity: Phishing, Trojans, Firewall concepts", "Database management basics (SQL tables query)"];
          }
        } else {
          // General Knowledge or other
          topics = ["Current National & International affairs", "Indian History and basic Constitution", "General Geography & solar systems", "Inventions, Awards, and Sports achievements", "Logical reasoning and series completion"];
        }

        syllabusTopics.push({ subject: subj, topics });
      });

      let topicY = 230;
      syllabusTopics.forEach((st) => {
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1e3a8a").text(st.subject.toUpperCase(), 45, topicY);
        doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
        
        let itemY = topicY + 12;
        st.topics.forEach((topic) => {
          doc.text("•", 55, itemY);
          doc.text(topic, 65, itemY, { width: 480, lineGap: 2.5 });
          itemY += 13.5;
        });
        
        topicY = itemY + 10;
      });

      // Preparation Guidelines
      const prepY = Math.max(topicY, 520);
      doc.font("Helvetica-Bold")
         .fontSize(12)
         .fillColor("#0f172a")
         .text("EXAM FORMAT & PRACTICE SCHEDULE", 40, prepY);
      doc.moveTo(40, prepY + 15).lineTo(555, prepY + 15).lineWidth(1).stroke("#e2e8f0");

      doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
      doc.text("1. Exam Format:", 45, prepY + 25);
      doc.font("Helvetica-Bold").fillColor("#0f172a").text("All questions are Multiple Choice (MCQ). No negative marks.", 140, prepY + 25, { lineGap: 2.5 });

      doc.font("Helvetica").fillColor("#475569").text("2. Exam Platform:", 45, prepY + 38);
      doc.font("Helvetica-Bold").fillColor("#0f172a").text("Accessible via web browsers. Webcam and Mic must be turned on.", 140, prepY + 38, { lineGap: 2.5 });

      doc.font("Helvetica").fillColor("#475569").text("3. Mock Tests:", 45, prepY + 51);
      doc.font("Helvetica-Bold").fillColor("#4f46e5").text("Mock test link is active. Log in to start practicing 5 sample modules.", 140, prepY + 51, { lineGap: 2.5 });

      // Simple practice question block
      const practiceY = prepY + 75;
      doc.rect(40, practiceY, 515, 110).fill("#f8fafc");
      doc.rect(40, practiceY, 515, 110).stroke("#e2e8f0");

      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#10b981").text("SAMPLE QUESTION CORNER", 50, practiceY + 10);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a");

      if (isElementary) {
        doc.text("Q1. What is the value of 350 + (12 x 5)?", 50, practiceY + 28, { lineGap: 2 });
        doc.font("Helvetica").fontSize(8).fillColor("#475569").text("A) 362            B) 410            C) 420            D) 357", 60, practiceY + 42);
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Q2. Which part of the computer coordinates CPU instructions?", 50, practiceY + 60, { lineGap: 2 });
        doc.font("Helvetica").fontSize(8).fillColor("#475569").text("A) Mouse         B) Control Unit         C) Hard Disk         D) Printer", 60, practiceY + 74);
      } else {
        doc.text("Q1. If 3x + 5 = 20, what is the value of x?", 50, practiceY + 28, { lineGap: 2 });
        doc.font("Helvetica").fontSize(8).fillColor("#475569").text("A) 5            B) 15            C) 4.5            D) 3", 60, practiceY + 42);
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Q2. Which of the following is a primary security measure for encrypting data?", 50, practiceY + 60, { lineGap: 2 });
        doc.font("Helvetica").fontSize(8).fillColor("#475569").text("A) Defragmentation     B) Cryptography     C) Formatting     D) Overclocking", 60, practiceY + 74);
      }

      doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#94a3b8").text("Note: Full syllabus banks and solved sample papers are sent to registered parent emails.", 50, practiceY + 95);

      // Footer brand details
      doc.font("Helvetica-Bold")
         .fontSize(7.5)
         .fillColor("#94a3b8")
         .text("DigiConnect Dukan - Powered by RNoS India Pvt. Ltd. | Official Academic Facilitation Desk.", 40, 785, { align: "center", width: 515 });

      doc.end();
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="CSC_Olympiad_Prep_Material_Class_${studentClass}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error("Prep Material generation failure:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
