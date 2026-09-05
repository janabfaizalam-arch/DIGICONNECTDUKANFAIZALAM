import type { LabourScheme, Verification } from "@/lib/labour/types";

/**
 * The starting dataset, supplied by the site owner.
 *
 * Every figure here came from the owner, who read the current official
 * sources. None of it was generated from a model's memory and none of it was
 * taken from an SEO blog — the two sources the brief specifically forbade. The
 * official portal is unreachable from the build environment, so this file
 * makes no claim to have checked the numbers itself: `providedBy` says who
 * did, `verifiedOn` says when, and `sourceUrl` stays null until somebody
 * records the exact notification through the admin screen.
 *
 * That distinction matters more than it looks. A page that prints "Verified"
 * beside a number nobody re-read is worse than one that admits the number has
 * an owner and a date, because the first kind quietly rots and the second
 * asks to be checked.
 *
 * This is a seed. Once the CMS table has rows, the database wins.
 */

const VERIFIED_ON = "2026-09-04";

function owner(extra: Partial<Verification> = {}): Verification {
  return {
    status: "verified",
    providedBy: "DigiConnect Dukan (site owner)",
    verifiedOn: VERIFIED_ON,
    sourceUrl: null,
    sourceTitle: "UPBOCW / UP Labour Department — official pages",
    sourceDate: null,
    ...extra,
  };
}

export const SEED_SCHEMES: LabourScheme[] = [
  /* ── 1 ─────────────────────────────────────────────────────────────── */
  {
    id: "matritva-shishu-balika",
    slug: "matritva-shishu-balika-madad",
    name: "Matritva, Shishu evam Balika Madad Yojana",
    nameHi: "मातृत्व, शिशु एवं बालिका मदद योजना",
    category: "child_maternity",
    summary:
      "बच्चे के जन्म पर मदद — बेटे और बेटी के लिए अलग, और बेटी के लिए एक अलग सावधि जमा (FD)। नकद और FD दो अलग चीज़ें हैं।",
    beneficiaries: ["Registered worker", "Worker's wife", "Newborn child"],
    benefits: [
      {
        label: "Registered male worker — maternity benefit",
        labelHi: "पंजीकृत पुरुष श्रमिक — मातृत्व हितलाभ",
        kind: "cash",
        amount: 6000,
        frequency: "one_time",
        conditions: ["Pehle do bachchon tak hi"],
      },
      {
        label: "Female worker — maternity benefit",
        labelHi: "महिला श्रमिक — मातृत्व हितलाभ",
        kind: "cash",
        amount: null,
        amountNote: "3 mahine ki minimum wage + ₹1,000 medical bonus",
        frequency: "one_time",
        conditions: ["Sarkari sansthan mein delivery (institutional delivery) zaroori", "Pehle do bachchon tak hi"],
      },
      {
        label: "Miscarriage",
        labelHi: "गर्भपात की स्थिति में",
        kind: "cash",
        amount: null,
        amountNote: "6 hafte ki minimum wage ke barabar",
        frequency: "per_event",
      },
      {
        label: "Sterilization (nasbandi)",
        labelHi: "नसबंदी की स्थिति में",
        kind: "cash",
        amount: null,
        amountNote: "2 hafte ki minimum wage ke barabar",
        frequency: "per_event",
      },
      {
        label: "Ladka paida hone par",
        labelHi: "पुत्र के जन्म पर",
        kind: "cash",
        amount: 20000,
        frequency: "one_time",
        conditions: ["Pehle do bachchon tak hi"],
      },
      {
        label: "Ladki paida hone par",
        labelHi: "पुत्री के जन्म पर",
        kind: "cash",
        amount: 25000,
        frequency: "one_time",
        conditions: ["Pehle do bachchon tak hi"],
      },
      {
        label: "Beti ke naam Fixed Deposit",
        labelHi: "बेटी के नाम सावधि जमा (FD)",
        kind: "fd",
        amount: 25000,
        frequency: "one_time",
        conditions: [
          "Pehla bachcha beti ho, YA doosra bachcha bhi beti ho",
          "Kanoonan god li gayi beti bhi scheme ki shart ke andar",
          "FD tab milegi jab beti 18 saal tak ashadi (unmarried) rahe",
        ],
      },
      {
        label: "Janm se divyang beti ke naam Fixed Deposit",
        labelHi: "जन्म से दिव्यांग बेटी के नाम सावधि जमा (FD)",
        kind: "fd",
        amount: 50000,
        frequency: "one_time",
        conditions: ["FD tab milegi jab beti 18 saal tak ashadi rahe"],
      },
    ],
    eligibility: [
      "Registered construction worker",
      "Registration ke baad kam se kam 365 din Board ki membership",
      "Maternity/child benefit sirf pehle do janm tak",
      "Mahila worker ke maternity benefit ke liye institutional delivery zaroori",
    ],
    keyConditions: { membershipDays: 365, childLimit: 2 },
    documents: [
      "Updated registration",
      "Sarkari aspatal ka institutional delivery / miscarriage / sterilization proof",
      "Online jaari birth certificate",
      "Kanooni god lene ka document (jahan lagu ho)",
      "Family register",
      "Aadhaar",
      "Bank passbook",
    ],
    process: [
      "Registration update aur 365 din membership confirm karein",
      "Birth certificate online jaari karwayein",
      "Documents ke saath online application",
      "Board verification",
      "Cash bank account mein, FD alag se",
    ],
    paymentMethod: "Cash seedha bank account mein. FD beti ke naam alag instrument.",
    warnings: [
      "₹25,000 नकद और ₹25,000 FD दो अलग चीज़ें हैं — इन्हें जोड़कर ₹50,000 नकद न समझें।",
      "FD का पैसा तुरंत नहीं मिलता। बेटी के 18 साल तक अविवाहित रहने की शर्त है।",
    ],
    verification: owner(),
    sortOrder: 10,
    published: true,
  },

  /* ── 2 ─────────────────────────────────────────────────────────────── */
  {
    id: "sant-ravidas-shiksha",
    slug: "sant-ravidas-shiksha-protsahan",
    name: "Sant Ravidas Shiksha Protsahan Yojana",
    nameHi: "संत रविदास शिक्षा प्रोत्साहन योजना",
    category: "education",
    summary:
      "बच्चों की पढ़ाई के लिए मदद — कक्षा के हिसाब से। आधिकारिक पृष्ठ के मुताबिक़ यह एकमुश्त (ONE-TIME) है, हर साल नहीं।",
    beneficiaries: ["Registered worker ke bachche (adhiktam 2)"],
    benefits: [
      { label: "Class 1–5", labelHi: "कक्षा 1–5", kind: "cash", amount: 2000, frequency: "one_time" },
      { label: "Class 6–10", labelHi: "कक्षा 6–10", kind: "cash", amount: 2500, frequency: "one_time" },
      { label: "Class 11–12", labelHi: "कक्षा 11–12", kind: "cash", amount: 3000, frequency: "one_time" },
      { label: "Graduation / samkaksh", labelHi: "स्नातक / समकक्ष", kind: "cash", amount: 12000, frequency: "one_time" },
      { label: "ITI / Polytechnic / Vocational", labelHi: "ITI / पॉलिटेक्निक / व्यावसायिक", kind: "cash", amount: 12000, frequency: "one_time" },
      { label: "Post-Graduation", labelHi: "परास्नातक", kind: "cash", amount: 24000, frequency: "one_time" },
      {
        label: "Professional degree courses",
        labelHi: "प्रोफ़ेशनल डिग्री कोर्स",
        kind: "reimbursement",
        amount: null,
        amountNote: "Jo fees di gayi ho ya ₹60,000 — dono mein se jo kam ho",
        frequency: "one_time",
        conditions: ["MBA/BBA, B.Tech/B.Arch/M.Tech, BCA/MCA, B.Ed, B.Pharma, BDS/BAMS/BHMS/BUMS, Nursing, LLB/LLM, CA/CS waghera"],
      },
      {
        label: "Sarkari sansthan MBBS / PG",
        labelHi: "सरकारी संस्थान में MBBS / PG",
        kind: "reimbursement",
        amount: null,
        amountNote: "100% fee reimbursement (niyamon ke antargat)",
        frequency: "one_time",
      },
      { label: "Research", labelHi: "शोध (रिसर्च)", kind: "cash", amount: 100000, frequency: "one_time" },
      {
        label: "IIM / IIT / NIT / NIFT / NLU",
        labelHi: "IIM / IIT / NIT / NIFT / NLU",
        kind: "reimbursement",
        amount: null,
        amountNote: "100% fee reimbursement (niyamon ke antargat)",
        frequency: "one_time",
      },
      {
        label: "Merit protsahan — High School / Intermediate",
        labelHi: "मेरिट प्रोत्साहन — हाई स्कूल / इंटरमीडिएट",
        kind: "cash",
        amount: null,
        amountNote: "Ladka ₹5,000 · Ladki ₹8,000 (extra)",
        frequency: "one_time",
        conditions: ["70% marks", "Agli class mein admission zaroori"],
      },
      {
        label: "Merit protsahan — Graduation / Post-Graduation",
        labelHi: "मेरिट प्रोत्साहन — स्नातक / परास्नातक",
        kind: "cash",
        amount: null,
        amountNote: "Ladka ₹10,000 · Ladki ₹12,000 (extra)",
        frequency: "one_time",
        conditions: ["60% marks", "Agli class admission — PG exam ke liye ye shart lagu nahi"],
      },
    ],
    eligibility: [
      "Active aur updated Board registration",
      "Kam se kam 365 din membership",
      "Bachche ka Aadhaar authentication",
      "Manyata prapt shiksha sansthan",
      "Adhiktam 2 bachche",
    ],
    keyConditions: { membershipDays: 365, childLimit: 2 },
    documents: ["Marksheet", "Admission proof", "Fee receipt", "Student Aadhaar", "Bank passbook", "Labour Card"],
    process: [
      "Class/course ke hisaab se category dekhein",
      "Marksheet aur admission proof taiyar karein",
      "Online application",
      "Sansthan/Board verification",
      "Bank account mein payment",
    ],
    paymentMethod: "Bank account mein (DBT). Professional courses mein reimbursement.",
    warnings: [
      "₹2,000 / ₹2,500 / ₹3,000 को सालाना (annual) न समझें — आधिकारिक पृष्ठ इन्हें एकमुश्त (ONE-TIME) बताता है।",
    ],
    verification: owner(),
    sortOrder: 20,
    published: true,
  },

  /* ── 3 ─────────────────────────────────────────────────────────────── */
  {
    id: "student-cycle",
    slug: "student-cycle-sahayata",
    name: "Student Cycle Sahayata",
    nameHi: "छात्र साइकिल सहायता",
    category: "cycle",
    summary:
      "कक्षा 9, 10, 11 या 12 पास करके अगली कक्षा में पढ़ाई जारी रखने वाले बच्चों को साइकिल ख़रीदने के लिए मदद। सिर्फ़ एक बार।",
    beneficiaries: ["Registered worker ke padhne wale bachche"],
    benefits: [
      {
        label: "Cycle kharidne ke liye subsidy",
        labelHi: "साइकिल ख़रीदने के लिए अनुदान",
        kind: "cash",
        amount: null,
        amountNote: "Amount abhi verify nahi hui — official notification dekhein",
        frequency: "one_time",
        conditions: ["Class 9/10/11/12 paas karke agli class mein padhai jaari"],
      },
    ],
    eligibility: [
      "Shiksha yojana ke antargat",
      "Class 9, 10, 11 ya 12 paas",
      "Agli class mein admission aur padhai jaari",
    ],
    keyConditions: {},
    documents: ["Marksheet", "Admission proof", "Labour Card", "Bank passbook"],
    process: ["Marksheet aur admission proof ke saath application", "Verification", "Payment"],
    paymentMethod: "Bank account mein",
    warnings: [
      "यह छात्र (student) साइकिल सहायता है। श्रमिक की अपनी साइकिल वाली कोई अलग योजना हो तो वह इससे अलग है — दोनों को मिलाकर न देखें।",
      "इसकी रकम अभी स्वतंत्र रूप से सत्यापित नहीं हुई। नवीनतम आधिकारिक अधिसूचना देखकर ही भरोसा करें।",
    ],
    verification: owner({
      status: "needs_review",
      caveat: "Cycle ka exact amount verify nahi hua. Admin panel se official notification ka link aur rakam bharein.",
    }),
    sortOrder: 30,
    published: true,
  },

  /* ── 4 ─────────────────────────────────────────────────────────────── */
  {
    id: "kanya-vivah",
    slug: "kanya-vivah-sahayata",
    name: "Kanya Vivah Sahayata Yojana",
    nameHi: "कन्या विवाह सहायता योजना",
    category: "marriage",
    summary: "बेटी की शादी पर मदद। सामूहिक विवाह में रकम ज़्यादा है, पर उसमें अलग शर्तें हैं।",
    beneficiaries: ["Registered worker ki beti (adhiktam 2)", "Registered mahila worker ki apni shaadi"],
    benefits: [
      { label: "Samanya vivah", labelHi: "सामान्य विवाह", kind: "cash", amount: 65000, frequency: "per_event" },
      { label: "Antarjatiya (inter-caste) vivah", labelHi: "अंतर्जातीय विवाह", kind: "cash", amount: 75000, frequency: "per_event" },
      {
        label: "Samuhik vivah — prati beti/jodi",
        labelHi: "सामूहिक विवाह — प्रति बेटी / जोड़ा",
        kind: "cash",
        amount: 85000,
        frequency: "per_event",
        conditions: ["Ek jagah kam se kam 11 jode zaroori"],
      },
      {
        label: "Samuhik vivah aayojak ko",
        labelHi: "सामूहिक विवाह के आयोजक को",
        kind: "cash",
        amount: 15000,
        frequency: "per_event",
        conditions: ["Prati jodi, aayojan ke kharch ke liye"],
      },
    ],
    eligibility: [
      "Kam se kam 365 din Board membership",
      "Shaadi ke 1 saal ke andar application",
      "Samuhik vivah ke liye 15 din pehle application",
      "Beti aur ladke ka Aadhaar authentication",
      "Adhiktam 2 bachche",
      "Beti ki umar kam se kam 18 saal",
      "Ladke ki umar kam se kam 21 saal",
      "Pichhle 12 mahine mein kam se kam 90 din nirman kaam",
      "Aisi hi doosri sarkari sahayata na li ho — ghoshna deni hogi",
    ],
    keyConditions: {
      membershipDays: 365,
      workDaysLast12Months: 90,
      childLimit: 2,
      minAge: 18,
      applicationWindow: "Shaadi ke 1 saal ke andar (samuhik vivah: 15 din pehle)",
    },
    documents: [
      "Labour Card",
      "Aadhaar (worker, beti, ladka)",
      "Shaadi ka proof",
      "Beti ki umar ka document",
      "Bank passbook",
      "Doosri sarkari sahayata na lene ki ghoshna",
    ],
    process: [
      "Membership aur 90-din shart check karein",
      "Shaadi ke 1 saal ke andar online application",
      "Aadhaar authentication",
      "Board verification",
      "Bank account mein payment",
    ],
    paymentMethod: "Bank account mein",
    warnings: [
      "यह मुख्यमंत्री सामूहिक विवाह योजना से अलग योजना है — दोनों को एक न समझें।",
      "शादी के 1 साल बाद आवेदन आम तौर पर नहीं लिया जाता। समय सीमा रिजेक्शन की सबसे बड़ी वजह है।",
    ],
    verification: owner(),
    sortOrder: 40,
    published: true,
  },

  /* ── 5 ─────────────────────────────────────────────────────────────── */
  {
    id: "gambhir-bimari",
    slug: "gambhir-bimari-sahayata",
    name: "Gambhir Bimari Sahayata Yojana",
    nameHi: "गंभीर बीमारी सहायता योजना",
    category: "medical",
    summary:
      "गंभीर बीमारी के इलाज का ख़र्च। आधिकारिक पृष्ठ के मुताबिक़ इसकी कोई अधिकतम सीमा तय नहीं है — पर शर्तें हैं।",
    beneficiaries: ["Worker", "Pati/patni", "Ashadi betiyan", "21 saal se kam ke bete"],
    benefits: [
      {
        label: "Sarkari / SACHIS-empanelled aspatal mein ilaj",
        labelHi: "सरकारी / SACHIS-सूचीबद्ध अस्पताल में इलाज",
        kind: "reimbursement",
        amount: null,
        amountNote: "Ayushman Bharat ke niyamon ke barabar poora reimbursement — koi adhiktam rakam tay nahi",
        frequency: "per_event",
        conditions: [
          "Worker PMJAY/CMJAY ka labh lene ke yogya na ho",
          "Sarkari, swayatt ya SACHIS-empanelled aspatal",
        ],
      },
      {
        label: "Aspatal ko advance",
        labelHi: "अस्पताल को अग्रिम भुगतान",
        kind: "reimbursement",
        amount: null,
        amountNote: "Ilaj ke estimate par advance sambhav ho sakta hai",
        frequency: "per_event",
      },
    ],
    eligibility: [
      "Updated registered worker",
      "Worker PMJAY/CMJAY ke labh ka patra na ho",
      "Aashrit ashadi beti / 21 saal se kam beta",
    ],
    keyConditions: {},
    documents: [
      "Registration proof",
      "Bimari ke documents",
      "Nirdharit format mein doctor certificate",
      "Dawa ke original bill",
      "Ashadi beti / 21 saal se kam bete ke liye dependency proof",
    ],
    process: ["Doctor certificate nirdharit format mein", "Original bill sambhal kar rakhein", "Application", "Verification", "Reimbursement"],
    paymentMethod: "Reimbursement — bank account mein, ya aspatal ko advance",
    warnings: [
      "यह 'सारा चिकित्सा ख़र्च हमेशा नि:शुल्क' नहीं है। अस्पताल और बीमारी की शर्तें हैं।",
      "मूल बिल के बिना क्लेम नहीं होता।",
    ],
    verification: owner(),
    sortOrder: 50,
    published: true,
  },

  /* ── 6 ─────────────────────────────────────────────────────────────── */
  {
    id: "mrityu-divyangta",
    slug: "nirman-kamgar-mrityu-divyangta-sahayata",
    name: "Nirman Kamgar Mrityu evam Divyangta Sahayata",
    nameHi: "निर्माण कामगार मृत्यु एवं दिव्यांगता सहायता",
    category: "death",
    summary:
      "मृत्यु और दिव्यांगता पर सहायता। बहुत ज़रूरी: यह एक साथ नकद नहीं मिलती — मूल धन + ब्याज, महीने की किस्त में।",
    beneficiaries: ["Nominee / kanooni waris", "Divyang worker khud"],
    benefits: [
      {
        label: "Durghatna mein mrityu",
        labelHi: "दुर्घटना में मृत्यु",
        kind: "installment",
        amount: 500000,
        amountNote: "₹5,00,000 mool dhan + lagu byaj — udaharan ke taur par lagbhag ₹9,395/mahina × 60 mahine",
        frequency: "monthly",
        conditions: ["Kisht byaj dar ke hisaab se badal sakti hai"],
      },
      { label: "Durghatna mrityu — antim sanskar", labelHi: "दुर्घटना में मृत्यु — अंत्येष्टि सहायता", kind: "cash", amount: 25000, frequency: "one_time" },
      {
        label: "Samanya mrityu",
        labelHi: "सामान्य मृत्यु",
        kind: "installment",
        amount: 200000,
        amountNote: "₹2,00,000 mool dhan + lagu byaj — lagbhag ₹8,736/mahina × 24 mahine",
        frequency: "monthly",
        conditions: ["Kisht byaj dar ke hisaab se badal sakti hai"],
      },
      { label: "Samanya mrityu — antim sanskar", labelHi: "सामान्य मृत्यु — अंत्येष्टि सहायता", kind: "cash", amount: 25000, frequency: "one_time" },
      {
        label: "Apanjikrit worker ki kaam par durghatna mrityu",
        labelHi: "अपंजीकृत श्रमिक की कार्य के दौरान दुर्घटना में मृत्यु",
        kind: "cash",
        amount: 100000,
        frequency: "one_time",
        conditions: ["Nirdharit shart ke antargat"],
      },
      {
        label: "Sthayi divyangta — 100%",
        labelHi: "स्थायी दिव्यांगता — 100%",
        kind: "installment",
        amount: 400000,
        amountNote: "₹4,00,000 + byaj — lagbhag ₹9,172/mahina × 48 mahine",
        frequency: "monthly",
      },
      {
        label: "Sthayi divyangta — 50% se zyada, 100% se kam",
        labelHi: "स्थायी दिव्यांगता — 50% से अधिक, 100% से कम",
        kind: "installment",
        amount: 300000,
        amountNote: "₹3,00,000 + byaj — lagbhag ₹8,953/mahina × 36 mahine",
        frequency: "monthly",
      },
      {
        label: "Sthayi divyangta — 25% se zyada, 50% se kam",
        labelHi: "स्थायी दिव्यांगता — 25% से अधिक, 50% से कम",
        kind: "installment",
        amount: 200000,
        amountNote: "₹2,00,000 + byaj — lagbhag ₹8,736/mahina × 24 mahine",
        frequency: "monthly",
      },
    ],
    eligibility: [
      "Registered aur updated worker",
      "Mrityu par nominee / kanooni waris",
      "Divyangta par worker khud",
    ],
    keyConditions: {},
    documents: [
      "Online death certificate",
      "Aadhaar se juda bank passbook",
      "Aavedak ka Aadhaar",
      "FIR / panchanama / postmortem (jahan lagu ho)",
      "CMO ka divyangta certificate",
      "Doosri sarkari sahayata na lene ki ghoshna",
    ],
    process: [
      "Death/disability certificate banwayein",
      "Nominee ya waris ke documents taiyar karein",
      "Application",
      "Board verification",
      "Mool dhan + byaj mahine ki kisht mein",
    ],
    paymentMethod: "Mahine ki kisht (mool dhan + byaj). Antim sanskar sahayata alag, ek baar mein.",
    warnings: [
      "यह एक साथ नकद (lump sum) नहीं मिलता — मूल धन और ब्याज महीने की किस्त में आता है।",
      "दिए गए मासिक आँकड़े उदाहरण हैं। ब्याज दर बदलने पर किस्त बदल जाती है।",
      "आत्महत्या (suicide) पर यह लाभ मौजूदा शर्त के मुताबिक़ नहीं मिलता।",
      "'अंत्येष्टि सहायता' और 'मृत्यु सहायता' अलग-अलग चीज़ें हैं।",
    ],
    verification: owner(),
    sortOrder: 60,
    published: true,
  },

  /* ── 7 ─────────────────────────────────────────────────────────────── */
  {
    id: "gandhi-pension",
    slug: "mahatma-gandhi-pension-sahayata",
    name: "Mahatma Gandhi Pension Sahayata Yojana",
    nameHi: "महात्मा गांधी पेंशन सहायता योजना",
    category: "pension",
    summary: "60 साल के बाद हर महीने पेंशन — पर 10 साल का पंजीकरण ज़रूरी है।",
    beneficiaries: ["60+ registered worker", "Mrityu ke baad pati/patni (niyamon ke adheen)"],
    benefits: [
      {
        label: "Masik pension",
        labelHi: "मासिक पेंशन",
        kind: "pension",
        amount: 1000,
        frequency: "monthly",
        conditions: ["Har 2 saal mein ₹50 ki badhotri", "Adhiktam ₹1,250/mahina"],
      },
    ],
    eligibility: [
      "Uttar Pradesh ka sthayi niwasi",
      "Umar 60 saal ya usse zyada",
      "Updated registered worker",
      "Kam se kam 10 saal ka registration",
      "Koi doosri sarkari pension na ho (nirdharit apvad chhodkar)",
    ],
    keyConditions: { minAge: 60, membershipDays: 3650 },
    documents: ["Labour Card", "Aadhaar", "Umar ka proof", "Bank passbook", "Niwas praman"],
    process: ["Patrata check karein", "Application", "Board approval", "Har April mein jeevan praman patra"],
    paymentMethod: "Board seedha bank account mein bhejta hai",
    warnings: ["हर साल अप्रैल में जीवन प्रमाण पत्र देना होता है, वरना पेंशन रुक सकती है।"],
    verification: owner(),
    sortOrder: 70,
    published: true,
  },

  /* ── 8 ─────────────────────────────────────────────────────────────── */
  {
    id: "shauchalay",
    slug: "shauchalay-sahayata",
    name: "Shauchalay Sahayata Yojana",
    nameHi: "शौचालय सहायता योजना",
    category: "toilet",
    summary: "घर में शौचालय बनाने के लिए ₹12,000 — दो किस्तों में।",
    beneficiaries: ["Updated registered worker (parivar ek ikai)"],
    benefits: [
      {
        label: "Shauchalay nirman sahayata",
        labelHi: "शौचालय निर्माण सहायता",
        kind: "installment",
        amount: 12000,
        amountNote: "₹6,000 pehli kisht + ₹6,000 doosri kisht",
        frequency: "one_time",
        conditions: ["Doosri kisht nirman poora hone aur shauchalay istemal shuru hone ke baad"],
      },
    ],
    eligibility: [
      "Updated registered worker",
      "Apna ghar ho",
      "Ghar mein shauchalay na ho",
      "Kisi doosri sarkari yojana se shauchalay ka labh na liya ho",
      "Parivar ko ek ikai mana jayega",
      "Aadhaar",
      "Rashtriyakrit bank ka CBS account",
    ],
    keyConditions: {},
    documents: ["Labour Card", "Aadhaar", "Bank passbook (CBS)", "Ghar ka proof", "Ghoshna — doosri yojana se labh nahi liya"],
    process: [
      "Zila Panchayati Raj Adhikari ke through chayan aur baseline survey",
      "Pehli kisht ₹6,000",
      "Shauchalay banwayein",
      "Nirman poora hone par doosri kisht ₹6,000",
    ],
    paymentMethod: "Do kishton mein, bank account mein",
    verification: owner(),
    sortOrder: 80,
    published: true,
  },

  /* ── 9 ─────────────────────────────────────────────────────────────── */
  {
    id: "kaushal-vikas",
    slug: "kaushal-vikas-takniki-unnayan",
    name: "Kaushal Vikas, Takniki Unnayan evam Pramanan Yojana",
    nameHi: "कौशल विकास तकनीकी, उन्नयन एवं प्रमाणन योजना",
    category: "skill",
    summary: "नि:शुल्क प्रशिक्षण UP Skill Development Mission के माध्यम से। श्रमिक स्वयं प्रशिक्षण ले तो मज़दूरी की प्रतिपूर्ति भी।",
    beneficiaries: ["Worker", "Patni (koi adhiktam umar nahi)", "Ashadi beti (koi adhiktam umar nahi)", "Aashrit beta (adhiktam 21 saal)"],
    benefits: [
      { label: "Muft training", labelHi: "नि:शुल्क प्रशिक्षण", kind: "service", amount: null, amountNote: "UP Skill Development Mission ke through", frequency: "per_event" },
      {
        label: "Worker khud training le to",
        labelHi: "श्रमिक स्वयं प्रशिक्षण ले तो",
        kind: "reimbursement",
        amount: null,
        amountNote: "Akushal (unskilled) worker ki minimum wage ke barabar reimbursement",
        frequency: "per_event",
      },
    ],
    eligibility: [
      "Worker khud, ya jiska pati/pita registered construction worker ho",
      "Worker khud training le to umar 18–35 saal",
      "Training ke baad assessment exam zaroori",
    ],
    keyConditions: { minAge: 18, maxAge: 35 },
    documents: ["Labour Card", "Aadhaar", "Shiksha ka proof", "Bank passbook"],
    process: ["Training centre chunein", "Registration", "Training", "Assessment exam", "Certificate"],
    paymentMethod: "Training muft. Worker ke liye wage reimbursement bank account mein.",
    warnings: ["प्रशिक्षण के बाद मूल्यांकन परीक्षा देना ज़रूरी है।"],
    verification: owner(),
    sortOrder: 90,
    published: true,
  },

  /* ── 10 ────────────────────────────────────────────────────────────── */
  {
    id: "aawasiya-vidyalaya",
    slug: "aawasiya-vidyalaya-yojana",
    name: "Aawasiya Vidyalaya Yojana",
    nameHi: "आवासीय विद्यालय योजना",
    category: "residential_education",
    summary: "6–14 साल के बच्चों के लिए नि:शुल्क आवासीय शिक्षा। अटल आवासीय विद्यालय शुरू होने पर इसमें मिलाया जाना है।",
    beneficiaries: ["Registered worker ke 6–14 saal ke bachche"],
    benefits: [
      {
        label: "Muft aawasiya shiksha",
        labelHi: "नि:शुल्क आवासीय शिक्षा",
        kind: "service",
        amount: null,
        amountNote: "Rehna, kapde, khana aur anya suvidhayein",
        frequency: "as_notified",
      },
    ],
    eligibility: ["Registered construction worker ke bachche", "Umar 6 se 14 saal"],
    keyConditions: { minAge: 6, maxAge: 14 },
    documents: ["Labour Card", "Bachche ka Aadhaar", "Umar ka proof", "Shiksha ka record"],
    process: ["Official notification dekhein", "Application", "Chayan"],
    paymentMethod: "Seva (service) — nakad nahi",
    warnings: [
      "आधिकारिक पृष्ठ के मुताबिक़ यह फ़िलहाल 12 ज़िलों में चल रही है और अटल आवासीय विद्यालय शुरू होने के बाद उसमें मिलाई जाएगी।",
      "ज़िलों की वर्तमान सूची के लिए आधिकारिक अधिसूचना ही देखें।",
    ],
    verification: owner({
      caveat: "12 zilon ki current list humne nahi banayi. Admin panel se official list bharein.",
    }),
    sortOrder: 100,
    published: true,
  },

  /* ── 11 ────────────────────────────────────────────────────────────── */
  {
    id: "atal-awasiya",
    slug: "atal-awasiya-vidyalaya",
    name: "Atal Awasiya Vidyalaya Yojana",
    nameHi: "अटल आवासीय विद्यालय योजना",
    category: "residential_education",
    summary: "CBSE, अंग्रेज़ी माध्यम, नवोदय जैसा आवासीय विद्यालय। प्रवेश परीक्षा से मेरिट पर चयन।",
    beneficiaries: ["Anath bachche", "Registered worker ke bachche (adhiktam 2)"],
    benefits: [
      {
        label: "Muft aawasiya shiksha",
        labelHi: "नि:शुल्क आवासीय शिक्षा",
        kind: "service",
        amount: null,
        amountNote: "Hostel, khana, khel, medical, suraksha aur gunvatta wali shiksha",
        frequency: "as_notified",
      },
    ],
    eligibility: [
      "Anath bachche",
      "Vidhivat registered construction worker jinki registration ke baad kam se kam 5 saal Board membership ho",
      "Adhiktam 2 bachche prati worker",
      "Entrance exam aur merit ke aadhar par chayan",
    ],
    keyConditions: { membershipDays: 1825, childLimit: 2 },
    documents: ["Labour Card", "Bachche ka Aadhaar", "Umar ka proof", "Shiksha ka record"],
    process: ["Admission notification ka intezar karein", "Entrance exam", "Merit list", "Admission"],
    paymentMethod: "Seva (service) — nakad nahi",
    warnings: [
      "एक विद्यालय में 1,000 सीटें — 500 लड़के, 500 लड़कियाँ।",
      "प्रवेश की उम्र, कक्षा और तारीख़ें हमने यहाँ नहीं लिखी हैं। वर्तमान प्रवेश अधिसूचना ही देखें।",
    ],
    verification: owner({
      caveat: "Admission age/class/dates official notification aane par admin panel se bharein.",
    }),
    sortOrder: 110,
    published: true,
  },

  /* ── 12 ────────────────────────────────────────────────────────────── */
  {
    id: "aapda-rahat",
    slug: "aapda-rahat-sahayata",
    name: "Aapda Rahat Sahayata Yojana",
    nameHi: "आपदा राहत सहायता योजना",
    category: "disaster",
    summary:
      "आधिकारिक ज़िला पृष्ठ इसे COVID-19 के संदर्भ में बनाई गई योजना बताता है। इसका आज लागू होना सरकार/बोर्ड के निर्देश पर निर्भर है।",
    beneficiaries: ["Database mein darj registered worker"],
    benefits: [
      {
        label: "Ek baar ki sahayata",
        labelHi: "एक बार की सहायता",
        kind: "cash",
        amount: 1000,
        frequency: "as_notified",
        conditions: ["Bhugtan ki avadhi sarkar/Board jaisa nirdharit kare — saalana/chhemahi/tri-masik/masik"],
      },
    ],
    eligibility: ["Database mein Aadhaar number aur bank account darj ho"],
    keyConditions: {},
    documents: ["Aadhaar", "Bank account detail (database mein)"],
    process: ["Official description ke mutabik koi application zaroori nahi (paperless)"],
    paymentMethod: "Seedha bank account mein",
    warnings: [
      "यह 'बाढ़/आग/प्राकृतिक आपदा पर ₹1,000 पक्का' नहीं है।",
      "आधिकारिक पृष्ठ इसे फ़िलहाल COVID-19 के संदर्भ में बताता है। लागू होना और भुगतान मौजूदा सरकारी/बोर्ड निर्देशों के अधीन है।",
    ],
    verification: owner({
      status: "needs_review",
      caveat: "COVID-19 sandarbh wali scheme. Aaj lagu hai ya nahi — latest sarkari nirdesh dekh kar admin panel se update karein.",
    }),
    sortOrder: 120,
    published: true,
  },

  /* ── 13 ────────────────────────────────────────────────────────────── */
  {
    id: "deendayal-chetna",
    slug: "pandit-deendayal-upadhyay-chetna",
    name: "Pt. Deendayal Upadhyay Chetna Yojana",
    nameHi: "पं. दीनदयाल उपाध्याय चेतना योजना",
    category: "awareness",
    summary:
      "यह जागरूकता का कार्यक्रम है — पंजीकरण, नवीनीकरण और योजनाओं की जानकारी फैलाने के लिए। इसमें किसी श्रमिक को सीधा पैसा नहीं मिलता।",
    beneficiaries: ["Sabhi nirman shramik (jankari ke roop mein)"],
    benefits: [
      {
        label: "Jagrukta programme",
        labelHi: "जागरूकता कार्यक्रम",
        kind: "awareness",
        amount: null,
        amountNote: "SMS, video clip, deewar lekhan, hoarding, pamphlet, camp, nukkad natak waghera",
        frequency: "as_notified",
      },
    ],
    eligibility: ["Sabhi nirman shramik"],
    keyConditions: {},
    documents: [],
    process: ["Jagrukta camp aur prachar ke through"],
    paymentMethod: "Koi nakad bhugtan nahi — ye seva/prachar hai",
    warnings: ["इसमें 'श्रमिक को ₹X मिलेंगे' जैसा कोई नकद लाभ नहीं है।"],
    verification: owner(),
    sortOrder: 130,
    published: true,
  },

  /* ── 14 — linked, not UPBOCW cash schemes ──────────────────────────── */
  {
    id: "pm-shram-yogi-maandhan",
    slug: "pm-shram-yogi-maandhan",
    name: "Pradhan Mantri Shram Yogi Maan-dhan Pension Yojana",
    nameHi: "प्रधानमंत्री श्रम योगी मान-धन पेंशन योजना",
    category: "linked",
    summary:
      "श्रम विभाग के पृष्ठ पर सूचीबद्ध, पर यह UPBOCW की अपनी नकद योजना नहीं है — इसकी पात्रता उस कार्यक्रम के अपने नियमों से तय होती है।",
    beneficiaries: ["Asangathit kshetra ke shramik (us programme ke niyamon ke adheen)"],
    benefits: [
      {
        label: "Pension (us programme ke niyamon ke adheen)",
        labelHi: "पेंशन (उस कार्यक्रम के नियमों के अधीन)",
        kind: "pension",
        amount: null,
        amountNote: "Patrata aur rakam us yojana ke apne niyamon se tay hoti hai",
        frequency: "monthly",
      },
    ],
    eligibility: ["Us programme ke apne niyam lagu honge"],
    keyConditions: {},
    documents: [],
    process: ["Us yojana ke official portal par"],
    paymentMethod: "Us yojana ke niyamon ke anusar",
    warnings: ["यह UPBOCW लेबर कार्ड का सीधा नकद लाभ नहीं है।"],
    verification: owner({ status: "needs_review", caveat: "Linked programme — iske niyam UPBOCW se alag hain." }),
    sortOrder: 140,
    published: true,
  },
  {
    id: "nps-traders",
    slug: "rashtriya-pension-yojana-traders",
    name: "Rashtriya Pension Yojana — Traders",
    nameHi: "राष्ट्रीय पेंशन योजना ट्रेडर्स",
    category: "linked",
    summary:
      "श्रम विभाग के पृष्ठ पर सूचीबद्ध। यह भी UPBOCW की अपनी नकद योजना नहीं है।",
    beneficiaries: ["Vyapari / traders (us programme ke niyamon ke adheen)"],
    benefits: [
      {
        label: "Pension (us programme ke niyamon ke adheen)",
        labelHi: "पेंशन (उस कार्यक्रम के नियमों के अधीन)",
        kind: "pension",
        amount: null,
        amountNote: "Patrata aur rakam us yojana ke apne niyamon se tay hoti hai",
        frequency: "monthly",
      },
    ],
    eligibility: ["Us programme ke apne niyam lagu honge"],
    keyConditions: {},
    documents: [],
    process: ["Us yojana ke official portal par"],
    paymentMethod: "Us yojana ke niyamon ke anusar",
    warnings: ["यह UPBOCW लेबर कार्ड का सीधा नकद लाभ नहीं है।"],
    verification: owner({ status: "needs_review", caveat: "Linked programme — iske niyam UPBOCW se alag hain." }),
    sortOrder: 150,
    published: true,
  },
];

/** Total payable/benefit lines across the seed — the honest "20+" number. */
export function seedBenefitCount(): number {
  return SEED_SCHEMES.reduce((total, scheme) => total + scheme.benefits.length, 0);
}
