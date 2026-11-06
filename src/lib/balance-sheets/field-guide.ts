import type { FieldKey } from "@/lib/balance-sheets/checks";

/**
 * What to put in each box of the balance sheet form, shown when the admin
 * rests the pointer on a box or moves into it.
 *
 * Written in Hinglish (Hindi in Roman script, with the usual English
 * accounting words), the way the team talks to customers about their files.
 * Every entry answers the four questions someone filling a file actually has:
 * what goes here, where do I get it, why does it matter, and can I leave it
 * blank.
 */

export type Importance = "required" | "important" | "optional";

export type FieldGuide = {
  /** What to enter, in one or two sentences. */
  what: string;
  /** Where the figure comes from. */
  where: string;
  /** Why the bank or the statements need it. */
  why: string;
  importance: Importance;
};

export type GuideKey =
  | FieldKey
  | "constitution"
  | "natureOfBusiness"
  | "udyamNumber"
  | "address"
  | "city"
  | "state"
  | "bankName"
  | "loanPurpose"
  | "baseYear"
  | "hasActual";

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  required: "Zaroor bharein",
  important: "Bank dekhega",
  optional: "Optional",
};

/** The three headings inside the card. */
export const GUIDE_HEADINGS = {
  what: "Kya bharein",
  where: "Kahan milega",
  why: "Kyon zaroori hai",
} as const;

export const FIELD_GUIDE: Record<GuideKey, FieldGuide> = {
  // ── 1. Customer and business ──
  businessName: {
    what: "Firm ka naam bilkul waisa hi likhein jaisa GST certificate, Udyam certificate ya bank account mein hai.",
    where: "GST certificate, Udyam certificate, ya current account ki passbook.",
    why: "Ye naam har page par chhapta hai. Bank ke record se alag hua to file wapas aa jaati hai.",
    importance: "required",
  },
  ownerName: {
    what: "Proprietor ka poora naam. Partnership ya company ho to saare partners ya directors ke naam, comma laga kar.",
    where: "Owner ka PAN card ya Aadhaar; firm ke liye partnership deed, company ke liye MCA record.",
    why: "Ye naam signature wale box mein jaata hai. Jiska naam yahan hai, wahi statements par sign karega.",
    importance: "required",
  },
  constitution: {
    what: "Business ka legal type: proprietorship, partnership, LLP, private limited wagaira.",
    where: "GST ya Udyam certificate mein likha hota hai; partnership deed ya incorporation certificate se confirm karein.",
    why: "Isi se capital ki heading banti hai (proprietor's, partners' ya shareholders' funds), aur bank file ko isi hisaab se dekhta hai.",
    importance: "required",
  },
  natureOfBusiness: {
    what: "Business kya karta hai, ek line mein. Jaise 'Grocery ka wholesale trading' ya 'Tailoring aur readymade garments'.",
    where: "Customer se poochhein; GST certificate mein goods ya services likhi hoti hain.",
    why: "Cover page par chhapta hai. Bank isse dekhta hai ki margin aur stock ka level is kaam ke hisaab se theek hai ya nahi.",
    importance: "important",
  },
  pan: {
    what: "10 character ka PAN. Proprietorship mein proprietor ka apna PAN, baaki mein firm ka PAN.",
    where: "PAN card, ya ITR acknowledgement ke upar.",
    why: "Bank isse ITR aur CIBIL se milata hai. PAN galat hua to figures verify nahi ho paate.",
    importance: "important",
  },
  gstin: {
    what: "15 character ka GST number, agar business GST mein registered hai.",
    where: "GST registration certificate, ya business ka koi bhi GST bill.",
    why: "Bank aapki daali hui sales ko GST returns se milata hai. GSTIN ke 3rd se 12th character upar wale PAN jaise hone chahiye.",
    importance: "optional",
  },
  udyamNumber: {
    what: "Udyam registration number, jaise UDYAM-UP-01-0012345.",
    where: "Udyam registration certificate (udyamregistration.gov.in).",
    why: "MSME loan, Mudra aur CGTMSE ke liye chahiye; isse kam rate ya bina collateral ka loan mil sakta hai.",
    importance: "optional",
  },
  mobile: {
    what: "Customer ka 10 digit mobile number.",
    where: "Customer se poochhein; ho sake to wahi number jo bank account se juda hai.",
    why: "Details table mein chhapta hai, taaki bank borrower se baat kar sake.",
    importance: "optional",
  },
  email: {
    what: "Customer ka email address.",
    where: "Customer se poochhein.",
    why: "Details table mein chhapta hai. Email nahi hai to khaali chhod dein.",
    importance: "optional",
  },
  address: {
    what: "Business ka poora pata: dukaan ya plot number, gali, mohalla.",
    where: "GST certificate, Udyam certificate, rent agreement ya bijli ka bill.",
    why: "Bank isi pate par inspection ke liye aata hai, isliye ye KYC documents se match hona chahiye.",
    importance: "important",
  },
  city: {
    what: "Business ka shahar ya kasba.",
    where: "Upar wale pate se.",
    why: "Pate ke saath chhapta hai, aur signature box mein 'Place' bhi yahi aata hai.",
    importance: "important",
  },
  state: {
    what: "Business ka state.",
    where: "Upar wale pate se. GSTIN ke pehle do number state code hote hain.",
    why: "Pate ke saath chhapta hai.",
    importance: "optional",
  },
  pincode: {
    what: "Business ke pate ka 6 digit pincode.",
    where: "Upar wale pate se.",
    why: "Pate ke saath chhapta hai; bank dekhta hai ki wo area us branch ke under aata hai ya nahi.",
    importance: "optional",
  },
  bankName: {
    what: "Jis bank aur branch mein loan file jaa rahi hai, jaise 'State Bank of India, Orai'.",
    where: "Customer se poochhein ki kis branch mein apply kar rahe hain.",
    why: "Cover par 'Submitted to ...' likha aata hai. Sahi branch ke naam se file usi ke liye taiyaar lagti hai.",
    importance: "important",
  },
  loanPurpose: {
    what: "Loan kis kaam ke liye hai, jaise 'Working capital (CC limit)' ya 'Embroidery machine kharidne ke liye'.",
    where: "Customer se poochhein; loan application form se match hona chahiye.",
    why: "Cover aur notes mein chhapta hai. Projection isi kaam ko support karna chahiye.",
    importance: "important",
  },
  loanAmount: {
    what: "Customer kitne rupaye ka loan apply kar raha hai.",
    where: "Loan application, ya bank se hui baat-cheet.",
    why: "Cover par chhapta hai. Term loan hai to neeche 'New term loan' mein bhi yahi amount bharein.",
    importance: "important",
  },

  // ── 2. Period ──
  baseYear: {
    what: "Pichhla financial year (April se March) jiska hisaab band ho chuka hai.",
    where: "Customer ki latest ITR ya audited balance sheet kis saal ki hai, wahi saal.",
    why: "Actual figures isi saal ke hote hain; projection agle saal se shuru hota hai.",
    importance: "required",
  },
  "projection.years": {
    what: "Aage ke kitne saal ka projection banana hai. Bank aksar 3 saal maangta hai; term loan mein 5 saal ya loan ki tenure jitna.",
    where: "Bank se poochhein, ya loan tenure ke barabar rakhein.",
    why: "Har projected saal ka DSCR nikalta hai, isliye projection repayment ke poore time ko cover kare.",
    importance: "required",
  },
  hasActual: {
    what: "Business ek saal se chal raha hai to 'Available'; bilkul naya shuru ho raha hai to 'New business'.",
    where: "Ek bhi ITR ya ek saal ka hisaab-kitaab hai, to available hai.",
    why: "Naye business ka sirf projection banta hai, aur pehle saal ki sales khud bharni padti hai.",
    importance: "required",
  },

  // ── 3. Trading and P&L (actual) ──
  "actual.sales": {
    what: "Saal bhar ki total sales ya receipts, GST chhod kar.",
    where: "ITR (gross turnover), GSTR-3B ka saal bhar ka total, ya P&L account.",
    why: "Sab kuch sales se shuru hota hai: margin, debtor days aur agle saal ka projection. Ye ITR aur GST se match honi chahiye.",
    importance: "required",
  },
  "actual.otherIncome": {
    what: "Sales ke alawa income: byaaj mila, commission, kiraya mila, discount.",
    where: "P&L account (credit side), ya ITR mein 'income from other sources'.",
    why: "Profit mein judta hai. Aisi koi income nahi hai to khaali chhod dein.",
    importance: "optional",
  },
  "actual.openingStock": {
    what: "1st April (saal ki shuruat) ko kitne ka maal pada tha.",
    where: "Pichhle saal ki balance sheet: uska closing stock hi is saal ka opening stock hai.",
    why: "Cost of sales nikalne ke liye chahiye. Ye galat hua to gross profit galat aayega.",
    importance: "important",
  },
  "actual.purchases": {
    what: "Saal bhar mein kitne ka maal ya raw material khareeda, GST chhod kar.",
    where: "Purchase register, GSTR-2B ka total, ya P&L account (debit side).",
    why: "Cost of sales ka sabse bada hissa. Kam bharne se profit zyada dikhega, aur bank GST returns se milakar sawaal karega.",
    importance: "required",
  },
  "actual.directExpenses": {
    what: "Maal banane ya laane ka kharcha: freight inward, labour ki mazdoori, machine ki bijli, packing.",
    where: "Trading account (debit side) ya expense ledger.",
    why: "Cost of sales mein judta hai, isliye gross profit par asar padta hai.",
    importance: "important",
  },
  "actual.closingStock": {
    what: "31st March ko kitne ka maal pada tha, kharid ke daam par.",
    where: "Stock statement ya balance sheet. Ye opening stock + purchases + direct expenses se zyada nahi ho sakta.",
    why: "P&L aur balance sheet dono mein aata hai. Bank stock par working capital deta hai, isliye isse dhyan se dekhta hai.",
    importance: "required",
  },
  "actual.salaries": {
    what: "Staff ko di gayi salary aur mazdoori (proprietor ki khud ki nahi).",
    where: "Salary register ya P&L account.",
    why: "Indirect kharcha hai, profit kam karta hai. Maalik ki apni drawings yahan na daalein.",
    importance: "important",
  },
  "actual.rent": {
    what: "Dukaan, office ya godown ka saal bhar ka kiraya.",
    where: "Rent agreement ya P&L account. Jagah apni hai to khaali chhod dein.",
    why: "Indirect kharcha hai, profit kam karta hai.",
    importance: "optional",
  },
  "actual.adminExpenses": {
    what: "Bijli, phone, internet, stationery, office ki dekh-rekh jaise roz ke kharche.",
    where: "P&L account ya expense ledgers.",
    why: "Indirect kharcha hai, profit kam karta hai.",
    importance: "optional",
  },
  "actual.otherExpenses": {
    what: "Upar mein jo nahi aaya wo kharcha: travel, repair, insurance, bank charges, CA ki fees.",
    where: "P&L account.",
    why: "Indirect kharcha hai, profit kam karta hai.",
    importance: "optional",
  },
  "actual.interest": {
    what: "Saal bhar mein loan par diya gaya byaaj (term loan, CC/OD, doosre loan).",
    where: "Bank ka interest certificate, loan statement, ya P&L account.",
    why: "Profit kam karta hai aur DSCR mein lagta hai. Neeche loan bhara hai to yahan byaaj bhi hona chahiye.",
    importance: "important",
  },
  "actual.depreciation": {
    what: "Saal bhar mein fixed assets par liya gaya depreciation.",
    where: "ITR ka depreciation schedule ya fixed asset schedule. Income tax ke rate 10 se 40% WDV hote hain.",
    why: "Profit kam karta hai par cash nahi, isliye DSCR mein wapas joda jaata hai.",
    importance: "important",
  },
  "actual.tax": {
    what: "Saal ke profit par diya gaya ya dena baaki income tax.",
    where: "ITR computation ('tax payable'). Tax nahi bana to khaali chhod dein.",
    why: "Net profit kam karta hai. Ye profit before tax se zyada nahi ho sakta.",
    importance: "optional",
  },

  // ── 4. Balance sheet (actual) ──
  "actual.openingCapital": {
    what: "Saal ki shuruat (1st April) mein maalik ki capital.",
    where: "Pichhle saal ki balance sheet: uski closing capital hi is saal ki opening capital hai.",
    why: "Capital account ki shuruat yahi hai. Closing capital = opening + naya paisa + profit - drawings.",
    importance: "required",
  },
  "actual.capitalIntroduced": {
    what: "Saal ke dauraan maalik ne business mein jo naya paisa daala.",
    where: "Books ka capital account, ya maalik ke personal account se business account mein aaye paise.",
    why: "Capital badhti hai. Bank ko achha lagta hai ki maalik apna paisa laga raha hai.",
    importance: "optional",
  },
  "actual.drawings": {
    what: "Saal bhar mein maalik ne ghar ya personal kharche ke liye business se jo paisa nikala.",
    where: "Books ka capital account, ya bank statement mein personal nikasi.",
    why: "Capital kam hoti hai. Bahut zyada drawings dekh kar bank ko loan chukane ki kshamta par shak hota hai.",
    importance: "important",
  },
  "actual.termLoan": {
    what: "31st March ko term loan (machine, gaadi, business loan) ka kitna paisa baaki tha.",
    where: "Loan account statement ya 31st March ka bank ka balance confirmation.",
    why: "Secured loan mein dikhta hai. Bank purane loan ki kisht bhi DSCR mein ginta hai.",
    importance: "important",
  },
  "actual.unsecuredLoans": {
    what: "Dost, rishtedaar ya kisi aur se bina security liya gaya loan, jo 31st March ko baaki tha.",
    where: "Books ke loan ledger, ya dene walon ka loan confirmation.",
    why: "Bank ise capital jaisa tabhi maanta hai jab dene wala likh kar de ki loan ke dauraan paisa wapas nahi maangega.",
    importance: "optional",
  },
  "actual.creditors": {
    what: "31st March ko suppliers ka udhaar maal ka kitna paisa dena baaki tha.",
    where: "Books mein sundry creditors ki list, ya bina chukaye purchase bill.",
    why: "Current liability hai. Drawing power nikalte waqt bank ise stock mein se ghata deta hai.",
    importance: "important",
  },
  "actual.otherCurrentLiabilities": {
    what: "Saal bhar mein dene wale baaki paise: bachi salary, GST payable, kharche payable, CC/OD ka use kiya balance.",
    where: "Balance sheet (current liabilities) ya ledgers.",
    why: "Current liability hai, current ratio par asar padta hai.",
    importance: "optional",
  },
  "actual.fixedAssets": {
    what: "31st March ko fixed assets (machine, furniture, gaadi, computer, building) ki depreciation ke baad ki value.",
    where: "ITR ya balance sheet ka fixed asset schedule ya depreciation chart.",
    why: "Business ke paas kya hai, ye dikhata hai. Projection ke saalon ka depreciation isi par nikalta hai.",
    importance: "important",
  },
  "actual.investments": {
    what: "Business ke naam par FD, NSC, shares, LIC ya koi aur investment.",
    where: "FD receipt, investment statement ya balance sheet.",
    why: "Asset hai. Koi investment nahi hai to khaali chhod dein.",
    importance: "optional",
  },
  "actual.debtors": {
    what: "31st March ko customers par udhaar bechne ka kitna paisa lena baaki tha.",
    where: "Books mein sundry debtors ki list, ya bina paise aaye sales bill.",
    why: "Current asset hai. Bank 90 din tak ke debtors par loan deta hai aur debtor days dekhta hai.",
    importance: "important",
  },
  "actual.cashAndBank": {
    what: "31st March ko haath mein cash aur business ke saare bank accounts ka balance, dono jod kar.",
    where: "31st March ki cash book aur bank statements.",
    why: "Balance sheet tally na ho to pehle ye check karein: form batayega ki cash kitna hona chahiye.",
    importance: "required",
  },
  "actual.otherCurrentAssets": {
    what: "Suppliers ko diya advance, security deposit, pehle se diye kharche, GST input credit, TDS receivable.",
    where: "Balance sheet (current assets) ya ledgers.",
    why: "Current asset hai. Kuch nahi hai to khaali chhod dein.",
    importance: "optional",
  },

  // ── 5. Projections ──
  "projection.year1Sales": {
    what: "Pehle projected saal mein kitni sales ki ummeed hai. Khaali chhodein to pichhle saal ki sales + growth rate lag jaayega.",
    where: "Customer ka andaaza, haath mein orders, ya pichhle saal ki sales par sahi growth.",
    why: "Projection ka har figure isi se nikalta hai. Pichhle saal se bahut zyada jump par bank sawaal karta hai.",
    importance: "important",
  },
  "projection.salesGrowthPct": {
    what: "Pehle saal ke baad har saal sales kitne percent badhegi. Aam taur par 8 se 15%.",
    where: "Customer ki ITRs se pichhli growth, ya customer ka realistic plan.",
    why: "Bina wajah 25 se 30% saal se zyada growth par bank aksar sawaal karta hai.",
    importance: "important",
  },
  "projection.materialCostPct": {
    what: "Sales ka kitna percent maal ki laagat (cost of sales) hai. Khaali chhodein to pichhle saal ka ratio lagega (grey mein dikh raha hai).",
    where: "Pichhle saal ka cost of sales / sales; grey wala figure pehle se nikala hua hai.",
    why: "Isi se gross margin tay hota hai. 100% se kam hona chahiye, warna har sale par ghaata hai.",
    importance: "optional",
  },
  "projection.indirectExpensesYear1": {
    what: "Pehle projected saal mein salary, kiraya, office aur baaki chalte kharche. Khaali chhodein to pichhle saal ka + growth lagega.",
    where: "Pichhle saal ke indirect kharche, naye staff ya nayi dukaan ke hisaab se badhaa kar.",
    why: "Profit kam karta hai. Bahut kam bharne se projection jhootha lagta hai.",
    importance: "optional",
  },
  "projection.expenseGrowthPct": {
    what: "Indirect kharche har saal kitne percent badhenge. Mehngaai ke hisaab se aam taur par 5 se 10%.",
    where: "Aam mehngaai, ya staff aur kiraye mein planned badhotri.",
    why: "Projection ko har saal realistic rakhta hai.",
    importance: "optional",
  },
  "projection.otherIncomePerYear": {
    what: "Har saal ki doosri income (byaaj, commission). Khaali chhodein to pichhle saal wala figure rahega.",
    where: "Pichhle saal ki other income.",
    why: "Profit mein judti hai.",
    importance: "optional",
  },
  "projection.depreciationPct": {
    what: "Fixed assets par depreciation ka rate, WDV method se. Plant aur machinery par 15% aam hai.",
    where: "Income tax ke rate: furniture 10%, plant aur machinery 15%, gaadi 15%, computer 40%.",
    why: "Har saal profit aur assets ki value kam karta hai.",
    importance: "optional",
  },
  "projection.taxPct": {
    what: "Profit ka kitna percent income tax. Profit taxable limit se kam rahe to 0 bharein.",
    where: "Customer ka tax slab; company ke liye aksar 25%, firm ke liye 30% + cess.",
    why: "Net profit aur loan chukane ke liye bacha cash kam karta hai.",
    importance: "optional",
  },
  "projection.drawingsPerYear": {
    what: "Maalik har saal ghar ke kharche ke liye kitna paisa nikalega.",
    where: "Pichhle saal ki drawings, ya parivaar ka mahine ka kharcha.",
    why: "Capital aur cash kam karta hai. Bank realistic drawings dekhna chahta hai, zero nahi.",
    importance: "important",
  },
  "projection.capitalIntroducedYear1": {
    what: "Pehle projected saal mein maalik business mein apna kitna paisa lagayega, jaise loan ka margin money.",
    where: "Customer se poochhein. Bank aam taur par project cost ka 10 se 25% maalik se margin maangta hai.",
    why: "Maalik ki hissedari dikhata hai. Term loan mein bank dekhta hai ki margin poora ho raha hai.",
    importance: "important",
  },
  "projection.newFixedAssets": {
    what: "Loan se khareedi jaane wali nayi machine, gaadi, furniture ya doosre assets ki keemat.",
    where: "Supplier ka quotation ya proforma invoice.",
    why: "Bank is keemat ka ek hissa fund karta hai. Quotation file ke saath lagayein.",
    importance: "important",
  },
  "projection.newTermLoan": {
    what: "Naye term loan ki amount jo apply ho rahi hai.",
    where: "Term loan hai to upar 'Loan amount applied for' wali hi amount.",
    why: "Isi se repayment schedule aur DSCR banta hai.",
    importance: "important",
  },
  "projection.loanInterestPct": {
    what: "Naye loan par saalana byaaj ka rate, percent mein.",
    where: "Is tarah ke loan ka bank ka current rate (branch se poochhein). Aam taur par 9 se 12%.",
    why: "Byaaj profit kam karta hai aur DSCR mein lagta hai.",
    importance: "important",
  },
  "projection.loanTenureYears": {
    what: "Naya loan kitne saal mein chukaya jaayega.",
    where: "Bank ki scheme; machine loan aam taur par 5 se 7 saal ka hota hai.",
    why: "Isse saalana kisht tay hoti hai. Lambi tenure se DSCR behtar aata hai.",
    importance: "important",
  },
  "projection.existingLoanRepaymentPerYear": {
    what: "Purane term loan ka har saal kitna principal chukaya jaayega (sirf principal, byaaj nahi).",
    where: "Loan repayment schedule: EMI x 12 mein se byaaj ghata kar, ya bank ki amortisation sheet.",
    why: "Bank purane loan ki kisht bhi DSCR mein ginta hai; chhod dene se chukane ki kshamta zyada dikhti hai.",
    importance: "important",
  },
  "projection.existingLoanInterestPct": {
    what: "Purane term loan par byaaj ka rate, percent mein.",
    where: "Loan sanction letter ya loan statement.",
    why: "Purane loan ka byaaj profit kam karta hai aur DSCR mein lagta hai.",
    importance: "optional",
  },
  "projection.debtorDays": {
    what: "Customers aam taur par kitne din mein paisa dete hain. Khaali chhodein to pichhle saal ka lagega (grey mein dikh raha hai).",
    where: "Pichhle saal ka debtors / sales x 365; grey wala figure pehle se nikala hua hai.",
    why: "Har projected balance sheet ke debtors isi se bante hain. Bank 90 din tak ke debtors par paisa deta hai.",
    importance: "optional",
  },
  "projection.creditorDays": {
    what: "Business aam taur par suppliers ko kitne din mein paisa deta hai. Khaali chhodein to pichhle saal ka lagega.",
    where: "Pichhle saal ka creditors / purchases x 365; grey wala figure pehle se nikala hua hai.",
    why: "Har projected balance sheet ke creditors isi se bante hain.",
    importance: "optional",
  },
  "projection.scheme": {
    what: "Loan kis sarkari yojana mein jaa raha hai: CM-YUVA, MYSY, PMEGP, Mudra, ya normal bank loan.",
    where: "Customer ki application ya portal (msme.up.gov.in, kviconline.gov.in, udyamimitra.in).",
    why: "Yojana chunne par own contribution, subsidy, byaaj ki chhoot aur limit ke default lag jaate hain, aur form limit se upar jaane par batata hai.",
    importance: "important",
  },
  "projection.schemeSector": {
    what: "Project manufacturing ka hai, service ka ya trading ka.",
    where: "DPR ya customer ka business plan.",
    why: "PMEGP aur MYSY mein project cost ki limit sector se badalti hai (jaise PMEGP manufacturing 50 lakh, service 20 lakh).",
    importance: "important",
  },
  "projection.schemeArea": {
    what: "Unit shahar (urban) mein lagegi ya gaon (rural) mein.",
    where: "Unit ka pata; gaon panchayat ka area rural hota hai.",
    why: "PMEGP mein rural unit ko zyada subsidy milti hai.",
    importance: "important",
  },
  "projection.schemeCategory": {
    what: "General, ya special category (SC/ST/OBC/Minority/Mahila/Ex-servicemen/Divyang).",
    where: "Customer ka caste ya category certificate.",
    why: "Special category mein own contribution kam (5%) aur PMEGP subsidy zyada hoti hai.",
    importance: "important",
  },
  "projection.workingCapitalNeed": {
    what: "Business chalane ke ek cycle ke liye kitna working capital chahiye: kachcha maal, stock, udhaar sales.",
    where: "DPR ka working capital calculation, ya ek cycle ka maal + kharcha.",
    why: "Project cost = machine + working capital. Isi se CC limit aur means of finance bante hain.",
    importance: "important",
  },
  "projection.ccLimit": {
    what: "Bank se working capital ke liye CC (cash credit) ya OD limit kitni li ja rahi hai.",
    where: "Loan application ya sanction letter; yojana mein working capital wala hissa.",
    why: "CC har saal chalta rehta hai (revolving), uska byaaj P&L mein lagta hai. CM-YUVA jaisi yojana mein term loan ke saath CC zaroori hai.",
    importance: "important",
  },
  "projection.ccInterestPct": {
    what: "CC / working capital limit par saalana byaaj ka rate.",
    where: "Bank ka current CC rate (branch se poochhein). Aam taur par 9 se 12%.",
    why: "Byaaj profit kam karta hai. DSCR term loan par nikalta hai, CC ka byaaj kharche mein aata hai.",
    importance: "important",
  },
  "projection.subsidyAmount": {
    what: "Yojana ki margin money ya capital subsidy kitni milegi.",
    where: "Yojana ke rate se: PMEGP 15 se 35%, MYSY 25%, CM-YUVA 10% (max Rs. 50,000). 'Yojana ke hisaab se bharein' dabane par khud bhar jaati hai.",
    why: "Subsidy back-ended hoti hai: bank lock-in tak TDR mein rakhta hai, isliye balance sheet mein dono taraf barabar dikhti hai.",
    importance: "optional",
  },
  "projection.interestSubventionPct": {
    what: "Naye loan (term + CC) ke byaaj ka kitna percent sarkar degi.",
    where: "Yojana ka guideline: CM-YUVA mein pehle charan 100% (bina byaaj).",
    why: "P&L mein byaaj poora dikhta hai aur 'Less: Interest subvention' se ghatta hai, isliye profit aur DSCR sahi aate hain.",
    importance: "optional",
  },
  "projection.interestSubventionYears": {
    what: "Byaaj ki chhoot kitne saal milegi.",
    where: "Yojana ka guideline: CM-YUVA mein 4 saal.",
    why: "Utne hi projected saalon mein byaaj ki chhoot lagti hai; uske baad poora byaaj.",
    importance: "optional",
  },
  "projection.stockDays": {
    what: "Pada hua maal kitne din ki sales ke barabar hai. Khaali chhodein to pichhle saal ka lagega.",
    where: "Pichhle saal ka closing stock / cost of sales x 365; grey wala figure pehle se nikala hua hai.",
    why: "Har projected saal ka closing stock isi se banta hai, jis par bank CC limit deta hai.",
    importance: "optional",
  },
};
