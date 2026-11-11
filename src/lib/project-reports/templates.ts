import type { SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";

import { BUILT_ACTIVITIES, GROUP_LABELS, type ActivityGroup } from "./activities";
import { withEstimatedCosts } from "./estimates";
import { buildDpr, type CapitalItem, type DprInput, type Overhead, type Product, type RawMaterial, type StaffRow } from "./engine";

/**
 * Ready-made project templates for the businesses this shop files DPRs for
 * most often. A template carries a typical unit — machinery, capacity,
 * prices, raw material, staff, running costs and the written sections a
 * bank expects for that trade — sized at a base project cost. Picking one
 * and typing the customer's project cost scales the whole unit to fit, so
 * the admin enters only the customer's own details.
 *
 * Figures are typical market rates (2026) for a small unit in Uttar
 * Pradesh; every one stays editable in the form.
 */

export type TemplateText = {
  market: string;
  process: string;
  machinery: string;
  rawMaterialSource: string;
  marketing: string;
  licences: string[];
  risks: [string, string][];
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
};

export type ProjectTemplate = {
  id: string;
  label: string;
  activity: string;
  sector: SchemeSector;
  /** Heading the business is listed under in the form. */
  group: ActivityGroup;
  /** Schemes that do not fund this activity even though its sector qualifies. */
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
  text: TemplateText;
};

const m = (description: string, rate: number, quantity = 1): CapitalItem => ({ kind: "machinery", description, quantity, rate });
const asset = (kind: CapitalItem["kind"], description: string, rate: number, quantity = 1): CapitalItem => ({ kind, description, quantity, rate });
const direct = (role: string, count: number, monthlySalary: number): StaffRow => ({ role, count, monthlySalary, direct: true });
const office = (role: string, count: number, monthlySalary: number): StaffRow => ({ role, count, monthlySalary, direct: false });
const cost = (name: string, monthly: number, variable: boolean, isDirect: boolean): Overhead => ({ name, monthly, variable, direct: isDirect });

const COMMON_LICENCES = ["Udyam Registration (MSME)", "GST registration", "Trade licence / shop registration from the local body", "Current account with the financing bank"];

const HAND_BUILT: Omit<ProjectTemplate, "group" | "notFor">[] = [
  {
    id: "flour-mill",
    label: "Aata chakki (flour mill)",
    activity: "manufacturing of wheat flour (atta) and allied products",
    sector: "manufacturing",
    capitalItems: [
      m("Atta chakki (flour mill) 20 HP with motor and starter", 450000),
      m("Pouch / bag packing and stitching machine", 100000),
      m("Electronic weighing scale (platform)", 20000),
      asset("electrical", "Electrical wiring, panel and power connection", 50000),
      asset("furniture", "Storage racks, table and stools", 30000),
      asset("preliminary", "Registration, project report and pre-operative expenses", 20000),
    ],
    products: [
      { name: "Wheat flour (atta)", unit: "quintal", capacity: 3000, price: 3000 },
      { name: "Wheat bran (chokar)", unit: "quintal", capacity: 120, price: 1600 },
    ],
    rawMaterials: [{ name: "Wheat", unit: "quintal", quantity: 3150, rate: 2350 }],
    staff: [direct("Machine operator", 2, 12000), office("Accountant / sales", 1, 10000)],
    overheads: [
      cost("Electricity / power", 25000, true, true),
      cost("Packing material (bags, pouches)", 6000, true, true),
      cost("Repairs and maintenance", 2000, false, true),
      cost("Office, telephone and stationery", 2000, false, false),
      cost("Transport and marketing", 5000, true, false),
    ],
    rawMaterialDays: 20,
    finishedGoodsDays: 7,
    debtorDays: 20,
    creditorDays: 20,
    text: {
      market:
        "Wheat flour is a staple food in Uttar Pradesh and is consumed daily by every household. Demand comes from households, kirana shops, hotels, dhabas, sweet shops and institutional buyers such as hostels and canteens. Packed chakki atta is preferred over branded atta in small towns because of its freshness and lower price. The unit will also offer job-grinding to local households, which keeps the machinery busy in the lean season.",
      process:
        "Wheat is purchased from local mandis and farmers, cleaned of dust, stones and husk, and conditioned. It is then ground in the stone/emery chakki to the required fineness, sieved to separate bran (chokar), cooled and packed in 5, 10, 25 and 50 kg bags. Bran is sold as cattle feed. The process is simple, proven and needs semi-skilled labour.",
      machinery:
        "The main machine is a 20 HP flour mill (chakki) with motor and starter, supported by a packing and stitching machine and a platform weighing scale. Machines are available from established manufacturers and dealers in Kanpur, Agra and Delhi, and quotations have been obtained.",
      rawMaterialSource:
        "Wheat is available in plenty from local mandis and farmers in the district throughout the year, particularly after the rabi harvest. The unit will buy at mandi rates and stock for 2–3 weeks.",
      marketing:
        "The promoter will sell directly to households and through kirana shops, dhabas and sweet shops in nearby towns and villages, offering home delivery for bulk orders. A recognisable local brand name and consistent quality will be used to build repeat customers.",
      licences: [...COMMON_LICENCES, "FSSAI food business registration / licence", "Electricity connection (commercial / industrial load)"],
      risks: [
        ["Fluctuation in wheat prices", "Stock bought at harvest time; selling price revised in line with mandi rates."],
        ["Competition from branded atta", "Freshness, local delivery and competitive price."],
        ["Power cuts", "Operations planned around supply hours; generator back-up if required."],
      ],
      swot: {
        strengths: ["Staple product with year-round demand", "Simple, proven technology", "Promoter's local market knowledge"],
        weaknesses: ["Thin margin per quintal", "Dependence on power supply"],
        opportunities: ["Multigrain and besan products", "Supply to hostels and canteens", "Job-grinding for households"],
        threats: ["Branded packed atta", "Wheat price volatility"],
      },
    },
  },
  {
    id: "oil-mill",
    label: "Tel ghani / oil mill (mustard oil)",
    activity: "manufacturing of kachi ghani mustard oil and oil cake",
    sector: "manufacturing",
    capitalItems: [
      m("Oil expeller with motor (kachi ghani)", 350000),
      m("Oil filter press", 80000),
      m("Oil storage tanks (stainless steel)", 60000),
      m("Bottle / tin filling and sealing machine", 50000),
      asset("electrical", "Electrical wiring and panel", 40000),
      asset("furniture", "Racks and furniture", 20000),
      asset("preliminary", "Registration and pre-operative expenses", 15000),
    ],
    products: [
      { name: "Kachi ghani mustard oil", unit: "kg", capacity: 40000, price: 200 },
      { name: "Mustard oil cake (khali)", unit: "kg", capacity: 76000, price: 30 },
    ],
    rawMaterials: [{ name: "Mustard seed", unit: "kg", quantity: 120000, rate: 60 }],
    staff: [direct("Expeller operator", 1, 13000), direct("Helper", 1, 9000), office("Sales / accounts", 1, 10000)],
    overheads: [
      cost("Electricity / power", 18000, true, true),
      cost("Packing material (bottles, tins)", 12000, true, true),
      cost("Repairs and maintenance", 2000, false, true),
      cost("Office and telephone", 1500, false, false),
      cost("Transport and marketing", 5000, true, false),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 10,
    debtorDays: 20,
    creditorDays: 15,
    text: {
      market:
        "Mustard oil is the main cooking oil in Uttar Pradesh and North India. Consumers increasingly prefer pure kachi ghani oil pressed locally over refined and blended oils because of its purity and pungency. Oil cake (khali) has an assured market as cattle feed among dairy farmers. Demand is steady throughout the year.",
      process:
        "Mustard seed is cleaned and dried, then crushed in the expeller. The oil is settled and filtered through the filter press and filled in bottles and tins. Oil cake from the expeller is sold in bags to dairy farmers and feed traders. Oil recovery is about 33–35% of seed weight.",
      machinery:
        "The unit will install an oil expeller with motor, a filter press, stainless steel storage tanks and a filling and sealing machine. These are standard machines available from manufacturers in Agra, Kanpur and Rajasthan.",
      rawMaterialSource:
        "Mustard is a major rabi crop in the region and is available from local mandis and farmers. Seed will be bought after harvest and stocked for about a month.",
      marketing:
        "Oil will be sold under the unit's own label to households, kirana stores and wholesalers, and oil cake to dairy farmers and cattle-feed dealers. Purity and freshness will be the main selling points.",
      licences: [...COMMON_LICENCES, "FSSAI licence for edible oil", "Legal Metrology registration for packed commodities"],
      risks: [
        ["Mustard seed price fluctuation", "Bulk buying after harvest; prices linked to seed rates."],
        ["Adulterated cheap oil in the market", "Quality, transparent pressing and local trust."],
      ],
      swot: {
        strengths: ["High demand for pure oil", "Two saleable products (oil and cake)", "Raw material available locally"],
        weaknesses: ["Working capital needed for seed stock"],
        opportunities: ["Branded packed oil", "Groundnut and til oil lines"],
        threats: ["Edible oil price swings", "Competition from refined oil brands"],
      },
    },
  },
  {
    id: "masala",
    label: "Masala pisai aur packing (spices)",
    activity: "grinding, blending and packing of spices (masala)",
    sector: "manufacturing",
    capitalItems: [
      m("Pulveriser with motor", 200000),
      m("Spice mixer / blender and sieving machine", 100000),
      m("Automatic pouch packing machine", 200000),
      m("Band sealer and weighing scales", 30000),
      asset("electrical", "Electrical wiring and panel", 40000),
      asset("furniture", "Racks, tables and storage bins", 30000),
      asset("preliminary", "Registration and pre-operative expenses", 15000),
    ],
    products: [{ name: "Packed spices and blended masala", unit: "kg", capacity: 24000, price: 260 }],
    rawMaterials: [{ name: "Whole spices (chilli, turmeric, coriander, etc.)", unit: "kg", quantity: 25000, rate: 170 }],
    staff: [direct("Machine operator", 1, 12000), direct("Packing helper", 2, 9000), office("Salesman", 1, 10000)],
    overheads: [
      cost("Electricity / power", 10000, true, true),
      cost("Packing material (pouches, cartons)", 25000, true, true),
      cost("Repairs and maintenance", 1500, false, true),
      cost("Office and telephone", 1500, false, false),
      cost("Transport and marketing", 8000, true, false),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 15,
    debtorDays: 25,
    creditorDays: 15,
    text: {
      market:
        "Spices are used in every Indian kitchen, hotel and dhaba. Packed, hygienic masala has replaced loose spices in towns and is fast replacing them in villages. Local brands sell well on freshness, taste and price, and shopkeepers welcome a nearby supplier who can deliver quickly and on credit terms.",
      process:
        "Whole spices are cleaned, sun-dried or roasted as required, ground in the pulveriser, sieved and blended to recipe. The powder is packed in 50 g to 1 kg pouches on the automatic packing machine, sealed, coded and packed in cartons.",
      machinery:
        "A pulveriser, mixer-cum-sieve, automatic pouch packing machine, band sealer and weighing scales — all standard food-processing machines available locally.",
      rawMaterialSource:
        "Chilli, turmeric, coriander, cumin and other spices are available from the mandis of Kanpur, Agra and nearby districts and from wholesale traders.",
      marketing:
        "The unit will appoint distributors for nearby towns and sell directly to kirana stores, hotels and dhabas, supported by shop branding and attractive packs.",
      licences: [...COMMON_LICENCES, "FSSAI licence", "Legal Metrology registration for packed commodities", "Trade mark registration for the brand (recommended)"],
      risks: [
        ["Spice price fluctuation", "Seasonal bulk purchase; product mix adjusted."],
        ["Quality complaints", "Cleaning, moisture control and batch testing."],
      ],
      swot: {
        strengths: ["Daily-use product", "Good margins on blended masala", "Low technical risk"],
        weaknesses: ["New brand needs promotion"],
        opportunities: ["Blended masala (garam, chhole, sabzi)", "Supply to hotels and caterers"],
        threats: ["Large national brands", "Price competition from loose spices"],
      },
    },
  },
  {
    id: "bakery",
    label: "Bakery (bread, biscuit, rusk, cake)",
    activity: "manufacturing of bakery products — bread, biscuits, rusk and cakes",
    sector: "manufacturing",
    capitalItems: [
      m("Rotary / deck baking oven", 300000),
      m("Dough kneader / mixer", 100000),
      m("Planetary mixer", 80000),
      m("Bread slicer", 50000),
      m("Trays, moulds and racks", 70000),
      asset("furniture", "Display counter and work tables", 60000),
      asset("electrical", "Electrical and gas line installation", 40000),
      asset("preliminary", "Registration and pre-operative expenses", 15000),
    ],
    products: [
      { name: "Bread", unit: "packet", capacity: 60000, price: 35 },
      { name: "Biscuits and rusk", unit: "kg", capacity: 18000, price: 160 },
      { name: "Cakes and pastries", unit: "kg", capacity: 3000, price: 400 },
    ],
    rawMaterials: [
      { name: "Maida (refined flour)", unit: "kg", quantity: 40000, rate: 32 },
      { name: "Sugar", unit: "kg", quantity: 12000, rate: 42 },
      { name: "Vanaspati / butter", unit: "kg", quantity: 8000, rate: 140 },
      { name: "Yeast, eggs, milk, essence and others", unit: "lot", quantity: 1, rate: 500000 },
    ],
    staff: [direct("Baker (karigar)", 2, 14000), direct("Helper", 2, 9000), office("Salesman / delivery", 1, 10000)],
    overheads: [
      cost("Gas / fuel", 20000, true, true),
      cost("Electricity", 8000, true, true),
      cost("Packing material", 15000, true, true),
      cost("Rent", 6000, false, false),
      cost("Transport and delivery", 6000, true, false),
    ],
    rawMaterialDays: 15,
    finishedGoodsDays: 3,
    debtorDays: 10,
    creditorDays: 15,
    text: {
      market:
        "Bakery products are consumed daily by households, tea stalls, schools and offices. Fresh local bread, rusk and cakes are preferred over long-shelf-life branded products, and birthday and festival demand for cakes is growing quickly in small towns.",
      process:
        "Ingredients are weighed and mixed in the kneader, the dough is proved, moulded and baked in the oven, then cooled, sliced and packed. Biscuits and rusk are baked, dried and packed; cakes are baked and decorated to order.",
      machinery:
        "A deck/rotary oven, dough kneader, planetary mixer, bread slicer and trays and moulds, all available from bakery equipment suppliers in Delhi and Kanpur.",
      rawMaterialSource: "Maida, sugar, vanaspati, eggs and other ingredients are available from local wholesalers every day.",
      marketing:
        "Daily van/two-wheeler delivery to retail shops and tea stalls, a counter at the unit, and cake orders through WhatsApp and phone.",
      licences: [...COMMON_LICENCES, "FSSAI licence", "Fire safety NOC (where required)"],
      risks: [
        ["Short shelf life of bread", "Daily production to order and quick distribution."],
        ["Input price rise", "Periodic price revision; product mix."],
      ],
      swot: {
        strengths: ["Daily consumption", "Multiple products from one setup"],
        weaknesses: ["Perishable products"],
        opportunities: ["Birthday cakes and festival orders", "Supply to schools and canteens"],
        threats: ["Branded bakery products"],
      },
    },
  },
  {
    id: "dairy",
    label: "Dairy (paneer, ghee, dahi)",
    activity: "processing of milk into paneer, ghee and curd",
    sector: "manufacturing",
    capitalItems: [
      m("Bulk milk cooler (1000 litre)", 450000),
      m("Cream separator", 80000),
      m("Paneer press with hoops", 50000),
      m("Khoa / ghee making machine", 120000),
      m("Deep freezer and visi-cooler", 60000),
      asset("electrical", "Electrical installation", 40000),
      asset("furniture", "Tables, utensils and racks", 30000),
      asset("preliminary", "Registration and pre-operative expenses", 15000),
    ],
    products: [
      { name: "Paneer", unit: "kg", capacity: 24000, price: 320 },
      { name: "Desi ghee", unit: "kg", capacity: 3000, price: 600 },
      { name: "Curd (dahi)", unit: "kg", capacity: 40000, price: 70 },
    ],
    rawMaterials: [{ name: "Milk", unit: "litre", quantity: 240000, rate: 40 }],
    staff: [direct("Dairy technician / karigar", 1, 14000), direct("Helper", 2, 9000), office("Sales / accounts", 1, 10000)],
    overheads: [
      cost("Electricity", 15000, true, true),
      cost("Fuel (gas / firewood)", 8000, true, true),
      cost("Packing material", 6000, true, true),
      cost("Transport and marketing", 6000, true, false),
      cost("Office and telephone", 1500, false, false),
    ],
    rawMaterialDays: 2,
    finishedGoodsDays: 3,
    debtorDays: 10,
    creditorDays: 10,
    text: {
      market:
        "Paneer, ghee and curd are in daily demand from households, sweet shops, hotels, caterers and marriage functions. Fresh local dairy products command a premium, and demand rises sharply in the wedding and festival seasons.",
      process:
        "Milk collected from farmers is tested for fat and SNF and chilled in the bulk cooler. Part is set into curd; part is heated and coagulated to make paneer, pressed in hoops and chilled; cream is separated and clarified into ghee.",
      machinery: "A bulk milk cooler, cream separator, paneer press, khoa/ghee machine and deep freezer, available from dairy equipment suppliers.",
      rawMaterialSource: "Milk will be collected twice a day from dairy farmers in nearby villages at prevailing rates; the area has a large milch-animal population.",
      marketing: "Direct supply to sweet shops, hotels and caterers, a retail counter, and bulk orders for functions.",
      licences: [...COMMON_LICENCES, "FSSAI licence (dairy)", "Pollution control consent (where applicable)"],
      risks: [
        ["Milk supply variation in summer", "Tie-ups with several farmers; product mix."],
        ["Perishability", "Cold chain with cooler and freezer; daily dispatch."],
      ],
      swot: {
        strengths: ["Assured local milk supply", "High-value products"],
        weaknesses: ["Perishable; needs cold storage"],
        opportunities: ["Khoa and sweets", "Supply to caterers"],
        threats: ["Adulteration-driven price competition"],
      },
    },
  },
  {
    id: "garments",
    label: "Readymade garments / silai (boutique)",
    activity: "manufacturing of readymade garments (stitching unit)",
    sector: "manufacturing",
    capitalItems: [
      m("Industrial sewing machines (single needle)", 18000, 8),
      m("Overlock / interlock machine", 22000, 2),
      m("Cloth cutting machine", 35000),
      m("Steam iron press", 20000, 2),
      asset("furniture", "Cutting tables, racks and chairs", 60000),
      asset("electrical", "Electrical wiring and lights", 25000),
      asset("preliminary", "Registration and pre-operative expenses", 10000),
    ],
    products: [{ name: "Readymade garments (shirts, kurtis, suits)", unit: "piece", capacity: 12000, price: 450 }],
    rawMaterials: [
      { name: "Fabric", unit: "metre", quantity: 24000, rate: 100 },
      { name: "Thread, buttons, zips and trims", unit: "set", quantity: 12000, rate: 15 },
    ],
    staff: [direct("Cutting master", 1, 14000), direct("Helper", 1, 8000), office("Supervisor / sales", 1, 10000)],
    overheads: [
      cost("Stitching labour (piece rate)", 80000, true, true),
      cost("Electricity", 5000, true, true),
      cost("Packing material", 4000, true, true),
      cost("Rent", 5000, false, false),
      cost("Transport and marketing", 5000, true, false),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 20,
    debtorDays: 30,
    creditorDays: 20,
    text: {
      market:
        "Readymade garments have a large and growing market in towns and villages. Local retailers buy from nearby units for faster replenishment and lower cost, and there is regular demand for school uniforms and wedding-season clothing.",
      process:
        "Fabric is inspected, laid and cut to patterns, then stitched on single-needle and overlock machines, finished with buttons and trims, pressed, checked and packed.",
      machinery: "Industrial sewing machines, overlock machines, a cutting machine and steam press, all easily available locally.",
      rawMaterialSource: "Fabric and trims are available from wholesale markets in Kanpur, Delhi and Surat and from local wholesalers.",
      marketing: "Supply to local retailers and wholesalers, school uniform contracts, and direct sales at fairs and through social media.",
      licences: [...COMMON_LICENCES, "Labour registration (where applicable)"],
      risks: [
        ["Fashion changes", "Small batches and regular new designs."],
        ["Skilled labour availability", "Piece-rate system and training of local women."],
      ],
      swot: {
        strengths: ["Low technology risk", "Employment generation for local women"],
        weaknesses: ["Labour-intensive"],
        opportunities: ["School uniforms", "Online selling"],
        threats: ["Competition from large manufacturers"],
      },
    },
  },
  {
    id: "beauty-parlour",
    label: "Beauty parlour / salon",
    activity: "running a beauty parlour and salon",
    sector: "service",
    capitalItems: [
      m("Salon chairs (hydraulic)", 15000, 3),
      m("Facial / massage bed", 12000, 2),
      m("Hair dryer, steamer, straightener and salon equipment", 60000),
      m("Air conditioner (1.5 ton)", 38000),
      asset("furniture", "Interiors, mirrors, counters and furniture", 150000),
      asset("electrical", "Electrical fittings and lights", 30000),
      asset("preliminary", "Registration and pre-operative expenses", 10000),
    ],
    products: [
      { name: "Beauty and hair services", unit: "service", capacity: 6000, price: 450 },
      { name: "Bridal and party packages", unit: "package", capacity: 40, price: 15000 },
    ],
    rawMaterials: [{ name: "Cosmetics and consumables", unit: "service", quantity: 6000, rate: 90 }],
    staff: [direct("Beautician", 2, 12000), direct("Helper", 1, 8000)],
    overheads: [
      cost("Rent", 8000, false, false),
      cost("Electricity", 4000, true, true),
      cost("Marketing and promotion", 3000, false, false),
      cost("Laundry and sundry", 2000, true, true),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 0,
    debtorDays: 0,
    creditorDays: 15,
    text: {
      market:
        "Spending on personal grooming has grown steadily in small towns. Demand comes from college students, working women and brides, with peaks in the wedding and festival seasons. A well-equipped parlour with trained staff can build a loyal customer base quickly.",
      process:
        "Customers are served by appointment and walk-in for facials, hair cutting and styling, threading, waxing, manicure, pedicure and bridal make-up, using branded products and hygienic practices.",
      machinery: "Hydraulic salon chairs, facial beds, hair dryers, steamers and an air conditioner, with professional interiors.",
      rawMaterialSource: "Cosmetics and consumables are bought from authorised distributors of professional brands.",
      marketing: "Social media pages, festival offers, bridal packages and tie-ups with wedding planners and boutiques.",
      licences: [...COMMON_LICENCES, "Shop and establishment registration"],
      risks: [
        ["Staff attrition", "Incentives and training."],
        ["Seasonal demand", "Membership packages and offers."],
      ],
      swot: {
        strengths: ["Low raw material cost", "Repeat customers"],
        weaknesses: ["Dependence on skilled staff"],
        opportunities: ["Bridal make-up", "Training academy"],
        threats: ["New parlours nearby"],
      },
    },
  },
  {
    id: "mobile-repair",
    label: "Mobile repairing aur accessories",
    activity: "mobile phone repairing and sale of accessories",
    sector: "service",
    capitalItems: [
      m("Soldering and rework stations", 25000, 2),
      m("Testing tools, microscope and repair kit", 60000),
      asset("computer", "Computer with flashing software", 50000),
      asset("furniture", "Shop counter, display and furniture", 120000),
      asset("electrical", "Electrical fittings and inverter", 20000),
      asset("preliminary", "Registration and pre-operative expenses", 10000),
    ],
    products: [
      { name: "Mobile repair services", unit: "job", capacity: 5000, price: 400 },
      { name: "Mobile accessories (trading)", unit: "lot", capacity: 1, price: 1200000 },
    ],
    rawMaterials: [
      { name: "Spare parts for repairs", unit: "job", quantity: 5000, rate: 150 },
      { name: "Accessories purchase", unit: "lot", quantity: 1, rate: 960000 },
    ],
    staff: [direct("Repair technician", 1, 12000), office("Sales assistant", 1, 8000)],
    overheads: [
      cost("Rent", 6000, false, false),
      cost("Electricity and internet", 3000, false, false),
      cost("Marketing", 2000, false, false),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 0,
    debtorDays: 0,
    creditorDays: 15,
    text: {
      market:
        "Almost every household now owns several smartphones, and screen, battery and charging-port repairs are frequent. Customers prefer a reliable local repair shop that also sells chargers, covers, earphones and screen guards.",
      process:
        "Phones are diagnosed, repaired with quality spare parts, tested and returned with a warranty. Accessories are bought from distributors and sold over the counter.",
      machinery: "Soldering and rework stations, a microscope and repair kit, and a computer with flashing software.",
      rawMaterialSource: "Spare parts and accessories are bought from distributors in Delhi (Gaffar Market, Karol Bagh) and Lucknow.",
      marketing: "Prominent shop location, warranty on repairs, WhatsApp updates and accessory combos.",
      licences: [...COMMON_LICENCES, "Shop and establishment registration"],
      risks: [["Fast-changing technology", "Regular training on new models."], ["Credit to customers", "Cash sales policy."]],
      swot: {
        strengths: ["Recurring demand", "Low investment"],
        weaknesses: ["Depends on technician skill"],
        opportunities: ["Refurbished phone sales", "Doorstep pick-up"],
        threats: ["Authorised service centres"],
      },
    },
  },
  {
    id: "computer-centre",
    label: "Computer training / CSC centre",
    activity: "computer training institute and online services centre",
    sector: "service",
    capitalItems: [
      asset("computer", "Desktop computers", 35000, 10),
      asset("computer", "Laser printer, scanner and photocopier", 40000),
      m("Projector and screen", 40000),
      m("UPS / inverter with batteries", 60000),
      asset("furniture", "Computer tables, chairs and interiors", 150000),
      asset("electrical", "Electrical and networking", 30000),
      asset("preliminary", "Registration, affiliation and pre-operative expenses", 15000),
    ],
    products: [
      { name: "Computer courses (students)", unit: "student", capacity: 300, price: 6000 },
      { name: "Online forms, DTP and printing services", unit: "job", capacity: 6000, price: 100 },
    ],
    rawMaterials: [{ name: "Stationery, paper and consumables", unit: "job", quantity: 6000, rate: 15 }],
    staff: [direct("Computer instructor", 2, 12000), office("Receptionist / operator", 1, 8000)],
    overheads: [
      cost("Rent", 8000, false, false),
      cost("Electricity and internet", 6000, false, false),
      cost("Advertisement", 3000, false, false),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 0,
    debtorDays: 15,
    creditorDays: 15,
    text: {
      market:
        "Computer literacy is required for almost every job, and students and job-seekers in small towns look for affordable certified courses (CCC, Tally, DCA, typing). Government and online services — forms, certificates, bill payments — add steady daily income.",
      process:
        "Students are enrolled in batches for certified courses taught by trained instructors with practical lab work and examinations. The front desk provides online forms, printing and DTP services.",
      machinery: "Ten desktop computers, printer-scanner-photocopier, projector, UPS/inverter and furnished classroom.",
      rawMaterialSource: "Stationery and consumables are bought locally.",
      marketing: "Tie-ups with schools and colleges, pamphlets, social media and placement assistance.",
      licences: [...COMMON_LICENCES, "Course affiliation (NIELIT / university) where applicable", "CSC / service provider registration (where applicable)"],
      risks: [["Competition from other institutes", "Certified courses and placement support."], ["Technology obsolescence", "Regular upgrades from cash accruals."]],
      swot: {
        strengths: ["Recurring demand for courses", "Two income streams"],
        weaknesses: ["Seasonal admissions"],
        opportunities: ["Government skill programmes", "Online services"],
        threats: ["Free online courses"],
      },
    },
  },
  {
    id: "kirana",
    label: "Kirana / general store (trading)",
    activity: "retail trading of grocery and general merchandise",
    sector: "trading",
    capitalItems: [
      asset("furniture", "Racks, counters and shop interiors", 150000),
      m("Deep freezer / visi-cooler", 40000),
      asset("computer", "Computer billing system with printer", 50000),
      m("Electronic weighing scales", 10000),
      asset("electrical", "Electrical fittings and inverter", 30000),
      asset("preliminary", "Registration and pre-operative expenses", 10000),
    ],
    products: [{ name: "Grocery, FMCG and general merchandise (sales)", unit: "lot", capacity: 1, price: 7200000 }],
    rawMaterials: [{ name: "Purchase of goods for resale", unit: "lot", quantity: 1, rate: 6336000 }],
    staff: [direct("Salesman", 1, 9000)],
    overheads: [
      cost("Rent", 8000, false, false),
      cost("Electricity", 3000, false, false),
      cost("Carriage and packing", 4000, true, true),
      cost("Telephone and sundry", 1500, false, false),
    ],
    rawMaterialDays: 0,
    finishedGoodsDays: 30,
    debtorDays: 5,
    creditorDays: 10,
    text: {
      market:
        "Grocery and daily-use items have steady, non-seasonal demand. A well-stocked store with competitive prices and home delivery attracts regular households in its locality.",
      process: "Goods are purchased from wholesalers and distributors, stocked, displayed and sold over the counter with computerised billing; fast-moving items are replenished weekly.",
      machinery: "Racks and counters, deep freezer, computer billing system and weighing scales.",
      rawMaterialSource: "Goods are bought from FMCG distributors and wholesale markets on short credit.",
      marketing: "Home delivery, WhatsApp ordering, monthly accounts for regular customers and offers.",
      licences: [...COMMON_LICENCES, "FSSAI registration", "Shop and establishment registration"],
      risks: [["Low margins", "High volume and fast stock turnover."], ["Credit sales", "Limited, monitored credit."]],
      swot: {
        strengths: ["Daily-need items", "Fast stock turnover"],
        weaknesses: ["Thin margins"],
        opportunities: ["Home delivery and online orders"],
        threats: ["Supermarkets and quick-commerce"],
      },
    },
  },
  {
    id: "furniture",
    label: "Furniture / carpentry workshop",
    activity: "manufacturing of wooden furniture",
    sector: "manufacturing",
    capitalItems: [
      m("Combined wood working machine", 150000),
      m("Circular saw and band saw", 60000),
      m("Thickness planer", 80000),
      m("Drill, router and power tools", 40000),
      m("Compressor and spray painting set", 50000),
      asset("building", "Workshop shed improvement", 100000),
      asset("electrical", "Electrical wiring and three-phase connection", 30000),
      asset("preliminary", "Registration and pre-operative expenses", 15000),
    ],
    products: [
      { name: "Beds and double beds", unit: "piece", capacity: 200, price: 18000 },
      { name: "Almirah and wardrobes", unit: "piece", capacity: 200, price: 15000 },
      { name: "Chairs, tables and others", unit: "piece", capacity: 800, price: 2500 },
    ],
    rawMaterials: [
      { name: "Timber and plywood", unit: "cft", quantity: 8000, rate: 600 },
      { name: "Hardware, polish and fittings", unit: "lot", quantity: 1, rate: 600000 },
    ],
    staff: [direct("Carpenter", 4, 14000), direct("Helper", 2, 9000), office("Supervisor / sales", 1, 12000)],
    overheads: [
      cost("Electricity", 8000, true, true),
      cost("Repairs and maintenance", 2000, false, true),
      cost("Transport and marketing", 6000, true, false),
      cost("Office and telephone", 1500, false, false),
    ],
    rawMaterialDays: 30,
    finishedGoodsDays: 20,
    debtorDays: 25,
    creditorDays: 15,
    text: {
      market:
        "Demand for beds, almirahs, dining sets and office furniture is driven by new houses, marriages and offices. Customers prefer solid custom-made furniture from local workshops over flat-pack products.",
      process: "Timber and ply are seasoned, cut, planed and shaped on the machines, joined and assembled, sanded, polished/painted and fitted with hardware.",
      machinery: "Combined wood-working machine, saws, thickness planer, power tools and spray painting set.",
      rawMaterialSource: "Timber and plywood are available from timber markets and ply dealers in the district and nearby cities.",
      marketing: "Display at the workshop, orders from households and offices, supply to furniture showrooms and marriage orders.",
      licences: [...COMMON_LICENCES, "Forest department permission for timber (where required)"],
      risks: [["Timber price rise", "Use of ply/engineered wood; price revision."], ["Skilled labour", "Retaining skilled carpenters."]],
      swot: {
        strengths: ["Custom orders", "Good margins"],
        weaknesses: ["Labour-intensive"],
        opportunities: ["Modular kitchens and office furniture"],
        threats: ["Branded and online furniture"],
      },
    },
  },
  {
    id: "fabrication",
    label: "Steel fabrication (grill, gate, shed)",
    activity: "steel fabrication of grills, gates, shutters and sheds",
    sector: "manufacturing",
    capitalItems: [
      m("Welding machines", 35000, 2),
      m("Metal cutting machine", 25000),
      m("Bending and shearing machine", 120000),
      m("Drill machine, grinders and tools", 50000),
      m("Compressor and spray painting set", 30000),
      asset("electrical", "Electrical wiring and three-phase connection", 40000),
      asset("preliminary", "Registration and pre-operative expenses", 10000),
    ],
    products: [{ name: "Fabricated steel items (grills, gates, shutters, sheds)", unit: "kg", capacity: 60000, price: 115 }],
    rawMaterials: [
      { name: "MS steel (angles, pipes, sheets)", unit: "kg", quantity: 62000, rate: 65 },
      { name: "Electrodes, paint and consumables", unit: "lot", quantity: 1, rate: 400000 },
    ],
    staff: [direct("Welder / fabricator", 2, 15000), direct("Helper", 2, 9000)],
    overheads: [
      cost("Electricity", 10000, true, true),
      cost("Rent", 5000, false, false),
      cost("Transport", 4000, true, false),
      cost("Telephone and sundry", 1000, false, false),
    ],
    rawMaterialDays: 20,
    finishedGoodsDays: 10,
    debtorDays: 25,
    creditorDays: 15,
    text: {
      market:
        "Construction of houses, shops and farm sheds creates steady demand for grills, gates, shutters, railings and sheds. Builders and households prefer a nearby fabricator who can measure, make and install quickly.",
      process: "Steel sections are measured, cut, bent and welded to design, ground, primed and painted, then installed at site.",
      machinery: "Welding machines, cutting, bending and shearing machines, drills, grinders and a spray painting set.",
      rawMaterialSource: "MS steel angles, pipes and sheets are available from steel traders in the district.",
      marketing: "Orders from builders, contractors, households and farmers; display of samples and word of mouth.",
      licences: [...COMMON_LICENCES, "Electricity connection (industrial load)"],
      risks: [["Steel price volatility", "Quotes linked to steel rates; advance on orders."], ["Workplace safety", "Safety gear and training."]],
      swot: {
        strengths: ["Order-based production", "Construction-linked demand"],
        weaknesses: ["Working capital for steel stock"],
        opportunities: ["Prefabricated sheds", "Government construction work"],
        threats: ["Steel price swings"],
      },
    },
  },
  {
    id: "namkeen",
    label: "Namkeen aur snacks",
    activity: "manufacturing and packing of namkeen and snacks",
    sector: "manufacturing",
    capitalItems: [
      m("Continuous / batch fryer", 120000),
      m("Dough mixer / kneader", 80000),
      m("Namkeen (sev / bhujia) making machine", 100000),
      m("Automatic pouch packing machine", 200000),
      m("Weighing scales and sealers", 20000),
      asset("electrical", "Electrical and gas installation", 40000),
      asset("furniture", "Tables, racks and storage", 30000),
      asset("preliminary", "Registration and pre-operative expenses", 15000),
    ],
    products: [{ name: "Packed namkeen and snacks", unit: "kg", capacity: 30000, price: 200 }],
    rawMaterials: [
      { name: "Besan (gram flour)", unit: "kg", quantity: 18000, rate: 85 },
      { name: "Edible oil", unit: "kg", quantity: 9000, rate: 140 },
      { name: "Spices, pulses, peanuts and others", unit: "lot", quantity: 1, rate: 400000 },
    ],
    staff: [direct("Halwai / karigar", 2, 13000), direct("Helper", 3, 9000), office("Salesman", 1, 10000)],
    overheads: [
      cost("Gas / fuel", 20000, true, true),
      cost("Packing material", 25000, true, true),
      cost("Electricity", 6000, true, true),
      cost("Transport and marketing", 8000, true, false),
      cost("Office and telephone", 1500, false, false),
    ],
    rawMaterialDays: 20,
    finishedGoodsDays: 10,
    debtorDays: 20,
    creditorDays: 15,
    text: {
      market:
        "Namkeen and snacks are bought daily by households, tea stalls and shops, with strong festival demand. Local brands compete well on taste and freshness in the towns and villages they can reach every week.",
      process: "Besan dough is prepared with spices, extruded or shaped, fried in the fryer, cooled, seasoned and packed in pouches of different sizes.",
      machinery: "Fryer, dough kneader, namkeen making machine, automatic pouch packing machine and sealers.",
      rawMaterialSource: "Besan, oil, spices and peanuts are available from local wholesalers.",
      marketing: "Distributors and route sales to kirana shops and tea stalls, with festival packs.",
      licences: [...COMMON_LICENCES, "FSSAI licence", "Legal Metrology registration for packed commodities"],
      risks: [["Oil price changes", "Price revision and pack-size management."], ["Shelf life", "Proper packing and stock rotation."]],
      swot: {
        strengths: ["Fast-moving product", "Good margins"],
        weaknesses: ["Brand building needed"],
        opportunities: ["Festival gift packs", "New snack varieties"],
        threats: ["Large snack brands"],
      },
    },
  },
  {
    id: "flex-printing",
    label: "Flex printing aur digital printing",
    activity: "flex, vinyl and digital printing services",
    sector: "service",
    capitalItems: [
      m("Flex printing machine (10 ft)", 600000),
      m("Lamination machine", 80000),
      asset("computer", "Designing computer with software", 80000),
      m("Cutting plotter, eyelet machine and tools", 30000),
      asset("furniture", "Office and work tables", 60000),
      asset("electrical", "Electrical and inverter", 40000),
      asset("preliminary", "Registration and pre-operative expenses", 10000),
    ],
    products: [
      { name: "Flex printing", unit: "sq ft", capacity: 150000, price: 18 },
      { name: "Vinyl, visiting cards and other printing", unit: "lot", capacity: 1, price: 600000 },
    ],
    rawMaterials: [
      { name: "Flex media", unit: "sq ft", quantity: 160000, rate: 6 },
      { name: "Inks and vinyl", unit: "lot", quantity: 1, rate: 240000 },
    ],
    staff: [direct("Machine operator", 1, 12000), direct("Designer", 1, 12000), office("Helper / delivery", 1, 8000)],
    overheads: [
      cost("Electricity", 8000, true, true),
      cost("Rent", 6000, false, false),
      cost("Repairs and maintenance", 2000, false, true),
      cost("Marketing", 2000, false, false),
    ],
    rawMaterialDays: 20,
    finishedGoodsDays: 0,
    debtorDays: 20,
    creditorDays: 15,
    text: {
      market:
        "Flex banners and hoardings are used by shops, schools, coaching centres, political parties and event organisers, with peaks during elections, festivals and admissions. Quick local turnaround is the key buying factor.",
      process: "Designs are prepared on the computer, printed on flex/vinyl, laminated where required, finished with eyelets and delivered or installed.",
      machinery: "A 10 ft flex printing machine, lamination machine, designing computer, cutting plotter and tools.",
      rawMaterialSource: "Flex media, inks and vinyl are available from distributors in Lucknow, Kanpur and Delhi.",
      marketing: "Contacts with shops, schools and event organisers, quick delivery and design support.",
      licences: [...COMMON_LICENCES, "Shop and establishment registration"],
      risks: [["Seasonal demand", "Diversified customers."], ["Machine breakdown", "AMC with supplier."]],
      swot: {
        strengths: ["Fast turnaround", "Wide customer base"],
        weaknesses: ["Machine dependence"],
        opportunities: ["Election and event seasons", "Signage boards"],
        threats: ["Price competition"],
      },
    },
  },
];

const HAND_BUILT_GROUP: Record<string, ActivityGroup> = {
  "flour-mill": "food",
  "oil-mill": "food",
  masala: "food",
  bakery: "food",
  dairy: "food",
  namkeen: "food",
  garments: "textile",
  furniture: "engineering",
  fabrication: "engineering",
  "beauty-parlour": "personal",
  "mobile-repair": "repair",
  "computer-centre": "personal",
  "flex-printing": "paper",
  kirana: "trading",
};

/** Every business the form offers: the hand-built units first, then the wider list. */
export const TEMPLATES: ProjectTemplate[] = [
  ...HAND_BUILT.map((t) => ({ ...t, group: HAND_BUILT_GROUP[t.id] ?? (t.sector === "trading" ? "trading" : "repair"), notFor: [] })),
  ...BUILT_ACTIVITIES,
];

export { GROUP_LABELS };

export function templateById(id: string | null | undefined) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Scale a template unit by a factor: machinery value, capacity and material grow with it; fixed costs more slowly. */
function scaled(template: ProjectTemplate, f: number, staffFactor = f): Pick<DprInput, "capitalItems" | "products" | "rawMaterials" | "staff" | "overheads"> {
  const r = (v: number) => Math.round(v);
  const root = Math.sqrt(f);
  const staffRoot = Math.sqrt(staffFactor);
  return {
    capitalItems: template.capitalItems.map((item) => ({ ...item, rate: item.kind === "preliminary" ? r(item.rate * root) : r(item.rate * f) })),
    products: template.products.map((p) => (p.unit === "lot" ? { ...p, price: r(p.price * f) } : { ...p, capacity: r(p.capacity * f) })),
    rawMaterials: template.rawMaterials.map((mat) => (mat.unit === "lot" ? { ...mat, rate: r(mat.rate * f) } : { ...mat, quantity: r(mat.quantity * f) })),
    // In a smaller unit the promoter does the office work himself, so office staff may drop to none.
    staff: template.staff
      .map((s) => ({ ...s, count: s.direct ? Math.max(1, Math.round(s.count * staffFactor)) : Math.round(s.count * (staffFactor < 1 ? staffFactor : staffRoot)) }))
      .filter((s) => s.count > 0),
    overheads: template.overheads.map((o) => ({ ...o, monthly: r(o.monthly * (o.variable ? f : root)) })),
  };
}

/** Change the volume of trade (sales, the material it uses and the running costs that move with it) by a factor. */
function withVolume(unit: ReturnType<typeof scaled>, v: number): ReturnType<typeof scaled> {
  if (v === 1) return unit;
  const r = (x: number) => Math.max(1, Math.round(x));
  return {
    ...unit,
    products: unit.products.map((p) => (p.unit === "lot" ? { ...p, price: r(p.price * v) } : { ...p, capacity: r(p.capacity * v) })),
    rawMaterials: unit.rawMaterials.map((mat) => (mat.unit === "lot" ? { ...mat, rate: r(mat.rate * v) } : { ...mat, quantity: r(mat.quantity * v) })),
    overheads: unit.overheads.map((o) => (o.variable ? { ...o, monthly: Math.round(o.monthly * v) } : o)),
  };
}

/**
 * What a quick DPR must show to read as bankable without looking inflated:
 * profit and positive cash in every year, a minimum DSCR of 1.4 and an
 * average of at least 2.0, but not above 3.5.
 */
export const DSCR_BAND = { minimum: 1.4, averageAtLeast: 2.0, averageAtMost: 3.5 } as const;

function bankable(report: ReturnType<typeof buildDpr>) {
  return (
    report.years.every((y) => y.netProfit >= 0 && y.cash >= 0) &&
    (report.minimumDscr ?? 0) >= DSCR_BAND.minimum &&
    (report.averageDscr ?? 0) >= DSCR_BAND.averageAtLeast
  );
}

/**
 * Apply a template to a DPR, sized so the project cost comes out at the
 * amount given. Business and promoter details already typed are kept.
 *
 * Machinery and capacity scale with the cost, but staff and fixed costs do
 * not scale in proportion, so a very small or very large unit can come out
 * weak or unrealistically strong. When that happens the volume of trade is
 * set to the lowest level at which the project is bankable (see
 * DSCR_BAND), and the size refitted to the cost.
 */
export function applyTemplate(input: DprInput, templateId: string, projectCost: number, buildTotal: (input: DprInput) => number = (i) => buildDpr(i).cost.total): DprInput {
  const template = templateById(templateId);
  if (!template) return input;
  const base: DprInput = {
    ...input,
    templateId,
    activity: input.activity || template.activity,
    sector: template.sector,
    rawMaterialDays: template.rawMaterialDays,
    finishedGoodsDays: template.finishedGoodsDays,
    debtorDays: template.debtorDays,
    creditorDays: template.creditorDays,
    narrative: {},
  };
  // Staff are counted once, from the size at the template's own volume, so that adjusting
  // the volume below does not make a worker appear or vanish and the figures jump.
  // Running-cost heads the template does not carry (rent on rented premises, insurance,
  // professional fees…) are added as marked estimates, so the projections never leave them out.
  const composeWith = (staff: number | null) => (f: number, v: number) => withEstimatedCosts({ ...base, ...withVolume(scaled(template, f, staff ?? f), v) });
  // Project cost is close to linear in the size factor; three passes settle it to the rupee range.
  const fitWith = (build: (f: number, v: number) => DprInput) => (v: number) => {
    let f = 1;
    if (projectCost > 0) {
      for (let pass = 0; pass < 3; pass += 1) {
        const total = buildTotal(build(f, v));
        if (total <= 0) break;
        f = f * (projectCost / total);
      }
    }
    return f;
  };
  const staffFactor = fitWith(composeWith(null))(1);
  const compose = composeWith(staffFactor);
  const fit = fitWith(compose);

  let v = 1;
  let f = staffFactor;
  const at = (volume: number) => {
    const size = fit(volume);
    return { size, report: buildDpr(compose(size, volume)) };
  };
  const start = at(v);
  if (!bankable(start.report) || (start.report.averageDscr ?? 0) > DSCR_BAND.averageAtMost) {
    // The smallest volume that is bankable. Bankability rises with volume, though not
    // perfectly smoothly (staff counts round), so walk up in small steps and then refine.
    let best: { volume: number; size: number } | null = null;
    let below = 0.1;
    for (let volume = 0.12; volume <= 10; volume *= 1.06) {
      const probe = at(volume);
      if (bankable(probe.report)) {
        best = { volume, size: probe.size };
        break;
      }
      below = volume;
    }
    if (best) {
      let lo = below;
      let hi = best.volume;
      for (let step = 0; step < 8; step += 1) {
        const mid = (lo + hi) / 2;
        const probe = at(mid);
        if (bankable(probe.report)) {
          best = { volume: mid, size: probe.size };
          hi = mid;
        } else lo = mid;
      }
    }
    if (best) {
      // A touch above the edge, so rounding in the form does not tip it over.
      v = best.volume * 1.03;
      f = fit(v);
    }
  } else f = start.size;
  const unit = compose(f, v);
  return { ...unit, activity: input.activity && input.templateId === templateId ? input.activity : template.activity };
}
