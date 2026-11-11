/**
 * What to put in each box of the DPR form, shown as soon as the admin moves
 * into a box (or rests the pointer on it).
 *
 * Hinglish, the way the team talks to customers. Every entry answers what
 * goes here, where to get it, why the bank needs it, and whether it can be
 * left blank. Boxes marked "Auto" are filled from the business type and the
 * scheme; the admin only changes them if the customer's case is different.
 */

export type Importance = "required" | "important" | "optional" | "auto";

export type FieldGuide = { what: string; where: string; why: string; importance: Importance };

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  required: "Zaroori",
  important: "Bank dekhega",
  optional: "Optional",
  auto: "Auto bhara",
};

export const GUIDE_HEADINGS = { what: "Kya bharein", where: "Kahan se milega", why: "Kyon zaroori hai" } as const;

const g = (what: string, where: string, why: string, importance: Importance): FieldGuide => ({ what, where, why, importance });

export const DPR_GUIDE = {
  // ── Quick DPR ──
  scheme: g(
    "Customer kis yojana mein loan le raha hai: PMEGP, MYSY, CM-YUVA, Mudra ya normal bank loan.",
    "Customer se poochhein ya jis portal par form bhara hai (KVIC PMEGP portal, UP MSME portal) wahan dekhein.",
    "Yojana se tay hota hai ki kaun se kaam milenge, own contribution kitna, subsidy kitni aur project cost ki limit kya hai.",
    "required",
  ),
  sector: g(
    "Kaam ka prakaar: manufacturing (kuch banana), service (seva dena) ya trading (khareed kar bechna).",
    "Customer ke kaam se. Yojana chunne ke baad sirf wahi prakaar dikhte hain jo us yojana mein aate hain.",
    "PMEGP aur MYSY mein trading nahi hoti; project cost ki limit bhi prakaar se badalti hai.",
    "required",
  ),
  templateId: g(
    "Customer ka business chuniye. Sirf wahi business dikhte hain jo chuni gayi yojana mein aate hain.",
    "Customer ke project ke hisaab se. Exact naam na mile to sabse milta-julta chuniye; baad mein details badal sakte hain.",
    "Isi se machinery, capacity, raw material, staff, kharche aur report ka saara text apne aap bharta hai.",
    "required",
  ),
  projectCost: g(
    "Poore project ki laagat lakh mein: machinery / saaman + ek cycle ka working capital. Zameen-building nahi.",
    "Customer jitna loan + apna paisa lagana chahta hai; ya machinery quotation ka total + 2–3 mahine ka kharcha.",
    "Isi hisaab se poori unit ka size banta hai. Yojana ki limit se zyada hua to form bata dega.",
    "required",
  ),
  businessName: g(
    "Firm / dukaan ka naam, bilkul waisa jaisa Udyam, GST ya bank account mein hoga.",
    "Udyam certificate, GST certificate ya customer ka bataya hua prastavit naam.",
    "Ye naam DPR ke har page par chhapta hai; bank ke record se alag hua to file lautaa di jaati hai.",
    "required",
  ),
  district: g(
    "Jis zile mein unit lagegi.",
    "Customer ka address / Aadhaar ya unit ki jagah ka rent agreement.",
    "Market, raw material aur yojana (rural / urban) ka varnan isi se banta hai; PMEGP aavedan zile ke DIC / KVIB mein jaata hai.",
    "required",
  ),
  promoterName: g("Promoter (maalik) ka poora naam, Aadhaar ke anusar.", "Aadhaar card ya PAN card.", "Loan isi naam se hota hai; DPR mein declaration aur signature isi naam se chhapte hain.", "required"),
  fatherName: g("Pita ka naam (ya vivahit mahila ke liye pati ka naam).", "Aadhaar card ya PAN card.", "Bank aur yojana portal pehchaan ke liye pita / pati ka naam maangte hain.", "important"),
  age: g(
    "Promoter ki umr saalon mein.",
    "Aadhaar ya high school marksheet ki janm tithi se.",
    "Har yojana ki umr seema hai: CM-YUVA 21–40, MYSY 18–40, PMEGP 18 se upar. Seema se bahar hui to form chetavani dega.",
    "important",
  ),
  socialCategory: g(
    "Promoter ki shreni: General, OBC, SC, ST, Minority, Women, Ex-serviceman ya Divyang.",
    "Caste / category certificate (tehsil se bana).",
    "PMEGP aur MYSY mein special category ko zyada subsidy aur kam own contribution milta hai.",
    "important",
  ),
  area: g(
    "Unit gaon (rural) mein hai ya shahar (urban) mein.",
    "Unit ka address: gram panchayat area = rural, nagar palika / nagar nigam = urban.",
    "PMEGP mein rural unit ko 10% zyada subsidy milti hai (General 25%, special 35%).",
    "important",
  ),
  category: g(
    "Yojana ke hisaab se General ya Special (SC/ST/OBC/Minority/Mahila/Ex-serviceman/Divyang).",
    "Promoter ka category certificate.",
    "Special category par own contribution 5% aur PMEGP subsidy zyada hoti hai.",
    "important",
  ),
  bankName: g("Jis bank mein loan file jaayegi uska naam.", "Customer jis bank / branch mein account rakhta hai ya portal par jo bank chuna hai.", "DPR ke cover par 'Submitted to' mein chhapta hai.", "important"),
  bankBranch: g("Bank ki branch ka naam / jagah.", "Customer ki passbook ya portal ka application.", "Cover page par bank ke naam ke saath chhapta hai.", "optional"),

  // ── Business details ──
  constitution: g(
    "Firm ka kanooni roop: proprietorship (akela maalik), partnership, LLP ya company.",
    "Zyaadatar chhote loan proprietorship hote hain; partnership deed / company certificate ho to wahi.",
    "Bank isse tay karta hai kiske naam se loan aur guarantee hogi.",
    "auto",
  ),
  activity: g("Kaam ka chhota varnan English mein, jaise 'manufacturing of wheat flour (atta)'.", "Business type chunne par apne aap bharta hai.", "Cover page, introduction aur Project at a Glance mein chhapta hai.", "auto"),
  address: g("Unit ka pura pata: gaon / mohalla, post, tehsil.", "Rent agreement, bijli bill ya zameen ke kagaz.", "Bank site visit isi pate par karta hai.", "important"),
  state: g("Unit jis rajya mein hai, jaise Uttar Pradesh.", "Unit ke address se.", "MYSY aur CM-YUVA sirf Uttar Pradesh ke liye hain.", "auto"),
  pincode: g("6 ank ka pincode.", "Address / Aadhaar se.", "Pate ki pehchaan ke liye.", "optional"),
  premises: g("Unit ki jagah apni hai, kiraye ki ya lease par.", "Customer se; kiraya ho to rent agreement.", "Kiraye ki jagah par rent kharcha judta hai aur bank rent agreement maangta hai.", "important"),
  udyamNumber: g("Udyam registration number (UDYAM-UP-..).", "udyamregistration.gov.in par Aadhaar se free banta hai.", "MSME ke roop mein pehchaan; kai bank loan se pehle maangte hain. Naye project mein baad mein bhi bana sakte hain.", "optional"),
  gstin: g("15 ank ka GST number, agar hai.", "GST certificate.", "Turnover 40 lakh (service 20 lakh) se upar ho to GST zaroori; bank chalu business ka GST dekhta hai.", "optional"),
  pan: g("Promoter / firm ka 10 akshar ka PAN number.", "PAN card ya income tax return.", "Loan ke liye KYC aur CIBIL check PAN se hota hai.", "important"),

  // ── Promoter ──
  qualification: g("Promoter ki padhai, jaise High school, Intermediate, Graduate, ITI.", "Marksheet / certificate.", "MYSY mein 10th pass zaroori; PMEGP mein bade project par 8th pass. Promoter profile mein chhapta hai.", "important"),
  experience: g("Is kaam ka anubhav, jaise '5 years of experience in a flour mill'.", "Customer se; training / naukri ka certificate ho to behtar.", "Bank dekhta hai ki promoter kaam chala payega ya nahi; Promoter Profile mein chhapta hai.", "important"),
  mobile: g("Promoter ka mobile number.", "Customer se.", "Bank aur portal OTP / sampark ke liye.", "optional"),
  email: g("Promoter ka email.", "Customer se.", "Portal registration aur bank sampark ke liye.", "optional"),
  gender: g("Promoter ka ling.", "Aadhaar se.", "Mahila udyami ko kai yojanaon mein special category ka laabh milta hai.", "optional"),

  // ── Scheme and loan ──
  startFy: g("Jis financial year se kaam shuru hoga.", "Apne aap agle April wala saal bhar jaata hai.", "Projection ke saal isi se shuru hote hain.", "auto"),
  years: g("Kitne saal ka projection chahiye. Aam taur par 5.", "Bank ki maang se; loan avadhi jitna.", "Har saal ka P&L, balance sheet aur DSCR banta hai.", "auto"),
  ownContributionPct: g("Promoter apni jeb se project cost ka kitna % lagayega.", "Yojana se apne aap: PMEGP / MYSY General 10%, special 5%; CM-YUVA 10%.", "Bank itna margin customer se lekar hi loan deta hai.", "auto"),
  termLoanInterestPct: g("Term loan par saalana byaaj %.", "Bank ki current MCLR / RLLR rate; aam taur par 9–11.5%.", "Byaaj se profit aur DSCR badalta hai.", "auto"),
  ccInterestPct: g("Working capital (CC) par saalana byaaj %.", "Bank se; aam taur par term loan se thoda zyada.", "CC ka byaaj har saal kharche mein judta hai.", "auto"),
  taxPct: g("Net profit par income tax %.", "Proprietorship mein chhote profit par aam taur par 0 (exempt limit); zyada ho to CA se.", "Profit after tax aur cash accrual isi se banta hai.", "auto"),
  tenureYears: g("Term loan kitne saal mein chukega (moratorium milakar).", "Yojana / bank norm: aam taur par 5–7 saal; CM-YUVA mein 4.", "Kisht ki raashi aur DSCR isi se tay hote hain.", "auto"),
  moratoriumMonths: g("Shuru ke kitne mahine sirf byaaj, kisht nahi.", "Bank se; aam taur par 6 mahine.", "Kaam jamne ka samay milta hai; repayment schedule mein dikhta hai.", "auto"),
  termLoanOverride: g("Term loan ki raashi sirf tab likhein jab bank ne alag sanction kiya ho.", "Bank ki sanction letter ya branch manager se.", "Khaali chhodne par yojana ke hisaab se apne aap banta hai.", "optional"),
  ccLimitOverride: g("CC / working capital limit sirf tab likhein jab bank ne alag di ho.", "Bank ki sanction letter ya branch manager se.", "Khaali chhodne par working capital ke hisaab se apne aap.", "optional"),
  subsidyOverride: g("Subsidy ki raashi sirf tab likhein jab yojana ne alag tay ki ho.", "Portal / bank ki subsidy claim.", "Khaali chhodne par yojana ke % se apne aap.", "optional"),
  interestSubventionPct: g("Sarkar byaaj ka kitna % degi.", "Yojana se; CM-YUVA mein pehle 4 saal 100%.", "Byaaj kharcha kam hota hai, profit badhta hai.", "auto"),
  interestSubventionYears: g("Byaaj chhoot kitne saal milegi.", "Yojana se apne aap; CM-YUVA mein 4 saal.", "Utne saal byaaj kharche mein chhoot dikhti hai.", "auto"),
  drawingsPerYear: g("Promoter ghar kharch ke liye saal mein kitna nikalega.", "Customer se; chhote project mein aam taur par 0 ya thoda.", "Capital aur cash se ghat-ta hai; bank zyada drawings pasand nahi karta.", "optional"),
  preliminaryWriteOffYears: g("Registration / project report jaise shuruaati kharche kitne saal mein kharche mein daalein.", "Aam taur par 5 saal.", "Har saal ka hissa P&L mein jaata hai.", "auto"),

  taxRegime: g(
    "Income tax kaise lagega: New regime (ab default), Old regime, ya khud % likhein.",
    "Proprietor ka ITR ya CA se. Firm / company ke liye apne aap sahi dar lagti hai.",
    "Bank tax ke baad ka profit dekhta hai; 0 tax tabhi jab slab / rebate se sach mein 0 ho.",
    "auto",
  ),
  repaymentMethod: g("Kisht ka tarika: har baar barabar principal + bacha hua byaaj, ya EMI (har baar barabar kisht).", "Bank ki sanction letter se; MSME term loan mein aksar barabar principal.", "Repayment schedule, byaaj aur DSCR isi se bante hain.", "auto"),
  repaymentFrequency: g("Kisht har mahine ya har teen mahine.", "Bank ki sanction letter se.", "Kisht ki taareekh aur saal ka byaaj isi se banta hai.", "auto"),
  otherFunding: g("Parivar / dost se liya unsecured loan jo project mein lagega.", "Customer se; loan agreement / confirmation letter.", "Means of finance mein alag dikhta hai; isse bank loan kam hota hai.", "optional"),
  contingencyPct: g("Machine / building ki keemat par kitna % aakasmik kharcha (contingency).", "Aam taur par 0–5%; bank ya CA se.", "Keemat badhne ka margin; project cost aur depreciation mein judta hai.", "optional"),
  depreciationMethod: g("Depreciation ka tarika: WDV (Income-tax dar) ya SLM (Companies Act ki life).", "Proprietor / firm ke liye WDV, company / LLP ke liye SLM (auto).", "Profit aur balance sheet ki net block isi se banti hai; tarika report mein likha jaata hai.", "auto"),
  employerContributionPct: g("Employer ka EPF / ESI hissa, salary ka %.", "Khaali chhodne par apne aap: 10+ staff par ESI 3.25%, 20+ par EPF 12%.", "Kanoonan dena padta hai; salary kharche mein judta hai.", "auto"),
  workInProgressDays: g("Kitne din ka maal banne ki prakriya mein (WIP) rahega.", "Kaam ke hisaab se; zyaadatar chhote unit mein 0–7 din.", "Working capital ka hissa.", "auto"),
  minimumCashDays: g("Kitne din ke nakad kharche haath mein cash rakhna hai.", "Aam taur par 7 din.", "Working capital mein judta hai taaki roz ke kharche ruke nahi.", "auto"),

  // ── Running ──
  utilisation: g("Har saal unit apni poori capacity ka kitna % chalegi.", "Aam taur par 60, 70, 80, 85, 90%. Bank isse zyada pehle saal mein nahi maanta.", "Sales aur raw material isi % se bante hain.", "auto"),
  priceGrowthPct: g("Selling rate har saal kitna % badhega.", "Aam taur par 0 (bank conservative dekhna chahta hai).", "Zyada rakhne se projection badha-chadha lagta hai.", "auto"),
  costGrowthPct: g("Salary aur kharche har saal kitna % badhenge.", "Aam taur par 5%.", "Kharche badhne ka asar profit par dikhta hai.", "auto"),
  rawMaterialDays: g("Kitne din ka kachcha maal stock mein rahega.", "Business type se apne aap; kaam ke hisaab se 15–45 din.", "Working capital (CC) ki zaroorat isi se banti hai.", "auto"),
  finishedGoodsDays: g("Kitne din ka taiyaar maal stock mein rahega.", "Business type se apne aap.", "Working capital ka hissa.", "auto"),
  debtorDays: g("Grahak kitne din baad paisa dete hain.", "Customer ke kaam se; cash kaam mein 0.", "Udhaar bikri jitni zyada, working capital utna zyada.", "auto"),
  creditorDays: g("Supplier kitne din ka udhaar dete hain.", "Customer ke supplier se.", "Supplier udhaar working capital kam karta hai.", "auto"),

  // ── Rows ──
  capitalItem: g("Machine / saaman ka naam, sankhya aur rate (GST chhod kar).", "Business type se apne aap; asli quotation mile to uska rate bharein.", "Project cost aur depreciation isi se banta hai; bank quotation se milaata hai.", "auto"),
  product: g("Kya banega / bikega, unit, saal bhar ki capacity (100% par) aur bikri rate.", "Business type se apne aap; customer ke asli rate ho to badlein.", "Sales isi se banti hai.", "auto"),
  rawMaterial: g("Kachcha maal, 100% capacity par saal bhar ki matra aur rate.", "Business type se apne aap; mandi / supplier rate se badal sakte hain.", "Cost of production aur working capital isi se.", "auto"),
  staff: g("Karmchari (pad, sankhya, mahine ki salary) aur mahine ke kharche (bijli, kiraya, marammat, transport) 100% capacity par.", "Business type se apne aap; bijli bill / rent agreement ho to unse badlein. Promoter khud ki salary nahi likhta.", "Salary, kharche, profit aur break-even isi se nikalte hain; rozgar ki sankhya bhi DPR mein chhapti hai.", "auto"),
  narrative: g("Report ke is hisse ka text. Khaali chhodne par auto text chhapega.", "Business type aur figures se apne aap banta hai.", "Bank ko project samajhne mein madad karta hai.", "auto"),
} satisfies Record<string, FieldGuide>;

export type DprGuideKey = keyof typeof DPR_GUIDE;
