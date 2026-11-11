import type { SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";

import type { CapitalItem, Overhead, Product, RawMaterial, StaffRow } from "./engine";

/**
 * The wider list of businesses the DPR form offers, beyond the hand-built
 * templates in templates.ts.
 *
 * Each activity is described the way a consultant sketches a unit on paper:
 * the machines and what they cost, what is sold and at what price, what
 * share of the sales goes on raw material and on running costs, who works
 * there, and a few lines on market and process. `buildActivity` turns that
 * into a full template. It sets the yearly sales so that, at 80% capacity,
 * the unit earns before interest and depreciation about 55% of what it costs
 * to set up — the level at which a small unit repays a five-year loan with
 * an average DSCR comfortably above 1.5 — and works out quantities from the
 * prices. Every figure stays editable in the form.
 *
 * The groups and the scheme rules follow the scheme guidelines checked in
 * November 2026: PMEGP and MYSY fund manufacturing and service units, not
 * pure trading; CM-YUVA and Mudra fund trading too. A few activities carry
 * their own exclusions (`notFor`).
 */

export type ActivityGroup =
  | "food"
  | "household"
  | "paper"
  | "textile"
  | "engineering"
  | "repair"
  | "personal"
  | "hospitality"
  | "trading";

export const GROUP_LABELS: Record<ActivityGroup, string> = {
  food: "Khadya prasanskaran (food processing)",
  household: "Ghar-upyog aur chemical utpad",
  paper: "Kagaz, packing aur printing",
  textile: "Kapda, chamda aur silai",
  engineering: "Engineering, electrical aur nirmaan saamagri",
  repair: "Service: repair aur technical",
  personal: "Service: shiksha, sehat aur personal care",
  hospitality: "Service: khana, event aur transport",
  trading: "Trading (dukaan / vyapar)",
};

export type TemplateTextParts = {
  market: string;
  process: string;
  machinery?: string;
  rawMaterialSource: string;
  marketing?: string;
  licences?: string[];
  risks?: [string, string][];
  swot?: { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[] };
};

export type ActivitySketch = {
  id: string;
  label: string;
  activity: string;
  sector: SchemeSector;
  group: ActivityGroup;
  /** Schemes that do not fund this activity even though its sector qualifies. */
  notFor?: SchemeId[];
  /** [description, rate, quantity?] at the reference size. */
  machines: [string, number, number?][];
  electrical?: number;
  furniture?: number;
  preliminary?: number;
  /** [name, unit, price, share of sales]. Shares add up to 1. */
  products: [string, string, number, number][];
  /** [name, unit, rate, share of sales]. The shares add up to the raw material ratio. */
  materials: [string, string, number, number][];
  /** [role, count, monthly salary, direct?]. */
  staff: [string, number, number, boolean][];
  /** Running costs that move with output: [name, share of sales, direct?]. */
  variable: [string, number, boolean][];
  /** Fixed monthly running costs: [name, per month, direct?]. */
  fixed: [string, number, boolean][];
  /** Raw material, finished goods, debtors and creditors, in days. */
  days: [number, number, number, number];
  text: TemplateTextParts;
};

const COMMON_LICENCES = ["Udyam Registration (MSME)", "GST registration", "Trade licence / shop registration from the local body", "Current account with the financing bank"];

/** What each group of trades has in common: licences, risks and SWOT points. */
const GROUP_TEXT: Record<
  ActivityGroup,
  { licences: string[]; marketing: string; risks: [string, string][]; swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] } }
> = {
  food: {
    licences: ["FSSAI food business registration / licence", "Water test report for processing water", "Electricity connection (commercial / industrial load)"],
    marketing:
      "The products will be sold under a local brand through kirana shops, sweet shops, hotels and distributors in the district, with direct supply to institutional buyers. Attractive packing, consistent taste and timely supply will build repeat orders; social media and local fairs will be used for promotion.",
    risks: [
      ["Fluctuation in raw material prices", "Bulk purchase in season and periodic revision of selling price."],
      ["Competition from branded products", "Freshness, local taste, lower price and direct supply."],
      ["Quality and shelf life", "Hygienic process, FSSAI norms, batch coding and stock rotation."],
    ],
    swot: {
      strengths: ["Daily-use product with steady demand", "Simple, proven process", "Promoter's local market knowledge"],
      weaknesses: ["New brand in the market", "Working capital tied up in stock"],
      opportunities: ["Growing demand for packed hygienic food", "Supply to hotels, hostels and canteens", "Online and modern retail"],
      threats: ["Large branded players", "Raw material price swings"],
    },
  },
  household: {
    licences: ["Pollution control board consent / NOC where applicable", "Fire safety arrangements", "Electricity connection"],
    marketing:
      "Sales will be made through general stores, wholesalers and institutional buyers such as hotels, hospitals, schools and offices. The unit will compete on price and dependable quality and appoint commission agents in nearby towns.",
    risks: [
      ["Price competition", "Low overheads and direct supply to retailers and institutions."],
      ["Rise in chemical / input prices", "Bulk buying and price revision."],
      ["Safe handling of materials", "Trained staff, protective gear and proper storage."],
    ],
    swot: {
      strengths: ["Everyday consumable with repeat purchase", "Low investment, simple process"],
      weaknesses: ["Brand recognition takes time"],
      opportunities: ["Institutional and government supply", "Private-label supply to retailers"],
      threats: ["Branded products and cheaper unorganised supply"],
    },
  },
  paper: {
    licences: ["Electricity connection (industrial load)", "Pollution control board consent where applicable"],
    marketing:
      "Orders will be taken directly from shops, sweet shops, caterers, schools, offices and manufacturers in the district, with regular supply to wholesalers. Prompt delivery and custom sizes or printing will be offered.",
    risks: [
      ["Paper / board price increase", "Price revision clauses with regular buyers and stock bought in bulk."],
      ["Competition", "Quick delivery, small minimum order and custom work."],
    ],
    swot: {
      strengths: ["Steady demand from many small buyers", "Easy-to-operate machines"],
      weaknesses: ["Thin margins on standard items"],
      opportunities: ["Plastic ban increasing demand for paper products", "Branded / printed packaging"],
      threats: ["Large mechanised units", "Paper price volatility"],
    },
  },
  textile: {
    licences: ["Electricity connection"],
    marketing:
      "The unit will sell to retailers and wholesalers in nearby markets, take bulk orders from schools, institutions and shops, and sell directly at local haats and through social media. Fashion-led designs and reliable delivery will drive repeat orders.",
    risks: [
      ["Change in fashion / demand", "Small batches, quick design changes and job work in lean season."],
      ["Skilled labour availability", "Training local workers, especially women."],
    ],
    swot: {
      strengths: ["Labour-intensive with local skills available", "Low machinery cost"],
      weaknesses: ["Seasonal demand"],
      opportunities: ["Wedding and festival seasons", "School and institutional orders", "Online sales"],
      threats: ["Cheap factory-made goods", "Fabric price changes"],
    },
  },
  engineering: {
    licences: ["Electricity connection (industrial load)", "Pollution control board consent where applicable", "BIS / quality marking where applicable"],
    marketing:
      "Orders will come from builders, contractors, dealers and government works in the district. The promoter will register as a supplier with local bodies and offer quality-tested products with timely delivery.",
    risks: [
      ["Input price increase (steel, cement, components)", "Order-wise pricing and bulk purchase."],
      ["Delayed payments", "Advance on orders and credit only to known buyers."],
    ],
    swot: {
      strengths: ["Demand from construction and infrastructure growth", "Proven technology"],
      weaknesses: ["Working capital needed for credit sales"],
      opportunities: ["Government housing and infrastructure schemes", "Supply to dealers in nearby districts"],
      threats: ["Competition from larger units", "Construction slowdown"],
    },
  },
  repair: {
    licences: [],
    marketing:
      "The shop will be at a busy location and will win customers through quick, honest service, a written job card and warranty on work. Tie-ups with dealers, mechanics and housing societies, a signboard and WhatsApp / Google listing will bring regular customers.",
    risks: [
      ["Competition from nearby workshops", "Faster turnaround, fair rates and warranty."],
      ["Technology changes", "Regular training and new tools."],
    ],
    swot: {
      strengths: ["Steady service demand", "Low raw material risk", "Promoter's technical skill"],
      weaknesses: ["Depends on skilled staff"],
      opportunities: ["Rising number of vehicles and appliances", "Annual maintenance contracts"],
      threats: ["Authorised service centres", "Price-cutting by unorganised players"],
    },
  },
  personal: {
    licences: [],
    marketing:
      "Customers will be reached through local advertising, pamphlets, social media, word of mouth and tie-ups with schools, clinics and housing societies. Introductory offers, memberships and good service will build a loyal customer base.",
    risks: [
      ["Competition", "Better service, trained staff and fair pricing."],
      ["Slow build-up of customers", "Introductory offers and active local promotion."],
    ],
    swot: {
      strengths: ["Service demand close to home", "Promoter's qualification and experience"],
      weaknesses: ["Takes time to build reputation"],
      opportunities: ["Rising incomes and awareness", "Online booking and promotion"],
      threats: ["Established competitors", "Customers moving to bigger towns"],
    },
  },
  hospitality: {
    licences: ["FSSAI registration where food is served", "Fire safety arrangements"],
    marketing:
      "The business will rely on a good location, social media, listings on Google and food apps, tie-ups with event organisers and word of mouth. Clean service, fair rates and package deals will bring repeat customers and bookings.",
    risks: [
      ["Seasonal demand", "Package offers in lean months and diversified services."],
      ["Rise in input costs", "Menu / rate revision and bulk purchase."],
    ],
    swot: {
      strengths: ["Growing demand for eating out, events and local transport", "Cash business"],
      weaknesses: ["Labour-intensive"],
      opportunities: ["Weddings and social functions", "Online orders and bookings"],
      threats: ["Competition", "Changes in local regulations"],
    },
  },
  trading: {
    licences: ["Shop and establishment registration"],
    marketing:
      "The shop will be at a busy market location with good display, fair prices and a wide range. Home delivery, credit to known customers, WhatsApp orders and festival offers will build a regular customer base.",
    risks: [
      ["Competition from nearby shops and online sellers", "Range, service, home delivery and fair price."],
      ["Dead stock", "Stock planned on sales data; slow items cleared through offers."],
    ],
    swot: {
      strengths: ["Daily demand from the local population", "Simple business with quick stock turnover"],
      weaknesses: ["Thin margin per item"],
      opportunities: ["Rising consumption in small towns", "Home delivery and online orders"],
      threats: ["Online and large retail chains", "Price competition"],
    },
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   The activities
   ───────────────────────────────────────────────────────────────────────── */

export const ACTIVITY_SKETCHES: ActivitySketch[] = [
  // ── Food processing ──
  {
    id: "packaged-water",
    label: "Packaged drinking water / mineral water plant (RO)",
    activity: "manufacturing of packaged drinking water in bottles, jars and pouches",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["RO water treatment plant 1000 LPH with sand / carbon filters, UV and ozonator", 420000],
      ["Semi-automatic bottle rinsing, filling and capping machine", 220000],
      ["20 litre jar washing, filling and capping machine", 110000],
      ["Automatic pouch packing machine", 90000],
      ["Water testing laboratory equipment", 70000],
    ],
    electrical: 60000,
    furniture: 30000,
    preliminary: 40000,
    products: [
      ["Packaged drinking water 1 litre (case of 12)", "case", 95, 0.5],
      ["20 litre jar (with refill)", "jar", 30, 0.3],
      ["Water pouch 250 ml (bag of 50)", "bag", 45, 0.2],
    ],
    materials: [
      ["PET preforms and caps", "1000 pcs", 1900, 0.2],
      ["Labels, shrink film and cartons", "1000 pcs", 650, 0.08],
      ["Pouch film roll", "kg", 190, 0.04],
    ],
    staff: [
      ["Plant operator", 1, 13000, true],
      ["Helper / packer", 2, 9000, true],
      ["Chemist (part time)", 1, 8000, false],
      ["Delivery and sales", 1, 10000, false],
    ],
    variable: [
      ["Electricity / power", 0.04, true],
      ["Chemicals and filter replacement", 0.01, true],
      ["Transport and delivery", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 2500, true],
      ["Office, telephone and stationery", 2000, false],
    ],
    days: [15, 5, 15, 15],
    text: {
      market:
        "Demand for safe packaged drinking water is rising fast in towns and villages: households, offices, shops, hotels, marriage halls, hospitals and travellers buy bottles and 20 litre jars every day, and demand peaks in summer and the wedding season. Ground water in many areas has high TDS, which drives jar sales for homes and offices.",
      process:
        "Raw water from the borewell is passed through sand and carbon filters, softener, reverse osmosis membranes, micron filters, UV sterilisation and ozonation. Treated water is filled in sterilised bottles, jars and pouches, capped, labelled, batch-coded and packed. Every batch is tested in the in-house laboratory as required by BIS (IS 14543).",
      machinery:
        "A 1000 litres-per-hour RO plant with pre-treatment, UV and ozonator, a bottle rinsing-filling-capping machine, a jar line, a pouch packing machine and a testing laboratory are proposed. These are supplied by established plant makers in Delhi, Ghaziabad and Lucknow, who also install and train staff.",
      rawMaterialSource: "Raw water comes from the unit's own borewell. PET preforms, caps, labels and pouch film are available from packaging suppliers in Kanpur, Lucknow and Delhi.",
      licences: ["BIS certification (IS 14543) for packaged drinking water", "Ground water NOC / registration from the State Ground Water Department", "Pollution control board consent (green / orange category)"],
      risks: [["Seasonal demand", "Jar supply to homes and offices keeps sales steady through winter."]],
      swot: { opportunities: ["Marriage halls, hotels and events", "Office and home jar subscriptions"] },
    },
  },
  {
    id: "papad",
    label: "Papad udyog (papad making)",
    activity: "manufacturing of papad",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Papad making machine (semi-automatic) with dryer", 280000],
      ["Dough kneading machine", 90000],
      ["Flour mixer / pulveriser", 60000],
      ["Pouch sealing and weighing machine", 40000],
    ],
    electrical: 30000,
    furniture: 40000,
    preliminary: 20000,
    products: [
      ["Urad / moong papad", "kg", 240, 0.7],
      ["Rice and potato papad", "kg", 180, 0.3],
    ],
    materials: [
      ["Urad / moong dal flour", "kg", 120, 0.38],
      ["Spices, salt and papad khar", "kg", 220, 0.07],
      ["Packing pouches and cartons", "kg", 200, 0.05],
    ],
    staff: [
      ["Papad maker / helper", 3, 8500, true],
      ["Sales and accounts", 1, 10000, false],
    ],
    variable: [
      ["Electricity and fuel", 0.03, true],
      ["Transport and marketing", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 1500, true],
      ["Office and telephone", 1500, false],
    ],
    days: [30, 15, 20, 15],
    text: {
      market: "Papad is eaten with meals in almost every household and served in hotels, dhabas and wedding feasts. Packed local papad sells well in kirana and sweet shops, and demand rises in the wedding season.",
      process: "Dal flour is mixed with spices, salt and papad khar, kneaded into dough, rolled into papad on the machine, dried, sorted, weighed and packed in pouches and cartons.",
      rawMaterialSource: "Urad and moong dal flour, spices and packing material are available from wholesale markets in the district.",
      swot: { strengths: ["Employment for local women"] },
    },
  },
  {
    id: "pickle",
    label: "Achar, murabba aur chutney (pickle making)",
    activity: "manufacturing of pickles, murabba and chutney",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Vegetable / fruit cutting machine", 90000],
      ["Mixing machine (stainless steel)", 110000],
      ["Steam jacketed kettle", 120000],
      ["Bottle / jar filling and sealing machine", 70000],
      ["Stainless steel storage drums and utensils", 60000],
    ],
    electrical: 30000,
    furniture: 30000,
    preliminary: 20000,
    products: [
      ["Mango / mixed pickle", "kg", 170, 0.6],
      ["Amla murabba and chutney", "kg", 150, 0.4],
    ],
    materials: [
      ["Raw mango, amla, lemon and vegetables", "kg", 45, 0.2],
      ["Mustard oil", "kg", 170, 0.12],
      ["Spices, salt and sugar", "kg", 160, 0.1],
      ["Jars, pouches and labels", "pcs", 9, 0.07],
    ],
    staff: [
      ["Worker", 3, 8500, true],
      ["Sales / delivery", 1, 10000, false],
    ],
    variable: [
      ["Fuel and electricity", 0.025, true],
      ["Transport and marketing", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 1000, true],
      ["Office and telephone", 1500, false],
    ],
    days: [45, 30, 20, 15],
    text: {
      market: "Home-style pickles, murabba and chutneys are bought by households, hotels, dhabas and tiffin services throughout the year. Hygienic packed local brands are replacing loose pickles in kirana shops and highway stores.",
      process: "Fruits and vegetables are washed, cut, salted and sun-cured, mixed with spices and oil (or sugar syrup for murabba), matured, filled in jars and pouches, sealed, labelled and batch-coded.",
      rawMaterialSource: "Mango, amla, lemon and vegetables come from local orchards and mandis in season; oil, spices and jars from district wholesalers.",
    },
  },
  {
    id: "sauce-jam",
    label: "Tomato sauce, jam aur jelly",
    activity: "manufacturing of tomato sauce, jam and jelly",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Fruit / tomato pulper", 120000],
      ["Steam jacketed kettle with stirrer", 150000],
      ["Small boiler", 90000],
      ["Bottle filling, capping and labelling machine", 90000],
      ["Refractometer and lab equipment", 30000],
    ],
    electrical: 35000,
    furniture: 30000,
    preliminary: 20000,
    products: [
      ["Tomato sauce / ketchup", "kg", 110, 0.6],
      ["Mixed fruit jam and jelly", "kg", 160, 0.4],
    ],
    materials: [
      ["Tomato and fruits", "kg", 22, 0.2],
      ["Sugar", "kg", 44, 0.12],
      ["Vinegar, spices and preservatives", "kg", 120, 0.06],
      ["Bottles, pouches and labels", "pcs", 8, 0.1],
    ],
    staff: [
      ["Worker", 3, 8500, true],
      ["Supervisor / sales", 1, 12000, false],
    ],
    variable: [
      ["Fuel and electricity", 0.03, true],
      ["Transport and marketing", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 1500, true],
      ["Office and telephone", 1500, false],
    ],
    days: [30, 20, 20, 15],
    text: {
      market: "Sauce, jam and jelly are used daily by fast-food stalls, restaurants, bakeries, hostels and households. Bulk sauce pouches for street-food vendors are a fast-growing segment in small towns.",
      process: "Tomatoes and fruits are washed, pulped and strained; pulp is cooked with sugar, vinegar and spices to the right consistency, checked on the refractometer, hot-filled in bottles and pouches, capped, cooled and labelled.",
      rawMaterialSource: "Tomatoes and fruits are bought from local mandis in season; sugar, vinegar and packing material from district wholesalers.",
    },
  },
  {
    id: "besan",
    label: "Besan aur dal mill",
    activity: "manufacturing of gram flour (besan) and processed pulses",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Dal mill (mini) with grader and polisher", 280000],
      ["Pulveriser for besan with sieve", 160000],
      ["Packing and stitching machine", 50000],
      ["Platform weighing scale", 20000],
    ],
    electrical: 45000,
    furniture: 25000,
    preliminary: 20000,
    products: [
      ["Besan (gram flour)", "quintal", 8500, 0.65],
      ["Split pulses (dal)", "quintal", 9000, 0.3],
      ["Chuni / husk (cattle feed)", "quintal", 1800, 0.05],
    ],
    materials: [["Chana and other pulses", "quintal", 6800, 0.8]],
    staff: [
      ["Mill operator", 2, 11000, true],
      ["Sales and accounts", 1, 10000, false],
    ],
    variable: [
      ["Electricity / power", 0.015, true],
      ["Packing material", 0.01, true],
      ["Transport", 0.01, false],
    ],
    fixed: [
      ["Repairs and maintenance", 2000, true],
      ["Office and telephone", 1500, false],
    ],
    days: [20, 7, 15, 15],
    text: {
      market: "Besan is used daily in households, sweet shops, namkeen units and dhabas, and split pulses are a staple. Bundelkhand and central UP grow large quantities of chana, so local processing saves freight and gives fresher produce.",
      process: "Pulses are cleaned and graded, conditioned, split and polished in the dal mill. For besan, gram dal is ground in the pulveriser and sieved. Products are weighed, packed and stitched; husk and chuni are sold as cattle feed.",
      rawMaterialSource: "Chana, arhar and other pulses are bought from local mandis and farmers, especially after the rabi harvest.",
    },
  },
  {
    id: "murmura",
    label: "Murmura, lai aur poha (puffed rice)",
    activity: "manufacturing of puffed rice (murmura / lai) and poha",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Murmura (puffed rice) machine with roaster", 260000],
      ["Poha making machine", 150000],
      ["Grader / sieve", 40000],
      ["Pouch packing machine", 50000],
    ],
    electrical: 35000,
    furniture: 25000,
    preliminary: 20000,
    products: [
      ["Murmura / lai", "kg", 70, 0.55],
      ["Poha (flattened rice)", "kg", 60, 0.45],
    ],
    materials: [
      ["Paddy / rice", "kg", 32, 0.58],
      ["Salt and packing material", "kg", 60, 0.04],
    ],
    staff: [
      ["Machine operator", 2, 10000, true],
      ["Helper", 1, 8500, true],
      ["Sales / accounts", 1, 10000, false],
    ],
    variable: [
      ["Fuel and electricity", 0.05, true],
      ["Transport and marketing", 0.025, false],
    ],
    fixed: [
      ["Repairs and maintenance", 1500, true],
      ["Office and telephone", 1500, false],
    ],
    days: [20, 7, 15, 15],
    text: {
      market: "Murmura and poha are cheap, popular breakfast and snack foods, sold loose and packed in every kirana shop and used by chaat and bhel vendors. Demand peaks during festivals such as Makar Sankranti and Diwali.",
      process: "Rice is soaked, salted and roasted in hot sand / air in the murmura machine; for poha, paddy is soaked, roasted and flattened. The product is graded, cooled and packed.",
      rawMaterialSource: "Paddy and rice are available from rice mills and mandis in the district throughout the year.",
    },
  },
  {
    id: "pasta-noodles",
    label: "Noodles, macaroni aur pasta",
    activity: "manufacturing of noodles, macaroni and pasta",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Pasta / noodle extruder with dies", 320000],
      ["Dough mixer", 80000],
      ["Drying chamber with trays", 90000],
      ["Pouch packing machine", 60000],
    ],
    electrical: 40000,
    furniture: 25000,
    preliminary: 20000,
    products: [
      ["Macaroni and pasta", "kg", 85, 0.6],
      ["Noodles", "kg", 80, 0.4],
    ],
    materials: [
      ["Maida / suji", "kg", 34, 0.45],
      ["Packing pouches and cartons", "kg", 220, 0.06],
    ],
    staff: [
      ["Machine operator", 2, 11000, true],
      ["Helper / packer", 1, 8500, true],
      ["Sales", 1, 10000, false],
    ],
    variable: [
      ["Electricity / power", 0.04, true],
      ["Transport and marketing", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 1500, true],
      ["Office and telephone", 1500, false],
    ],
    days: [20, 15, 20, 15],
    text: {
      market: "Noodles and pasta have become regular snack and meal items among children and young people, and are used in large quantities by fast-food stalls and restaurants. Local brands sell well in small towns on price.",
      process: "Maida or suji is mixed with water into dough, extruded through dies into the required shapes, cut, dried in the drying chamber, cooled and packed in pouches and cartons.",
      rawMaterialSource: "Maida and suji are available from flour mills in the district; packing material from Kanpur and Lucknow.",
    },
  },
  {
    id: "cattle-feed",
    label: "Pashu aahar (cattle feed)",
    activity: "manufacturing of compound cattle feed",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Hammer mill / grinder", 180000],
      ["Feed mixer (horizontal)", 150000],
      ["Pellet machine", 220000],
      ["Bag stitching machine and weighing scale", 40000],
    ],
    electrical: 50000,
    furniture: 20000,
    preliminary: 20000,
    products: [["Cattle feed (pellets / mash)", "quintal", 2400, 1]],
    materials: [
      ["Maize, bran, khali and other ingredients", "quintal", 1750, 0.76],
      ["Minerals, salt and additives", "kg", 60, 0.02],
      ["HDPE bags", "pcs", 14, 0.02],
    ],
    staff: [
      ["Machine operator", 2, 11000, true],
      ["Sales / accounts", 1, 10000, false],
    ],
    variable: [
      ["Electricity / power", 0.025, true],
      ["Transport", 0.015, false],
    ],
    fixed: [
      ["Repairs and maintenance", 2000, true],
      ["Office and telephone", 1500, false],
    ],
    days: [20, 7, 20, 15],
    text: {
      market: "Dairy farming is a major source of income in UP, and balanced cattle feed raises milk yield. Demand comes from dairy farmers, gaushalas, milk collection centres and feed dealers in villages.",
      process: "Grains, bran, oil cakes and minerals are ground in the hammer mill, mixed in the right proportion, pelletised (or sold as mash), cooled, weighed and packed in 50 kg bags.",
      rawMaterialSource: "Maize, wheat bran, mustard and cotton cake are available from mandis, flour and oil mills in the district.",
      licences: ["BIS standard (IS 2052) for compound cattle feed, where required"],
    },
  },
  {
    id: "jaggery",
    label: "Gur aur khandsari (jaggery)",
    activity: "manufacturing of jaggery (gur) and jaggery powder",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Sugarcane crusher with motor", 220000],
      ["Boiling pans and furnace (triple pan)", 160000],
      ["Jaggery moulds and cooling trays", 50000],
      ["Jaggery powder grinder and packing machine", 80000],
    ],
    electrical: 30000,
    furniture: 20000,
    preliminary: 20000,
    products: [
      ["Jaggery (gur) blocks", "quintal", 4200, 0.7],
      ["Jaggery powder (packed)", "quintal", 5200, 0.3],
    ],
    materials: [["Sugarcane", "quintal", 380, 0.72]],
    staff: [
      ["Crusher operator / boiling man", 3, 10000, true],
      ["Accounts / sales", 1, 9000, false],
    ],
    variable: [
      ["Fuel and electricity", 0.03, true],
      ["Packing and transport", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 2000, true],
      ["Office and telephone", 1000, false],
    ],
    days: [5, 30, 15, 10],
    text: {
      market: "Gur is widely consumed as a healthy sweetener, especially in winter, and demand for chemical-free jaggery and jaggery powder is rising in cities. Sweet shops, households and traders buy in bulk.",
      process: "Fresh sugarcane is crushed to extract juice, which is filtered and boiled in pans; impurities are removed and the thick syrup is poured into moulds to set as blocks or dried and ground into powder, then packed.",
      rawMaterialSource: "Western and central UP have plenty of sugarcane; it will be bought from local farmers during the crushing season.",
      risks: [["Seasonal raw material", "Gur is stored and sold through the year; powder adds value."]],
    },
  },
  {
    id: "sweets",
    label: "Mithai aur namkeen dukaan (sweet shop with manufacturing)",
    activity: "manufacturing and sale of sweets and snacks",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Khoya making machine", 110000],
      ["Commercial burners, bhatti and kadhai set", 70000],
      ["Deep freezer and visi-cooler", 90000],
      ["Display counter (glass)", 80000],
      ["Utensils, trays and weighing scale", 50000],
    ],
    electrical: 30000,
    furniture: 60000,
    preliminary: 20000,
    products: [
      ["Sweets (mithai)", "kg", 380, 0.65],
      ["Namkeen and snacks", "kg", 240, 0.35],
    ],
    materials: [
      ["Milk, khoya and paneer", "kg", 75, 0.3],
      ["Sugar, besan, maida and ghee / oil", "kg", 110, 0.16],
      ["Dry fruits, flavours and packing boxes", "kg", 400, 0.06],
    ],
    staff: [
      ["Halwai (sweet maker)", 2, 13000, true],
      ["Helper", 1, 8500, true],
      ["Counter salesman", 1, 9000, false],
    ],
    variable: [
      ["LPG and electricity", 0.04, true],
      ["Carry bags and marketing", 0.01, false],
    ],
    fixed: [
      ["Shop rent", 6000, false],
      ["Repairs and maintenance", 1000, true],
    ],
    days: [5, 3, 5, 10],
    text: {
      market: "Sweets and namkeen are bought daily and in large quantities for festivals, weddings and social functions. A clean shop with fresh products at a busy location gets steady walk-in customers and bulk orders.",
      process: "Milk is converted to khoya, chhena and paneer; sweets are prepared with sugar, besan, maida and ghee in the bhatti and kadhai, cooled and displayed. Namkeen is fried and packed. Products are made fresh daily.",
      rawMaterialSource: "Milk is bought from local dairies and farmers; sugar, besan, ghee, dry fruits and boxes from the district wholesale market.",
    },
  },
  {
    id: "ice-cream",
    label: "Ice cream, kulfi aur ice candy",
    activity: "manufacturing of ice cream, kulfi and ice candy",
    sector: "manufacturing",
    group: "food",
    notFor: [],
    machines: [
      ["Batch freezer / ice cream machine", 220000],
      ["Kulfi and candy moulding machine with brine tank", 160000],
      ["Deep freezers (hardening)", 120000, 2],
      ["Pasteuriser / milk boiling vat", 60000],
    ],
    electrical: 50000,
    furniture: 20000,
    preliminary: 20000,
    products: [
      ["Ice cream (cups / family packs)", "litre", 160, 0.5],
      ["Kulfi and ice candy", "pcs", 12, 0.5],
    ],
    materials: [
      ["Milk and milk powder", "litre", 55, 0.28],
      ["Sugar, flavours and fruits", "kg", 70, 0.12],
      ["Cups, sticks and wrappers", "pcs", 1.5, 0.06],
    ],
    staff: [
      ["Machine operator", 2, 11000, true],
      ["Delivery / sales", 1, 10000, false],
    ],
    variable: [
      ["Electricity / power", 0.06, true],
      ["Transport and marketing", 0.03, false],
    ],
    fixed: [
      ["Repairs and maintenance", 2000, true],
      ["Office and telephone", 1000, false],
    ],
    days: [10, 10, 10, 15],
    text: {
      market: "Ice cream, kulfi and candies sell in large volumes from March to October through push-carts, shops, weddings and parties. Local brands do well in small towns because of lower price and fresh supply.",
      process: "Milk is pasteurised and mixed with sugar, milk solids and flavours, aged, frozen in the batch freezer, filled in cups or moulds, hardened in deep freezers and stored frozen until dispatch.",
      rawMaterialSource: "Milk is available from local dairies; sugar, flavours and packing material from Kanpur and Lucknow.",
      risks: [["Seasonal demand", "Kulfi and party orders, and sweets in winter, keep the unit busy."]],
    },
  },
  {
    id: "honey",
    label: "Shahad (honey) processing aur madhumakkhi palan",
    activity: "processing and packing of honey",
    sector: "manufacturing",
    group: "food",
    machines: [
      ["Honey processing plant (heating, filtering, settling)", 250000],
      ["Bee boxes with colonies", 3500, 40],
      ["Honey extractor and tools", 40000],
      ["Bottle filling and labelling machine", 60000],
    ],
    electrical: 25000,
    furniture: 20000,
    preliminary: 20000,
    products: [["Processed honey (bottled)", "kg", 340, 1]],
    materials: [
      ["Raw honey (own and purchased)", "kg", 170, 0.52],
      ["Bottles, caps and labels", "pcs", 12, 0.06],
    ],
    staff: [
      ["Bee keeper / processing worker", 2, 10000, true],
      ["Sales / accounts", 1, 10000, false],
    ],
    variable: [
      ["Electricity", 0.02, true],
      ["Transport and marketing", 0.04, false],
    ],
    fixed: [["Office and telephone", 1500, false]],
    days: [45, 30, 20, 15],
    text: {
      market: "Honey is used as food and in Ayurvedic medicines, and demand for pure, tested honey is rising. Buyers include households, Ayurvedic firms, sweet shops, bakeries and exporters.",
      process: "Raw honey from own bee boxes and from beekeepers is heated gently, filtered, settled to remove impurities and moisture, tested, filled in bottles, sealed and labelled.",
      rawMaterialSource: "Honey comes from the unit's bee boxes placed near mustard and other flowering crops, and from beekeepers registered with KVIC / the National Bee Board.",
      licences: ["Registration with National Bee Board (Madhukranti portal)", "AGMARK grading (optional)"],
    },
  },

  // ── Household and chemical products ──
  {
    id: "candle",
    label: "Mombatti (candle making)",
    activity: "manufacturing of candles",
    sector: "manufacturing",
    group: "household",
    machines: [
      ["Automatic candle making machine with moulds", 180000],
      ["Wax melting tank with heater", 60000],
      ["Decorative candle moulds and tools", 40000],
      ["Packing table and sealing machine", 20000],
    ],
    electrical: 20000,
    furniture: 30000,
    preliminary: 15000,
    products: [
      ["Plain candles", "kg", 140, 0.6],
      ["Decorative and scented candles", "kg", 320, 0.4],
    ],
    materials: [
      ["Paraffin wax", "kg", 95, 0.42],
      ["Wick, colours and fragrance", "kg", 400, 0.06],
      ["Boxes and packing", "pcs", 4, 0.05],
    ],
    staff: [
      ["Worker", 2, 9000, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [
      ["Electricity", 0.02, true],
      ["Transport and marketing", 0.03, false],
    ],
    fixed: [["Office and telephone", 1500, false]],
    days: [30, 30, 20, 15],
    text: {
      market: "Candles are needed in homes during power cuts, in temples, churches and religious functions, and decorative candles sell heavily during Diwali, Christmas and weddings, and to hotels and restaurants.",
      process: "Paraffin wax is melted, coloured and perfumed, poured into moulds around the wick, cooled, ejected, trimmed and packed.",
      rawMaterialSource: "Paraffin wax, wick and colours are available from chemical suppliers in Kanpur, Lucknow and Delhi.",
    },
  },
  {
    id: "agarbatti",
    label: "Agarbatti aur dhoopbatti",
    activity: "manufacturing of agarbatti (incense sticks) and dhoop",
    sector: "manufacturing",
    group: "household",
    machines: [
      ["Automatic agarbatti making machines", 70000, 3],
      ["Mixer machine for masala", 60000],
      ["Drying racks and perfume dipping set", 40000],
      ["Dhoop cone machine", 50000],
      ["Packing and sealing machine", 25000],
    ],
    electrical: 25000,
    furniture: 25000,
    preliminary: 15000,
    products: [
      ["Scented agarbatti", "kg", 220, 0.75],
      ["Dhoop cones and sticks", "kg", 240, 0.25],
    ],
    materials: [
      ["Bamboo sticks, charcoal and jigat powder", "kg", 55, 0.25],
      ["Perfume and DEP", "kg", 650, 0.17],
      ["Boxes, pouches and labels", "pcs", 3, 0.06],
    ],
    staff: [
      ["Machine operator / worker", 3, 8500, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [
      ["Electricity", 0.02, true],
      ["Transport and marketing", 0.04, false],
    ],
    fixed: [["Office and telephone", 1500, false]],
    days: [30, 20, 25, 15],
    text: {
      market: "Agarbatti and dhoop are used daily in homes, temples and shops across India and sell more in the festival season. Small brands sell through kirana, pooja-samagri shops and temples.",
      process: "Charcoal, jigat and wood powders are mixed into dough, rolled on bamboo sticks by machine, dried, dipped in perfume, dried again, then packed in boxes and pouches.",
      rawMaterialSource: "Bamboo sticks, charcoal powder, jigat and perfumes are available from suppliers in Kannauj, Kanpur and Lucknow.",
    },
  },
  {
    id: "detergent",
    label: "Detergent powder aur cake (washing soap)",
    activity: "manufacturing of detergent powder and detergent cakes",
    sector: "manufacturing",
    group: "household",
    machines: [
      ["Ribbon blender / mixer", 180000],
      ["Detergent cake plodder and cutting machine", 160000],
      ["Stamping machine", 60000],
      ["Pouch filling and sealing machine", 70000],
    ],
    electrical: 40000,
    furniture: 25000,
    preliminary: 20000,
    products: [
      ["Detergent powder", "kg", 70, 0.6],
      ["Detergent cake", "kg", 65, 0.4],
    ],
    materials: [
      ["LABSA, soda ash and sodium sulphate", "kg", 38, 0.45],
      ["Fillers, colour and perfume", "kg", 60, 0.06],
      ["Pouches and wrappers", "kg", 180, 0.06],
    ],
    staff: [
      ["Machine operator", 2, 10000, true],
      ["Helper", 1, 8500, true],
      ["Sales", 1, 10000, false],
    ],
    variable: [
      ["Electricity", 0.02, true],
      ["Transport and marketing", 0.04, false],
    ],
    fixed: [
      ["Repairs and maintenance", 1500, true],
      ["Office and telephone", 1500, false],
    ],
    days: [20, 15, 20, 15],
    text: {
      market: "Detergent is a daily-use item in every household; in villages and small towns low-priced local brands sell in large volumes through kirana shops, haats and wholesalers. Laundries and hotels buy in bulk.",
      process: "LABSA is neutralised with soda ash, mixed with other chemicals and fillers in the blender, then packed as powder, or plodded, cut and stamped into cakes and wrapped.",
      rawMaterialSource: "LABSA, soda ash, sodium sulphate and perfumes are available from chemical dealers in Kanpur and Delhi.",
    },
  },
  {
    id: "phenyl",
    label: "Phenyl, toilet cleaner aur handwash",
    activity: "manufacturing of phenyl, floor and toilet cleaners and liquid handwash",
    sector: "manufacturing",
    group: "household",
    machines: [
      ["Stainless steel mixing tanks with stirrer", 120000],
      ["Liquid filling machine (semi-automatic)", 90000],
      ["Capping and labelling machine", 50000],
      ["Storage tanks and drums", 40000],
    ],
    electrical: 25000,
    furniture: 25000,
    preliminary: 15000,
    products: [
      ["Phenyl and floor cleaner", "litre", 45, 0.55],
      ["Toilet cleaner and handwash", "litre", 75, 0.45],
    ],
    materials: [
      ["Chemicals (pine oil, acids, surfactants)", "kg", 85, 0.3],
      ["Bottles, caps and labels", "pcs", 7, 0.12],
    ],
    staff: [
      ["Worker", 2, 9000, true],
      ["Sales / delivery", 1, 10000, false],
    ],
    variable: [
      ["Electricity", 0.01, true],
      ["Transport and marketing", 0.04, false],
    ],
    fixed: [["Office and telephone", 1500, false]],
    days: [20, 15, 25, 15],
    text: {
      market: "Phenyl, cleaners and handwash are used daily by households, hospitals, schools, hotels and offices. Institutional and government buyers purchase in bulk through tenders and GeM.",
      process: "Chemicals are measured and mixed in water in stainless steel tanks in the right sequence, tested for strength, filled in bottles and cans, capped and labelled.",
      rawMaterialSource: "Chemicals and bottles are available from suppliers in Kanpur, Lucknow and Delhi.",
      licences: ["Registration on GeM portal for government supply (optional)"],
    },
  },

  // ── Paper, packing and printing ──
  {
    id: "paper-plate",
    label: "Paper plate, dona aur pattal",
    activity: "manufacturing of paper plates, dona and pattal",
    sector: "manufacturing",
    group: "paper",
    machines: [
      ["Hydraulic paper plate machine (double die)", 120000, 2],
      ["Dona making machine", 80000],
      ["Dies (assorted sizes)", 40000],
      ["Packing table and tools", 15000],
    ],
    electrical: 30000,
    furniture: 20000,
    preliminary: 15000,
    products: [
      ["Paper plates (assorted)", "1000 pcs", 900, 0.75],
      ["Dona and bowls", "1000 pcs", 450, 0.25],
    ],
    materials: [
      ["Silver / plain paper board (reel)", "kg", 70, 0.55],
      ["Packing material", "kg", 60, 0.03],
    ],
    staff: [
      ["Machine operator", 2, 9500, true],
      ["Sales / delivery", 1, 9000, false],
    ],
    variable: [
      ["Electricity", 0.03, true],
      ["Transport", 0.025, false],
    ],
    fixed: [["Repairs and maintenance", 1500, true]],
    days: [20, 10, 15, 15],
    text: {
      market: "Paper plates and dona are used in huge numbers at weddings, bhandaras, parties, chaat and sweet shops and dhabas. The ban on single-use plastic has increased demand for paper alternatives.",
      process: "Paper board reels are cut to size and pressed between heated dies on the hydraulic machine to form plates and bowls, which are counted and packed in bundles of 50 / 100.",
      rawMaterialSource: "Silver-coated and plain paper board is available from paper traders in Kanpur, Lucknow and Delhi.",
    },
  },
  {
    id: "paper-bag",
    label: "Paper bag aur envelope",
    activity: "manufacturing of paper bags and envelopes",
    sector: "manufacturing",
    group: "paper",
    machines: [
      ["Semi-automatic paper bag making machine", 280000],
      ["Envelope making machine", 90000],
      ["Paper cutting machine", 60000],
      ["Handle pasting set and tools", 20000],
    ],
    electrical: 30000,
    furniture: 25000,
    preliminary: 15000,
    products: [
      ["Paper carry bags", "1000 pcs", 1800, 0.7],
      ["Envelopes and grocery bags", "1000 pcs", 700, 0.3],
    ],
    materials: [
      ["Kraft paper", "kg", 62, 0.5],
      ["Glue, handles and printing ink", "kg", 140, 0.07],
    ],
    staff: [
      ["Machine operator", 2, 10000, true],
      ["Helper", 1, 8500, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [
      ["Electricity", 0.02, true],
      ["Transport", 0.025, false],
    ],
    fixed: [["Repairs and maintenance", 1500, true]],
    days: [20, 10, 20, 15],
    text: {
      market: "With plastic carry bags banned, shops, medical stores, garment showrooms, bakeries and sweet shops need paper bags every day. Printed bags with the shop's name are in demand for branding.",
      process: "Kraft paper reels are cut, folded, pasted and formed into bags on the machine; handles are fixed and bags printed where ordered, then counted and bundled.",
      rawMaterialSource: "Kraft paper is available from paper mills and traders in UP and Delhi.",
    },
  },
  {
    id: "corrugated-box",
    label: "Corrugated box (gatta / carton)",
    activity: "manufacturing of corrugated boxes",
    sector: "manufacturing",
    group: "paper",
    machines: [
      ["Single face corrugation machine", 250000],
      ["Reel-to-sheet cutter", 90000],
      ["Rotary creasing and slotting machine", 90000],
      ["Box stitching machine", 50000],
      ["Pasting machine", 40000],
    ],
    electrical: 45000,
    furniture: 20000,
    preliminary: 20000,
    products: [["Corrugated boxes (3 / 5 ply)", "kg", 68, 1]],
    materials: [
      ["Kraft paper", "kg", 42, 0.6],
      ["Gum, stitching wire and ink", "kg", 60, 0.05],
    ],
    staff: [
      ["Machine operator", 2, 11000, true],
      ["Helper", 2, 8500, true],
      ["Sales / accounts", 1, 10000, false],
    ],
    variable: [
      ["Electricity and fuel", 0.03, true],
      ["Transport", 0.02, false],
    ],
    fixed: [["Repairs and maintenance", 2000, true]],
    days: [20, 7, 30, 20],
    text: {
      market: "Every manufacturer and trader needs cartons for packing and dispatch: food units, pharma, electronics, shoes, garments and e-commerce sellers. Local supply saves freight on bulky boxes.",
      process: "Kraft paper is corrugated into flute, pasted with liner paper, cut into sheets, creased, slotted, printed and stitched or pasted into boxes to the buyer's size.",
      rawMaterialSource: "Kraft paper reels are available from paper mills in Muzaffarnagar, Meerut and other UP centres.",
    },
  },
  {
    id: "notebook",
    label: "Copy, register aur notebook",
    activity: "manufacturing of exercise notebooks and registers",
    sector: "manufacturing",
    group: "paper",
    machines: [
      ["Paper ruling machine", 180000],
      ["Stitching / binding machine", 60000],
      ["Paper cutting machine (guillotine)", 120000],
      ["Cover printing and pressing tools", 40000],
    ],
    electrical: 30000,
    furniture: 25000,
    preliminary: 15000,
    products: [
      ["Exercise notebooks", "dozen", 260, 0.7],
      ["Registers and long books", "dozen", 600, 0.3],
    ],
    materials: [
      ["Writing paper", "kg", 78, 0.55],
      ["Cover board, wire and ink", "kg", 90, 0.08],
    ],
    staff: [
      ["Machine operator", 2, 10000, true],
      ["Helper", 1, 8500, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [
      ["Electricity", 0.02, true],
      ["Transport", 0.02, false],
    ],
    fixed: [["Repairs and maintenance", 1500, true]],
    days: [30, 30, 30, 15],
    text: {
      market: "Every student uses several notebooks a year; schools, coaching centres, stationery shops and offices buy in bulk, especially at the start of the academic session (March–July).",
      process: "Paper is ruled, cut to size, folded, stitched with covers, trimmed on the guillotine, pressed and packed in dozens.",
      rawMaterialSource: "Writing paper and cover board are available from paper traders in Kanpur, Lucknow and Delhi.",
    },
  },

  // ── Textiles, leather and tailoring ──
  {
    id: "embroidery",
    label: "Zari, embroidery aur chikankari",
    activity: "embroidery and zari work on garments and fabric",
    sector: "manufacturing",
    group: "textile",
    machines: [
      ["Computerised embroidery machine (single head)", 380000],
      ["Sewing machines", 15000, 4],
      ["Adda (frames) and tools", 30000],
    ],
    electrical: 25000,
    furniture: 30000,
    preliminary: 15000,
    products: [
      ["Embroidered suits and sarees", "pcs", 750, 0.6],
      ["Job work embroidery", "pcs", 160, 0.4],
    ],
    materials: [
      ["Fabric", "metre", 140, 0.32],
      ["Zari, thread, beads and sequins", "kg", 700, 0.1],
    ],
    staff: [
      ["Karigar (embroidery worker)", 4, 9000, true],
      ["Machine operator", 1, 11000, true],
    ],
    variable: [["Electricity", 0.02, true], ["Transport and marketing", 0.03, false]],
    fixed: [["Repairs and maintenance", 1500, true]],
    days: [30, 30, 30, 15],
    text: {
      market: "Embroidered suits, sarees and dupattas are in demand for weddings and festivals; boutiques and wholesalers in Lucknow, Varanasi and Delhi also give job work to embroidery units.",
      process: "Designs are digitised and stitched on the computerised machine; hand zari and chikan work is done on the adda by trained karigars, followed by finishing, washing, pressing and packing.",
      rawMaterialSource: "Fabric, zari and threads are available from wholesale markets in Lucknow, Varanasi and Surat.",
    },
  },
  {
    id: "bag-making",
    label: "School bag, purse aur jute bag",
    activity: "manufacturing of school bags, travel bags and jute / cloth bags",
    sector: "manufacturing",
    group: "textile",
    machines: [
      ["Heavy-duty industrial sewing machines", 22000, 5],
      ["Cutting machine and tables", 50000],
      ["Eyelet / rivet fixing machine", 20000],
      ["Screen printing set", 25000],
    ],
    electrical: 20000,
    furniture: 30000,
    preliminary: 15000,
    products: [
      ["School and college bags", "pcs", 420, 0.6],
      ["Jute and cloth bags", "pcs", 75, 0.4],
    ],
    materials: [
      ["Nylon / rexine / jute fabric", "metre", 120, 0.35],
      ["Zips, foam, buckles and accessories", "set", 45, 0.12],
    ],
    staff: [
      ["Tailor (bag maker)", 4, 9500, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [["Electricity", 0.01, true], ["Transport and marketing", 0.03, false]],
    fixed: [["Repairs and maintenance", 1000, true]],
    days: [30, 30, 25, 15],
    text: {
      market: "Every school child needs a new bag each session, and jute and cloth bags replace plastic bags in shops and events. Schools, bag shops and corporate buyers give bulk orders.",
      process: "Fabric is cut to pattern, printed where needed, stitched with lining, foam and zips, fitted with buckles and handles, checked and packed.",
      rawMaterialSource: "Fabric, zips and accessories are available from wholesale markets in Delhi, Kanpur and Lucknow.",
    },
  },
  {
    id: "footwear",
    label: "Chappal aur joota (footwear)",
    activity: "manufacturing of hawai chappal, sandals and shoes",
    sector: "manufacturing",
    group: "textile",
    machines: [
      ["Hawai chappal sole cutting / press machine", 180000],
      ["Strap fixing and punching machine", 60000],
      ["Sole stitching / pasting machine", 80000],
      ["Moulds, dies and hand tools", 60000],
    ],
    electrical: 30000,
    furniture: 25000,
    preliminary: 15000,
    products: [
      ["Hawai chappal", "pair", 75, 0.6],
      ["Sandals and casual shoes", "pair", 260, 0.4],
    ],
    materials: [
      ["Rubber / EVA sheets", "kg", 140, 0.32],
      ["Straps, leather / rexine and adhesive", "set", 25, 0.14],
      ["Boxes and poly bags", "pcs", 4, 0.03],
    ],
    staff: [
      ["Worker", 3, 9500, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [["Electricity", 0.02, true], ["Transport and marketing", 0.03, false]],
    fixed: [["Repairs and maintenance", 1500, true]],
    days: [30, 20, 25, 15],
    text: {
      market: "Chappals and sandals are bought by everyone, several pairs a year; low-priced local footwear sells heavily in villages, haats and footwear shops. Agra and Kanpur are major footwear centres nearby.",
      process: "Rubber and EVA sheets are cut into soles with dies, punched, fitted with straps or uppers, pasted, stitched, finished and packed in pairs.",
      rawMaterialSource: "Rubber sheets, straps, leather and adhesives are available from Agra, Kanpur and Delhi.",
    },
  },

  // ── Engineering, electrical and construction material ──
  {
    id: "fly-ash-bricks",
    label: "Fly ash / cement bricks",
    activity: "manufacturing of fly ash and cement bricks",
    sector: "manufacturing",
    group: "engineering",
    machines: [
      ["Fly ash brick making machine (hydraulic)", 450000],
      ["Pan mixer", 150000],
      ["Wooden pallets and trolleys", 60000],
      ["Water tank and curing arrangement", 40000],
    ],
    electrical: 50000,
    furniture: 15000,
    preliminary: 20000,
    products: [["Fly ash bricks", "1000 pcs", 6000, 1]],
    materials: [
      ["Fly ash", "tonne", 650, 0.18],
      ["Cement", "bag", 380, 0.28],
      ["Sand / stone dust and lime", "tonne", 900, 0.12],
    ],
    staff: [
      ["Machine operator", 1, 12000, true],
      ["Labour", 4, 9000, true],
      ["Supervisor / sales", 1, 12000, false],
    ],
    variable: [["Electricity", 0.03, true], ["Transport", 0.04, false]],
    fixed: [["Repairs and maintenance", 2500, true]],
    days: [15, 15, 20, 15],
    text: {
      market: "Construction of houses under PM Awas Yojana, government buildings and private housing needs bricks in large numbers. Government departments are required to use fly ash bricks near thermal power plants, and they are stronger and more uniform than clay bricks.",
      process: "Fly ash, cement, sand and lime are weighed and mixed in the pan mixer with water, pressed into bricks in the hydraulic machine, air-dried on pallets and water-cured for 14–21 days before sale.",
      rawMaterialSource: "Fly ash is available free or at low cost from thermal power plants; cement and sand from local dealers.",
    },
  },
  {
    id: "paver-block",
    label: "Paver block, tiles aur cement products",
    activity: "manufacturing of paver blocks, cement tiles and kerb stones",
    sector: "manufacturing",
    group: "engineering",
    machines: [
      ["Vibrating table with moulds", 160000],
      ["Pan mixer", 140000],
      ["Rubber / PVC moulds (assorted)", 120000],
      ["Curing tank and trolleys", 60000],
    ],
    electrical: 40000,
    furniture: 15000,
    preliminary: 20000,
    products: [
      ["Paver blocks", "sq ft", 38, 0.75],
      ["Kerb stones and cement tiles", "pcs", 70, 0.25],
    ],
    materials: [
      ["Cement", "bag", 380, 0.24],
      ["Stone grit and sand", "tonne", 1100, 0.14],
      ["Colour pigment and chemicals", "kg", 180, 0.05],
    ],
    staff: [
      ["Labour", 4, 9000, true],
      ["Supervisor / sales", 1, 12000, false],
    ],
    variable: [["Electricity", 0.02, true], ["Transport", 0.04, false]],
    fixed: [["Repairs and maintenance", 2000, true]],
    days: [15, 20, 30, 15],
    text: {
      market: "Paver blocks are used for footpaths, parking, courtyards, petrol pumps and roads by municipal bodies, gram panchayats, builders and homeowners. Government works under Smart City and rural road schemes create bulk demand.",
      process: "Cement, grit, sand and pigment are mixed in the pan mixer, filled into moulds and compacted on the vibrating table, demoulded after setting and water-cured before dispatch.",
      rawMaterialSource: "Cement, stone grit and sand are available from local dealers and crushers.",
    },
  },
  {
    id: "led-assembly",
    label: "LED bulb, tube light aur electrical assembly",
    activity: "assembly of LED bulbs, tube lights and electrical items",
    sector: "manufacturing",
    group: "engineering",
    machines: [
      ["LED testing and ageing machine", 90000],
      ["Bulb crimping / pressing machine", 70000],
      ["Soldering stations and hand tools", 40000],
      ["Packing machine", 30000],
    ],
    electrical: 25000,
    furniture: 40000,
    preliminary: 15000,
    products: [
      ["LED bulbs", "pcs", 70, 0.65],
      ["LED tube lights and panels", "pcs", 180, 0.35],
    ],
    materials: [
      ["LED driver, PCB, housing and cap (kits)", "kit", 46, 0.6],
      ["Boxes and packing", "pcs", 3, 0.04],
    ],
    staff: [
      ["Assembler", 3, 9500, true],
      ["Sales", 1, 10000, false],
    ],
    variable: [["Electricity", 0.01, true], ["Transport and marketing", 0.03, false]],
    fixed: [["Repairs and maintenance", 1000, true]],
    days: [30, 15, 25, 20],
    text: {
      market: "LED lighting has replaced old bulbs everywhere, and electrical shops, contractors, panchayats and housing projects buy in bulk. Locally assembled LEDs with warranty sell well at lower prices than big brands.",
      process: "LED chips mounted on PCBs are fitted with drivers, heat sinks, housings and caps, crimped, tested on the ageing machine, quality-checked and packed.",
      rawMaterialSource: "LED kits and components are available from wholesalers in Delhi (Bhagirath Palace) and from domestic manufacturers.",
      licences: ["BIS registration (CRS) for LED lamps"],
    },
  },
  {
    id: "wire-nail",
    label: "Wire nail aur kanta-keel",
    activity: "manufacturing of wire nails",
    sector: "manufacturing",
    group: "engineering",
    machines: [
      ["Wire nail making machines", 180000, 2],
      ["Nail polishing drum", 60000],
      ["Wire drawing machine (small)", 90000],
    ],
    electrical: 45000,
    furniture: 15000,
    preliminary: 15000,
    products: [["Wire nails (assorted)", "kg", 82, 1]],
    materials: [
      ["MS wire rod", "kg", 58, 0.72],
      ["Packing material", "kg", 40, 0.02],
    ],
    staff: [
      ["Machine operator", 2, 11000, true],
      ["Sales", 1, 9000, false],
    ],
    variable: [["Electricity", 0.03, true], ["Transport", 0.015, false]],
    fixed: [["Repairs and maintenance", 2000, true]],
    days: [20, 10, 20, 15],
    text: {
      market: "Nails are used by carpenters, builders, packing-box makers and households. Hardware shops and wholesalers buy throughout the year.",
      process: "MS wire is drawn to the required gauge, fed to the nail machine which cuts, heads and points it, then nails are polished in the drum, weighed and packed.",
      rawMaterialSource: "MS wire rod is available from steel traders in Kanpur, Ghaziabad and Delhi.",
    },
  },

  // ── Repair and technical services ──
  {
    id: "bike-repair",
    label: "Two-wheeler service aur repair garage",
    activity: "two-wheeler servicing and repair workshop",
    sector: "service",
    group: "repair",
    machines: [
      ["Air compressor and washing pump", 60000],
      ["Hydraulic bike lift", 45000],
      ["Tool kits, spanners and special tools", 50000],
      ["Battery charger and testing equipment", 25000],
    ],
    electrical: 20000,
    furniture: 30000,
    preliminary: 15000,
    products: [
      ["Servicing and repair (labour)", "job", 350, 0.6],
      ["Spare parts, oil and accessories (sale)", "job", 450, 0.4],
    ],
    materials: [["Spare parts, engine oil and consumables", "job", 330, 0.3]],
    staff: [
      ["Mechanic", 2, 11000, true],
      ["Helper", 1, 8000, true],
    ],
    variable: [["Electricity and water", 0.02, true]],
    fixed: [
      ["Shop rent", 4000, false],
      ["Repairs and maintenance", 500, true],
    ],
    days: [20, 0, 3, 15],
    text: {
      market: "The number of motorcycles and scooters is growing fast, and every vehicle needs regular servicing, repairs and spare parts. Customers prefer a trusted neighbourhood garage over distant authorised workshops.",
      process: "Vehicles are inspected, a job card is made, servicing (oil change, cleaning, adjustments) and repairs are done, parts are replaced, the vehicle is washed, tested and delivered with a bill.",
      rawMaterialSource: "Spare parts and oils are available from authorised distributors and wholesalers in the district.",
    },
  },
  {
    id: "motor-rewinding",
    label: "Motor rewinding aur electrical repair",
    activity: "motor rewinding and electrical appliance repair",
    sector: "service",
    group: "repair",
    machines: [
      ["Coil winding machines", 30000, 2],
      ["Varnish oven / baking oven", 60000],
      ["Testing panel, megger and meters", 50000],
      ["Tools, bench grinder and drill", 40000],
    ],
    electrical: 20000,
    furniture: 25000,
    preliminary: 15000,
    products: [
      ["Motor / pump rewinding", "job", 1600, 0.6],
      ["Appliance repair (fan, cooler, mixer)", "job", 350, 0.4],
    ],
    materials: [["Copper wire, varnish, bearings and parts", "job", 260, 0.3]],
    staff: [
      ["Electrician / winder", 2, 11000, true],
      ["Helper", 1, 8000, true],
    ],
    variable: [["Electricity", 0.02, true]],
    fixed: [["Shop rent", 3500, false]],
    days: [20, 0, 5, 15],
    text: {
      market: "Farmers' submersible and mono-block pumps, flour mills, fans, coolers and mixers need frequent rewinding and repair, especially in summer and the irrigation season.",
      process: "The motor is dismantled and tested, burnt winding removed, coils wound with copper wire, insulated, varnished and baked, reassembled, tested on the panel and returned with warranty.",
      rawMaterialSource: "Copper winding wire, varnish, bearings and spares are available from electrical wholesalers in the district.",
    },
  },
  {
    id: "cyber-cafe",
    label: "Cyber cafe, xerox aur online seva kendra",
    activity: "cyber cafe, photocopy, printing and online services centre",
    sector: "service",
    group: "repair",
    machines: [
      ["Computers with UPS", 32000, 4],
      ["Digital photocopier / multifunction printer", 120000],
      ["Colour printer and lamination machine", 35000],
      ["Biometric device, scanner and webcam", 20000],
    ],
    electrical: 20000,
    furniture: 40000,
    preliminary: 15000,
    products: [
      ["Online forms, applications and internet", "job", 60, 0.55],
      ["Photocopy, printing and lamination", "job", 25, 0.45],
    ],
    materials: [["Paper, toner and lamination pouches", "job", 5, 0.12]],
    staff: [["Computer operator", 2, 9000, true]],
    variable: [["Electricity", 0.04, true]],
    fixed: [
      ["Shop rent", 4000, false],
      ["Internet and telephone", 1500, false],
      ["Software and maintenance", 1000, true],
    ],
    days: [15, 0, 0, 10],
    text: {
      market: "Students, job seekers, farmers and residents need online forms, results, government scheme applications, bill payments, printing and photocopies every day. Demand peaks around exam and admission seasons.",
      process: "Customers are served at the counter: forms are filled online, documents scanned, printed, photocopied and laminated, and fees collected with a receipt.",
      rawMaterialSource: "Paper, toner and consumables are available from stationery and computer dealers in the district.",
    },
  },

  // ── Education, health and personal care ──
  {
    id: "coaching",
    label: "Coaching / tuition centre",
    activity: "coaching and tuition centre",
    sector: "service",
    group: "personal",
    machines: [
      ["Smart board / projector with sound", 90000],
      ["Computers and printer", 35000, 2],
      ["CCTV and inverter", 40000],
    ],
    electrical: 20000,
    furniture: 150000,
    preliminary: 15000,
    products: [["Student fees", "student-month", 900, 1]],
    materials: [["Study material and printing", "student-month", 60, 0.07]],
    staff: [
      ["Teacher", 3, 12000, true],
      ["Office assistant", 1, 8000, false],
    ],
    variable: [["Electricity", 0.03, true], ["Advertising", 0.03, false]],
    fixed: [["Rent", 8000, false]],
    days: [0, 0, 0, 0],
    text: {
      market: "Students in classes 6–12 and those preparing for competitive exams want good coaching close to home. Parents in small towns spend readily on tuition, and batches fill up before board and entrance exams.",
      process: "Students are enrolled in batches by class and subject, taught with smart-board lessons, tested weekly, and progress is shared with parents. Doubt sessions and printed notes are provided.",
      rawMaterialSource: "Books and stationery are available locally; study material is prepared in-house.",
    },
  },
  {
    id: "gym",
    label: "Gym aur fitness centre",
    activity: "gym and fitness centre",
    sector: "service",
    group: "personal",
    machines: [
      ["Treadmills and cycles", 70000, 2],
      ["Multi-gym and strength machines", 180000],
      ["Dumbbells, plates, rods and benches", 80000],
      ["Music system, mirrors and flooring", 50000],
    ],
    electrical: 20000,
    furniture: 30000,
    preliminary: 15000,
    products: [["Membership fees", "member-month", 700, 1]],
    materials: [["Consumables and supplements", "member-month", 30, 0.04]],
    staff: [
      ["Trainer", 2, 11000, true],
      ["Reception / cleaner", 1, 7500, false],
    ],
    variable: [["Electricity", 0.05, true]],
    fixed: [
      ["Rent", 8000, false],
      ["Repairs and maintenance", 1000, true],
    ],
    days: [0, 0, 0, 0],
    text: {
      market: "Young people and adults in towns are increasingly health- and fitness-conscious, and there are few well-equipped gyms outside big cities. Monthly, quarterly and yearly memberships give a steady income.",
      process: "Members register, get a fitness assessment and a workout plan, and train under the supervision of qualified trainers in morning and evening slots.",
      rawMaterialSource: "Gym equipment is available from manufacturers in Meerut, Ludhiana and Delhi.",
    },
  },
  {
    id: "pathology",
    label: "Pathology lab aur diagnostic centre",
    activity: "pathology laboratory and sample collection centre",
    sector: "service",
    group: "personal",
    machines: [
      ["Semi-auto biochemistry analyser", 180000],
      ["3-part haematology cell counter", 220000],
      ["Microscope, centrifuge and incubator", 70000],
      ["Refrigerator, computer and printer", 50000],
    ],
    electrical: 25000,
    furniture: 40000,
    preliminary: 20000,
    products: [["Tests", "test", 250, 1]],
    materials: [["Reagents, kits and consumables", "test", 60, 0.24]],
    staff: [
      ["Lab technician", 2, 12000, true],
      ["Receptionist / sample collector", 1, 8000, false],
    ],
    variable: [["Electricity", 0.02, true], ["Doctor referral and marketing", 0.04, false]],
    fixed: [["Rent", 6000, false]],
    days: [20, 0, 5, 15],
    text: {
      market: "Doctors in small towns refer patients daily for blood, urine and other routine tests, and awareness of regular health check-ups is rising. A nearby lab saves patients travel to the city.",
      process: "Samples are collected at the centre or from home, labelled, processed on the analysers under the supervision of a qualified pathologist, and reports are delivered on paper and WhatsApp.",
      rawMaterialSource: "Reagents and kits are available from authorised medical equipment distributors in Lucknow and Kanpur.",
      licences: ["Registration under the Clinical Establishments Act / state health department", "Biomedical waste disposal agreement", "Qualified pathologist (MD / DCP) for reporting"],
    },
  },
  {
    id: "laundry",
    label: "Laundry aur dry cleaning",
    activity: "laundry and dry-cleaning services",
    sector: "service",
    group: "personal",
    machines: [
      ["Commercial washing machine", 140000],
      ["Dry-cleaning machine", 220000],
      ["Steam iron with boiler and ironing tables", 60000],
      ["Hydro extractor", 50000],
    ],
    electrical: 30000,
    furniture: 30000,
    preliminary: 15000,
    products: [["Washing, dry cleaning and ironing", "piece", 45, 1]],
    materials: [["Detergents, solvents and packing", "piece", 5, 0.11]],
    staff: [
      ["Washerman / presser", 2, 10000, true],
      ["Counter and delivery", 1, 8500, false],
    ],
    variable: [["Electricity and water", 0.06, true]],
    fixed: [["Rent", 5000, false]],
    days: [15, 0, 5, 15],
    text: {
      market: "Working families, hostels, hotels, hospitals and wedding customers need washing, dry cleaning and ironing. Organised laundries with pick-up and delivery are rare in small towns.",
      process: "Clothes are tagged, sorted, washed or dry-cleaned, dried, ironed, packed and delivered against the receipt.",
      rawMaterialSource: "Detergents, solvents and packing material are available from local suppliers.",
    },
  },

  // ── Food, events and transport ──
  {
    id: "restaurant",
    label: "Restaurant, dhaba aur fast food",
    activity: "restaurant / dhaba and fast-food outlet",
    sector: "service",
    group: "hospitality",
    machines: [
      ["Commercial kitchen equipment (burners, tandoor, fryer)", 150000],
      ["Deep freezer and refrigerator", 80000],
      ["Chimney and exhaust", 40000],
      ["Utensils and crockery", 50000],
    ],
    electrical: 30000,
    furniture: 120000,
    preliminary: 20000,
    products: [["Food sales", "plate", 140, 1]],
    materials: [["Food ingredients", "plate", 55, 0.4]],
    staff: [
      ["Cook", 2, 12000, true],
      ["Helper / waiter", 2, 8000, true],
    ],
    variable: [["LPG and electricity", 0.06, true]],
    fixed: [["Rent", 10000, false]],
    days: [7, 0, 0, 10],
    text: {
      market: "Eating out, takeaways and online food orders are growing in every town, and travellers on highways depend on dhabas. A clean outlet with good taste and fair prices gets steady footfall.",
      process: "Ingredients are bought fresh, prepared in a hygienic kitchen, cooked to order and served at tables, packed for takeaway or delivered through food apps.",
      rawMaterialSource: "Vegetables, grocery, milk and gas are bought daily from local markets and suppliers.",
    },
  },
  {
    id: "tent-house",
    label: "Tent house, light aur decoration",
    activity: "tent house, lighting and decoration service",
    sector: "service",
    group: "hospitality",
    machines: [
      ["Shamiyana, tents and pandal material", 250000],
      ["Chairs, tables and covers", 150000],
      ["Lighting, generator and sound system", 150000],
      ["Decoration items and carpets", 60000],
    ],
    electrical: 10000,
    furniture: 10000,
    preliminary: 15000,
    products: [["Event bookings (tent, light, decoration)", "event", 14000, 1]],
    materials: [["Flowers, fuel and consumables", "event", 1700, 0.12]],
    staff: [["Labour", 3, 9000, true]],
    variable: [["Transport", 0.06, true]],
    fixed: [["Godown rent", 4000, false], ["Repairs and maintenance", 1500, true]],
    days: [0, 0, 10, 10],
    text: {
      market: "Weddings, tilak, birthdays, religious functions, political meetings and government programmes need tents, chairs, lights and decoration. The wedding season gives heavy bookings every year.",
      process: "Orders are booked with advance; material is transported, the pandal erected, lights and sound installed and decoration done, then dismantled and returned to the godown after the event.",
      rawMaterialSource: "Tent material, chairs and lighting are available from manufacturers in Kanpur, Lucknow and Delhi.",
    },
  },
  {
    id: "catering",
    label: "Catering aur tiffin service",
    activity: "catering and tiffin service",
    sector: "service",
    group: "hospitality",
    machines: [
      ["Commercial burners, bhatti and tandoor", 80000],
      ["Large utensils, chafing dishes and crockery", 150000],
      ["Refrigerator and deep freezer", 60000],
      ["Tiffin boxes and insulated containers", 40000],
    ],
    electrical: 15000,
    furniture: 40000,
    preliminary: 15000,
    products: [
      ["Catering orders (per plate)", "plate", 220, 0.7],
      ["Tiffin service", "tiffin", 80, 0.3],
    ],
    materials: [["Food ingredients", "plate", 80, 0.42]],
    staff: [
      ["Cook", 2, 12000, true],
      ["Helper / waiter", 2, 8500, true],
    ],
    variable: [["LPG and transport", 0.05, true]],
    fixed: [["Kitchen rent", 5000, false]],
    days: [5, 0, 10, 10],
    text: {
      market: "Weddings, parties, office functions and religious events need caterers, and students, working people and offices need daily tiffins. Repeat orders come through word of mouth.",
      process: "Menus are agreed with customers, ingredients purchased, food cooked in the central kitchen, transported in insulated containers and served at the venue or delivered as tiffins.",
      rawMaterialSource: "Grocery, vegetables, milk and gas are available from local markets every day.",
    },
  },
  {
    id: "e-rickshaw",
    label: "E-rickshaw / e-loader (transport)",
    activity: "passenger and goods transport by e-rickshaw",
    sector: "service",
    group: "hospitality",
    notFor: ["pmegp", "mysy"],
    machines: [
      ["E-rickshaw with lithium battery (registered)", 210000, 2],
      ["Charging station and spare battery", 60000],
    ],
    electrical: 10000,
    furniture: 0,
    preliminary: 15000,
    products: [["Fares and goods hire", "vehicle-day", 900, 1]],
    materials: [["Electricity for charging and spares", "vehicle-day", 110, 0.12]],
    staff: [["Driver", 1, 10000, true]],
    variable: [["Repairs and tyres", 0.04, true]],
    fixed: [["Insurance and permit", 1500, false], ["Parking", 500, false]],
    days: [0, 0, 0, 0],
    text: {
      market: "E-rickshaws are the main last-mile transport in towns, carrying passengers between bus stands, stations, markets and colonies, and small goods for shops. Fares are collected in cash daily.",
      process: "Vehicles run on fixed routes and hire; batteries are charged overnight at the unit's charging point; the promoter drives one vehicle and a hired driver the other.",
      rawMaterialSource: "E-rickshaws are bought from authorised dealers of approved (ICAT / ARAI certified) makes.",
      licences: ["Vehicle registration and fitness (RTO)", "Driving licence and e-rickshaw permit", "Vehicle insurance"],
    },
  },
  {
    id: "photo-studio",
    label: "Photo studio aur videography",
    activity: "photography and videography studio",
    sector: "service",
    group: "hospitality",
    machines: [
      ["Mirrorless / DSLR cameras with lenses", 150000, 2],
      ["Drone camera", 90000],
      ["Studio lights and backdrops", 50000],
      ["Editing computer and photo printer", 90000],
    ],
    electrical: 15000,
    furniture: 40000,
    preliminary: 15000,
    products: [
      ["Wedding / event shoots", "event", 18000, 0.75],
      ["Studio photos and prints", "job", 150, 0.25],
    ],
    materials: [["Albums, prints and consumables", "job", 400, 0.12]],
    staff: [["Photographer / editor", 2, 12000, true]],
    variable: [["Travel and electricity", 0.05, true]],
    fixed: [["Studio rent", 5000, false]],
    days: [0, 0, 10, 10],
    text: {
      market: "Weddings, pre-wedding shoots, birthdays, school events and passport photos keep a photo studio busy, and demand for drone shots and cinematic videos is rising in small towns.",
      process: "Events are booked with an advance, shot on location, edited on the computer, and delivered as albums, prints and videos on drive or online.",
      rawMaterialSource: "Cameras and accessories are available from authorised dealers; album printing from labs in Lucknow and Kanpur.",
    },
  },
  {
    id: "car-wash",
    label: "Car / bike washing aur detailing",
    activity: "vehicle washing and detailing centre",
    sector: "service",
    group: "repair",
    machines: [
      ["High-pressure washers", 45000, 2],
      ["Car lift / ramp", 120000],
      ["Vacuum cleaner, foam machine and polisher", 60000],
      ["Water recycling tank", 40000],
    ],
    electrical: 25000,
    furniture: 20000,
    preliminary: 15000,
    products: [
      ["Car washing and detailing", "vehicle", 400, 0.7],
      ["Two-wheeler washing", "vehicle", 100, 0.3],
    ],
    materials: [["Shampoo, wax and chemicals", "vehicle", 40, 0.12]],
    staff: [["Washer", 3, 9000, true]],
    variable: [["Electricity and water", 0.05, true]],
    fixed: [["Rent", 6000, false]],
    days: [10, 0, 0, 10],
    text: {
      market: "Car and bike ownership in towns is growing quickly, and owners want quick, careful washing and polishing. Taxi operators and showrooms give regular contracts.",
      process: "Vehicles are pre-rinsed, foam-washed with high-pressure washers, cleaned inside with vacuum, dried, polished and waxed as per the package.",
      rawMaterialSource: "Shampoos, waxes and chemicals are available from automotive suppliers.",
    },
  },

  // ── Trading ──
  {
    id: "medical-store",
    label: "Medical store (dawai ki dukaan)",
    activity: "retail medical store",
    sector: "trading",
    group: "trading",
    machines: [
      ["Computer with billing software and printer", 55000],
      ["Refrigerator for medicines", 30000],
      ["CCTV and inverter", 30000],
    ],
    electrical: 15000,
    furniture: 150000,
    preliminary: 15000,
    products: [["Medicine and surgical sales", "lot", 100, 1]],
    materials: [["Medicine purchases", "lot", 80, 0.8]],
    staff: [["Salesman (with pharmacist)", 1, 12000, true]],
    variable: [["Electricity", 0.005, true]],
    fixed: [["Shop rent", 6000, false]],
    days: [45, 0, 7, 20],
    text: {
      market: "Medicines are an essential daily need; patients from nearby clinics and the local population buy prescriptions, OTC products and surgical items throughout the year.",
      process: "Medicines are bought from authorised distributors, stored as per label conditions, sold against prescriptions with a bill, and stock is managed by expiry date in the billing software.",
      rawMaterialSource: "Medicines are purchased from authorised stockists and distributors in the district on credit.",
      licences: ["Retail drug licence (Form 20 / 21) from the Drug Controller", "Registered pharmacist"],
    },
  },
  {
    id: "stationery",
    label: "Stationery, kitab aur copy ki dukaan",
    activity: "retail stationery and book shop",
    sector: "trading",
    group: "trading",
    machines: [
      ["Photocopier", 60000],
      ["Computer with billing", 40000],
    ],
    electrical: 10000,
    furniture: 120000,
    preliminary: 15000,
    products: [["Stationery and book sales", "lot", 100, 1]],
    materials: [["Stationery and book purchases", "lot", 78, 0.78]],
    staff: [["Salesman", 1, 9000, true]],
    variable: [["Electricity", 0.005, true]],
    fixed: [["Shop rent", 5000, false]],
    days: [45, 0, 5, 20],
    text: {
      market: "Schools, colleges, coaching centres and offices around the shop create year-round demand, with peak sales at the start of the academic session.",
      process: "Goods are bought from wholesalers and publishers, displayed and sold over the counter with bills; school lists and office supplies are delivered on order.",
      rawMaterialSource: "Stock is purchased from wholesalers in the district and publishers' distributors on credit.",
    },
  },
  {
    id: "hardware-store",
    label: "Hardware, paint aur sanitary store",
    activity: "retail hardware, paint and sanitary store",
    sector: "trading",
    group: "trading",
    machines: [
      ["Paint tinting machine", 90000],
      ["Computer with billing", 40000],
    ],
    electrical: 10000,
    furniture: 120000,
    preliminary: 15000,
    products: [["Hardware, paint and sanitary sales", "lot", 100, 1]],
    materials: [["Purchases", "lot", 80, 0.8]],
    staff: [["Salesman", 2, 9500, true]],
    variable: [["Transport", 0.005, true]],
    fixed: [["Shop rent", 6000, false]],
    days: [45, 0, 15, 30],
    text: {
      market: "House construction and repair is continuous in growing towns; masons, plumbers, painters, carpenters and homeowners buy hardware, paint and sanitary items daily.",
      process: "Goods are bought from company distributors and wholesalers, displayed, sold with bills, and delivered to sites for bulk orders; paints are tinted on the machine.",
      rawMaterialSource: "Stock is purchased from authorised distributors of paint, pipe and sanitary companies on credit.",
    },
  },
  {
    id: "cloth-store",
    label: "Kapde aur readymade garment ki dukaan",
    activity: "retail cloth and readymade garment shop",
    sector: "trading",
    group: "trading",
    machines: [
      ["Computer with billing and barcode", 50000],
      ["CCTV and inverter", 30000],
    ],
    electrical: 20000,
    furniture: 180000,
    preliminary: 15000,
    products: [["Garment and cloth sales", "lot", 100, 1]],
    materials: [["Purchases", "lot", 72, 0.72]],
    staff: [["Salesman", 2, 9000, true]],
    variable: [["Carry bags and electricity", 0.01, true]],
    fixed: [["Shop rent", 8000, false]],
    days: [60, 0, 5, 30],
    text: {
      market: "Clothes are bought by every family for festivals, weddings and seasons; a well-stocked shop with current designs and fair prices draws customers from nearby villages.",
      process: "Stock is selected from wholesale markets for each season, displayed by category, sold with bills, and slow-moving items cleared through sales.",
      rawMaterialSource: "Garments and fabric are purchased from wholesale markets in Delhi, Surat, Kanpur and Lucknow.",
    },
  },
  {
    id: "electronics-store",
    label: "Electronics aur electrical saman ki dukaan",
    activity: "retail electronics and electrical goods shop",
    sector: "trading",
    group: "trading",
    machines: [["Computer with billing", 40000], ["Testing bench and tools", 20000]],
    electrical: 20000,
    furniture: 120000,
    preliminary: 15000,
    products: [["Electronics and electrical sales", "lot", 100, 1]],
    materials: [["Purchases", "lot", 82, 0.82]],
    staff: [["Salesman / technician", 2, 10000, true]],
    variable: [["Electricity and delivery", 0.005, true]],
    fixed: [["Shop rent", 7000, false]],
    days: [40, 0, 10, 25],
    text: {
      market: "Fans, coolers, LED lights, wires, switches, TVs and small appliances are bought throughout the year, with peaks in summer and the wedding season.",
      process: "Goods are bought from company distributors, displayed, demonstrated and sold with warranty; installation and after-sales help are arranged.",
      rawMaterialSource: "Stock is bought from authorised distributors and wholesalers on credit.",
    },
  },
  {
    id: "footwear-store",
    label: "Joote-chappal ki dukaan",
    activity: "retail footwear shop",
    sector: "trading",
    group: "trading",
    machines: [["Computer with billing", 40000]],
    electrical: 15000,
    furniture: 130000,
    preliminary: 15000,
    products: [["Footwear sales", "lot", 100, 1]],
    materials: [["Purchases", "lot", 72, 0.72]],
    staff: [["Salesman", 1, 9000, true]],
    variable: [["Electricity", 0.005, true]],
    fixed: [["Shop rent", 6000, false]],
    days: [60, 0, 3, 30],
    text: {
      market: "Footwear is bought by every family member several times a year; school shoes, wedding and festival purchases give seasonal peaks.",
      process: "Stock is selected from manufacturers and wholesalers by season, displayed by size and category, and sold with bills.",
      rawMaterialSource: "Footwear is purchased from manufacturers and wholesalers in Agra, Kanpur and Delhi.",
    },
  },
  {
    id: "agri-inputs",
    label: "Khad, beej aur keetnashak (agri input) ki dukaan",
    activity: "retail fertiliser, seed and pesticide shop",
    sector: "trading",
    group: "trading",
    machines: [["Computer with billing and POS device", 50000], ["Weighing scale", 15000]],
    electrical: 10000,
    furniture: 80000,
    preliminary: 15000,
    products: [["Fertiliser, seed and pesticide sales", "lot", 100, 1]],
    materials: [["Purchases", "lot", 86, 0.86]],
    staff: [["Salesman", 1, 9000, true]],
    variable: [["Transport", 0.005, true]],
    fixed: [["Shop / godown rent", 5000, false]],
    days: [30, 0, 15, 20],
    text: {
      market: "Farmers in the surrounding villages buy seeds, fertilisers and plant-protection chemicals every rabi and kharif season; a nearby, reliable dealer with expert advice is preferred.",
      process: "Stock is bought from company distributors and cooperatives, stored safely, and sold to farmers with bills and POS entries, along with crop advice.",
      rawMaterialSource: "Stock is purchased from authorised company distributors and cooperative societies.",
      licences: ["Fertiliser dealer licence", "Seed licence", "Insecticide sale licence"],
    },
  },
  {
    id: "building-material",
    label: "Building material (cement, sariya, ret) ka vyapar",
    activity: "trading of building material",
    sector: "trading",
    group: "trading",
    machines: [["Weighing scale and tools", 30000], ["Computer with billing", 40000]],
    electrical: 10000,
    furniture: 40000,
    preliminary: 15000,
    products: [["Cement, steel and building material sales", "lot", 100, 1]],
    materials: [["Purchases", "lot", 88, 0.88]],
    staff: [["Salesman / loader", 2, 9000, true]],
    variable: [["Transport and loading", 0.01, true]],
    fixed: [["Yard rent", 5000, false]],
    days: [20, 0, 15, 15],
    text: {
      market: "House building under PM Awas Yojana and private construction create steady demand for cement, steel, bricks and sand from masons, contractors and homeowners.",
      process: "Material is bought from company dealers and suppliers, stocked at the yard, and sold and delivered to sites with bills.",
      rawMaterialSource: "Cement and steel are bought from company distributors; sand and bricks from local suppliers.",
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Building a template from a sketch
   ───────────────────────────────────────────────────────────────────────── */

const DAYS = 365;
/** Earnings before interest and depreciation at 80% capacity, as a share of project cost. */
const TARGET_EBIDTA_TO_COST = 0.40;
const CHECK_UTILISATION = 0.8;
/** In the first year, at 60% capacity, earnings must still cover interest, depreciation and a little profit. */
const FIRST_YEAR_EBIDTA_TO_COST = 0.20;
const FIXED_COST_CUSHION = 1.2;
const FIRST_YEAR_UTILISATION = 0.6;

export type BuiltActivity = {
  id: string;
  label: string;
  activity: string;
  sector: SchemeSector;
  group: ActivityGroup;
  notFor: SchemeId[];
  capitalItems: CapitalItem[];
  products: Product[];
  rawMaterials: RawMaterial[];
  staff: StaffRow[];
  overheads: Overhead[];
  rawMaterialDays: number;
  finishedGoodsDays: number;
  debtorDays: number;
  creditorDays: number;
  text: {
    market: string;
    process: string;
    machinery: string;
    rawMaterialSource: string;
    marketing: string;
    licences: string[];
    risks: [string, string][];
    swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  };
};

const round = (value: number, step = 1) => Math.max(step, Math.round(value / step) * step);
const tidy = (value: number) => (value >= 100000 ? round(value, 100) : value >= 1000 ? round(value, 10) : round(value));

export function buildActivity(sketch: ActivitySketch): BuiltActivity {
  const capitalItems: CapitalItem[] = [
    ...sketch.machines.map(([description, rate, quantity]) => ({ kind: "machinery" as const, description, rate, quantity: quantity ?? 1 })),
    ...(sketch.electrical ? [{ kind: "electrical" as const, description: "Electrical wiring, panel and power connection", rate: sketch.electrical, quantity: 1 }] : []),
    ...(sketch.furniture ? [{ kind: "furniture" as const, description: "Furniture, racks and fixtures", rate: sketch.furniture, quantity: 1 }] : []),
    { kind: "preliminary" as const, description: "Registration, project report and pre-operative expenses", rate: sketch.preliminary ?? 15000, quantity: 1 },
  ];
  const fixedCapital = capitalItems.reduce((sum, item) => sum + item.rate * item.quantity, 0);

  const materialShare = sketch.materials.reduce((sum, [, , , share]) => sum + share, 0);
  const variableShare = sketch.variable.reduce((sum, [, share]) => sum + share, 0);
  const directVariableShare = sketch.variable.filter(([, , d]) => d).reduce((sum, [, share]) => sum + share, 0);
  const wages = sketch.staff.reduce((sum, [, count, salary]) => sum + count * salary * 12, 0);
  const fixedOverheads = sketch.fixed.reduce((sum, [, monthly]) => sum + monthly * 12, 0);
  const [rmDays, fgDays, debtorDays, creditorDays] = sketch.days;

  // Working capital per rupee of full-capacity sales, as the engine works it out from year one.
  const wcPerSale = (FIRST_YEAR_UTILISATION * (materialShare * rmDays + (materialShare + directVariableShare) * fgDays + debtorDays - materialShare * creditorDays)) / DAYS;
  // Sales that give the target earnings both at 80% capacity and in the first year at 60%,
  // with fixed costs taken a third higher so the unit still pays its way when scaled down.
  const contribution = 1 - materialShare - variableShare;
  const fixedCosts = (wages + fixedOverheads) * FIXED_COST_CUSHION;
  const salesFor = (utilisation: number, k: number) => {
    const margin = utilisation * contribution - k * Math.max(0, wcPerSale);
    return (fixedCosts + k * fixedCapital) / Math.max(0.02, margin);
  };
  const sales = Math.max(salesFor(CHECK_UTILISATION, TARGET_EBIDTA_TO_COST), salesFor(FIRST_YEAR_UTILISATION, FIRST_YEAR_EBIDTA_TO_COST));

  // A "lot" is a whole year's trade in one line (a shop's sales and purchases): its value scales, not a quantity.
  const products: Product[] = sketch.products.map(([name, unit, price, share]) =>
    unit === "lot" ? { name, unit, price: tidy(sales * share), capacity: 1 } : { name, unit, price, capacity: Math.max(1, Math.round((sales * share) / price)) },
  );
  const rawMaterials: RawMaterial[] = sketch.materials.map(([name, unit, rate, share]) =>
    unit === "lot" ? { name, unit, rate: tidy(sales * share), quantity: 1 } : { name, unit, rate, quantity: Math.max(1, Math.round((sales * share) / rate)) },
  );
  const staff: StaffRow[] = sketch.staff.map(([role, count, monthlySalary, direct]) => ({ role, count, monthlySalary, direct }));
  const overheads: Overhead[] = [
    ...sketch.variable.map(([name, share, direct]) => ({ name, monthly: tidy((sales * share) / 12), variable: true, direct })),
    ...sketch.fixed.map(([name, monthly, direct]) => ({ name, monthly, variable: false, direct })),
  ];

  const g = GROUP_TEXT[sketch.group];
  const t = sketch.text;
  const machines = sketch.machines.map(([d]) => d.split(" (")[0].toLowerCase());
  return {
    id: sketch.id,
    label: sketch.label,
    activity: sketch.activity,
    sector: sketch.sector,
    group: sketch.group,
    notFor: sketch.notFor ?? [],
    capitalItems,
    products,
    rawMaterials,
    staff,
    overheads,
    rawMaterialDays: rmDays,
    finishedGoodsDays: fgDays,
    debtorDays,
    creditorDays,
    text: {
      market: t.market,
      process: t.process,
      machinery:
        t.machinery ??
        `The unit needs ${machines.slice(0, -1).join(", ")}${machines.length > 1 ? " and " : ""}${machines.at(-1)}. These are standard ${sketch.sector === "trading" ? "fixtures" : "machines"}, available from established manufacturers and dealers in Uttar Pradesh and Delhi with installation support and warranty.`,
      rawMaterialSource: t.rawMaterialSource,
      marketing: t.marketing ?? g.marketing,
      licences: [...COMMON_LICENCES, ...g.licences, ...(t.licences ?? [])],
      risks: [...(t.risks ?? []), ...g.risks],
      swot: {
        strengths: [...(t.swot?.strengths ?? []), ...g.swot.strengths],
        weaknesses: [...(t.swot?.weaknesses ?? []), ...g.swot.weaknesses],
        opportunities: [...(t.swot?.opportunities ?? []), ...g.swot.opportunities],
        threats: [...(t.swot?.threats ?? []), ...g.swot.threats],
      },
    },
  };
}

export const BUILT_ACTIVITIES: BuiltActivity[] = ACTIVITY_SKETCHES.map(buildActivity);
