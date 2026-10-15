export type CreditCardOffer = {
  name: string;
  slug: string;
  bankName: string;
  bank?: string;
  cardNetwork: "Visa" | "RuPay";
  theme: "hdfc" | "swiggy" | "tata" | "rupay" | "biz" | "pixel" | "axis" | "yes" | "indusind";
  applyUrl: string;
  overview: string;
  shortBenefits: string[];
  benefits: string[];
  eligibility: string[];
  documents: string[];
  feesNote: string;
};

export const creditCards: CreditCardOffer[] = [
  {
    name: "HDFC Bank Credit Card",
    slug: "hdfc-bank-credit-card",
    bankName: "HDFC Bank",
    bank: "HDFC Bank",
    cardNetwork: "Visa",
    theme: "hdfc",
    applyUrl: "https://wee.bnking.in/c/Y2JlNTJmY",
    overview: "A flexible HDFC Bank credit card option for everyday spending, online payments, travel, and lifestyle purchases.",
    shortBenefits: ["Rewards", "Shopping", "Bills"],
    benefits: ["Reward-led spending experience", "Useful for shopping, bills, and travel payments", "Digital application journey with bank verification"],
    eligibility: ["Indian resident with valid KYC documents", "Stable income as per bank policy", "Credit profile accepted by the bank"],
    documents: ["PAN Card", "Aadhaar or valid address proof", "Income proof or bank statement if requested", "Mobile number linked for verification"],
    feesNote: "Joining fee, annual fee, renewal fee, interest, and other charges are decided by the bank and may vary by offer and customer profile.",
  },
  {
    name: "Swiggy HDFC Bank Credit Card",
    slug: "swiggy-hdfc-bank-credit-card",
    bankName: "HDFC Bank",
    bank: "HDFC Bank",
    cardNetwork: "Visa",
    theme: "swiggy",
    applyUrl: "https://wee.bnking.in/c/NzU4MmRiO",
    overview: "A co-branded HDFC Bank credit card designed for food ordering, online purchases, and app-based lifestyle spends.",
    shortBenefits: ["Dining", "Cashback", "Apps"],
    benefits: ["Designed for food and lifestyle spends", "Useful for online shopping and app transactions", "Bank-led approval and card issuance"],
    eligibility: ["Indian resident meeting HDFC Bank criteria", "Valid PAN and address proof", "Credit score and income accepted by the bank"],
    documents: ["PAN Card", "Aadhaar or address proof", "Income proof if requested", "Recent photograph or digital KYC details if required"],
    feesNote: "Fees, cashback, reward rules, exclusions, and renewal conditions are controlled by HDFC Bank and partner terms.",
  },
  {
    name: "Tata Neu Plus HDFC Bank Credit Card",
    slug: "tata-neu-plus-hdfc-bank-credit-card",
    bankName: "HDFC Bank",
    bank: "HDFC Bank",
    cardNetwork: "Visa",
    theme: "tata",
    applyUrl: "https://wee.bnking.in/c/MWI4NTkzY",
    overview: "A Tata Neu and HDFC Bank credit card option for shoppers who use Tata ecosystem brands and digital payments.",
    shortBenefits: ["NeuCoins", "Shopping", "Lifestyle"],
    benefits: ["Useful for Tata Neu ecosystem spends", "Everyday payments and shopping support", "Digital application with bank-side verification"],
    eligibility: ["Indian resident with valid KYC", "Meets bank income and credit policy", "Mobile and PAN verification as required"],
    documents: ["PAN Card", "Aadhaar or address proof", "Income proof or bank statement if requested", "Employment or business details if needed"],
    feesNote: "Card fees, NeuCoins, reward caps, exclusions, and charges depend on the latest HDFC Bank and Tata Neu terms.",
  },
  {
    name: "HDFC Bank RuPay Credit Card",
    slug: "hdfc-bank-rupay-credit-card",
    bankName: "HDFC Bank",
    bank: "HDFC Bank",
    cardNetwork: "RuPay",
    theme: "rupay",
    applyUrl: "https://wee.bnking.in/c/ZDI2Yzk5M",
    overview: "A RuPay network credit card option from HDFC Bank for eligible users who prefer domestic network compatibility.",
    shortBenefits: ["RuPay", "UPI Ready", "Domestic"],
    benefits: ["RuPay network card option", "Useful for eligible online and offline purchases", "Bank-managed approval process"],
    eligibility: ["Indian resident with valid documents", "Bank-approved income and credit profile", "KYC and verification completed successfully"],
    documents: ["PAN Card", "Aadhaar or valid address proof", "Income document if requested", "Bank statement if required by bank"],
    feesNote: "Fees, reward structure, UPI/RuPay features, and transaction rules are subject to bank and network terms.",
  },
  {
    name: "HDFC Bank Biz Credit Card",
    slug: "hdfc-bank-biz-credit-card",
    bankName: "HDFC Bank",
    bank: "HDFC Bank",
    cardNetwork: "Visa",
    theme: "biz",
    applyUrl: "https://wee.bnking.in/c/NTFkOGJhN",
    overview: "An HDFC Bank business credit card option for self-employed professionals and business owners who want to keep business spends separate.",
    shortBenefits: ["Business", "Rewards", "Bills"],
    benefits: ["Built for business and professional spends", "Useful for vendor, utility, and online business payments", "Bank-led eligibility check and card issuance"],
    eligibility: ["Self-employed professional or business owner as per HDFC Bank criteria", "Valid PAN and business/KYC documents", "Income and credit profile accepted by the bank"],
    documents: ["PAN Card", "Aadhaar or address proof", "Business proof such as GST or registration if requested", "ITR or bank statement if requested"],
    feesNote: "Joining fee, annual fee, reward rules, and business card charges are decided by HDFC Bank and may vary by applicant profile.",
  },
  {
    name: "PIXEL Credit Card",
    slug: "pixel-credit-card",
    bankName: "HDFC Bank",
    bank: "HDFC Bank",
    cardNetwork: "Visa",
    theme: "pixel",
    applyUrl: "https://wee.bnking.in/c/Y2M0MWQ5Y",
    overview: "A digital-first credit card option for customers looking for a modern application and usage experience.",
    shortBenefits: ["Digital", "Online", "Fast"],
    benefits: ["Digital-first card experience", "Useful for app-based and online payments", "Fast application journey subject to bank checks"],
    eligibility: ["Valid PAN and Indian mobile number", "Bank-accepted credit profile", "Income and KYC details as per bank rules"],
    documents: ["PAN Card", "Aadhaar or address proof", "Income proof if requested", "Digital KYC details"],
    feesNote: "All charges, feature eligibility, rewards, and limits are determined by the issuing bank at approval or onboarding.",
  },
  {
    name: "Axis Bank Credit Card - CK",
    slug: "axis-bank-credit-card-ck",
    bankName: "Axis Bank",
    bank: "Axis Bank",
    cardNetwork: "Visa",
    theme: "axis",
    applyUrl: "https://wee.bnking.in/c/YTE5NzNlN",
    overview: "An Axis Bank credit card offer for eligible applicants seeking shopping, bill payment, and lifestyle benefits.",
    shortBenefits: ["Lifestyle", "Bills", "Rewards"],
    benefits: ["Axis Bank card options for eligible users", "Useful for shopping and recurring payments", "Bank verification before approval"],
    eligibility: ["Indian resident as per Axis Bank criteria", "Valid PAN and KYC documents", "Credit score and income accepted by bank"],
    documents: ["PAN Card", "Aadhaar or address proof", "Income proof if requested", "Bank statement if required"],
    feesNote: "Joining fee, annual fee, finance charges, reward rules, and waivers are governed by Axis Bank terms.",
  },
  {
    name: "Yes Bank Credit Card",
    slug: "yes-bank-credit-card",
    bankName: "Yes Bank",
    bank: "Yes Bank",
    cardNetwork: "Visa",
    theme: "yes",
    applyUrl: "https://wee.bnking.in/c/NWUxY2M0Z",
    overview: "A Yes Bank credit card option for eligible customers who want a bank-issued card for digital and retail spends.",
    shortBenefits: ["Retail", "Travel", "Bills"],
    benefits: ["Useful for purchases, bills, and travel spends", "Bank-led eligibility and verification", "Digital application support through the link"],
    eligibility: ["Indian resident with valid KYC", "Meets Yes Bank income and credit criteria", "Successful verification by the bank"],
    documents: ["PAN Card", "Aadhaar or address proof", "Income proof if requested", "Mobile number for verification"],
    feesNote: "All fees, charges, limits, and reward benefits depend on Yes Bank's latest product terms and approval decision.",
  },
  {
    name: "IndusInd Bank Credit Card",
    slug: "indusind-bank-credit-card",
    bankName: "IndusInd Bank",
    bank: "IndusInd Bank",
    cardNetwork: "Visa",
    theme: "indusind",
    applyUrl: "https://wee.bnking.in/c/MTFjMDE3Y",
    overview: "An IndusInd Bank credit card offer for eligible applicants looking for a premium card application option.",
    shortBenefits: ["Premium", "Lifestyle", "Travel"],
    benefits: ["IndusInd Bank credit card options", "Useful for lifestyle and digital spends", "Approval subject to bank verification"],
    eligibility: ["Indian resident with valid PAN", "Bank-accepted income and credit profile", "KYC and document verification completed"],
    documents: ["PAN Card", "Aadhaar or valid address proof", "Income proof if requested", "Bank statement if requested"],
    feesNote: "Fees, charges, reward value, waiver rules, and card limits are decided by IndusInd Bank as per current policy.",
  },
];

export function getCreditCardBySlug(slug: string) {
  return creditCards.find((card) => card.slug === slug) ?? null;
}

/** The cards the /credit-cards lounge and the homepage spotlight show, in order. */
export const featuredCreditCardSlugs = [
  "hdfc-bank-credit-card",
  "swiggy-hdfc-bank-credit-card",
  "tata-neu-plus-hdfc-bank-credit-card",
  "hdfc-bank-rupay-credit-card",
  "hdfc-bank-biz-credit-card",
  "pixel-credit-card",
  "axis-bank-credit-card-ck",
];

export function getFeaturedCreditCards() {
  return featuredCreditCardSlugs
    .map((slug) => getCreditCardBySlug(slug))
    .filter((card): card is CreditCardOffer => card !== null);
}
