/**
 * The questions a customer actually asks at the counter.
 *
 * Every answer is drawn from the scheme dataset the site owner supplied — no
 * figure appears here that is not also on a scheme record, and where the owner
 * could not verify something (the student cycle amount, Atal Awasiya admission
 * dates), the answer says so instead of filling the gap.
 *
 * The awkward answers are here on purpose. "Does a Labour Card guarantee every
 * benefit?" and "Is the FD cash?" are the two misunderstandings that send
 * people home disappointed, so they are answered plainly rather than softened.
 */

export type LabourFaq = { question: string; answer: string };

export const LABOUR_FAQS: LabourFaq[] = [
  {
    question: "Labour Card kya hai?",
    answer:
      "Uttar Pradesh Building and Other Construction Workers Welfare Board (UPBOCW) nirman shramikon ka registration karta hai. Us registration ka card hi aam bhasha mein Labour Card ya Shram Card hai. Isi ke aadhar par Board ki welfare yojanaon mein aavedan hota hai.",
  },
  {
    question: "Kya Labour Card hone se har scheme ka paisa apne aap mil jata hai?",
    answer:
      "Nahi. Ye sabse badi galatfehmi hai. Card sirf registration ka proof hai. Har yojana ki apni shartein hain — membership kitne saal purani hai, pichhle 12 mahine mein 90 din kaam kiya ya nahi, kitne bachche hain, umar kya hai, aur apply karne ki samay seema. Har yojana ke liye alag aavedan karna hota hai.",
  },
  {
    question: "Beti paida hone par kitna milta hai?",
    answer:
      "Dataset ke mutabik ladki paida hone par ₹25,000 nakad, aur alag se ₹25,000 ki fixed deposit (FD) — jab pehla bachcha beti ho ya doosra bachcha bhi beti ho. Janm se divyang beti ke liye FD ₹50,000 hai. Ye dono alag cheezen hain.",
  },
  {
    question: "Kya ₹25,000 cash aur ₹25,000 FD milakar ₹50,000 cash ho jata hai?",
    answer:
      "Nahi. Cash bank account mein aata hai. FD beti ke naam ka alag instrument hai jo turant nahi milta — shart ye hai ki beti 18 saal tak ashadi rahe. Inhe jodkar ₹50,000 nakad samajhna sabse aam galti hai.",
  },
  {
    question: "Ladka paida hone par kitna milta hai?",
    answer: "Dataset ke mutabik ₹20,000 ek baar, pehle do bachchon tak.",
  },
  {
    question: "Maternity benefit kitna hai?",
    answer:
      "Registered purush worker ko ₹6,000 ek baar. Registered mahila worker ko 3 mahine ki minimum wage ke barabar + ₹1,000 medical bonus — iske liye sarkari sansthan mein delivery (institutional delivery) zaroori hai.",
  },
  {
    question: "Education ka ₹2,000 har saal milta hai kya?",
    answer:
      "Nahi. Jis official jankari par ye page bana hai, usme ye ONE-TIME batayi gayi hai — har saal nahi. Bahut si websites ise annual likh deti hain. Class 1–5 ₹2,000, class 6–10 ₹2,500, class 11–12 ₹3,000 — sab ek baar.",
  },
  {
    question: "Graduation aur PG par kitna milta hai?",
    answer:
      "Graduation ya samkaksh par ₹12,000, ITI/Polytechnic/Vocational par bhi ₹12,000, aur Post-Graduation par ₹24,000 — ek baar. Professional degree courses mein di gayi fees ya ₹60,000, jo kam ho, wo reimbursement ke roop mein.",
  },
  {
    question: "Merit par extra paisa milta hai?",
    answer:
      "Haan. High School/Intermediate mein 70% marks aur agli class mein admission par ladke ko ₹5,000 aur ladki ko ₹8,000 extra. Graduation/PG mein 60% par ladke ko ₹10,000 aur ladki ko ₹12,000 extra — PG exam ke liye agli class admission wali shart lagu nahi.",
  },
  {
    question: "Cycle kitne ki milti hai?",
    answer:
      "Class 9, 10, 11 ya 12 paas karke agli class mein padhai jaari rakhne wale bachche ko cycle kharidne ki madad milti hai, aur sirf ek baar. Iski exact rakam humne verify nahi ki hai — isliye is page par koi number nahi likha gaya. Latest official notification dekhiye.",
  },
  {
    question: "Beti ki shaadi par kitna paisa milta hai?",
    answer:
      "Samanya vivah par ₹65,000, antarjatiya vivah par ₹75,000, aur samuhik vivah mein prati beti ₹85,000. Samuhik vivah ke liye ek jagah kam se kam 11 jode zaroori hain.",
  },
  {
    question: "Shaadi ke kitne din baad tak apply kar sakte hain?",
    answer:
      "Shaadi ke 1 saal ke andar. Samuhik vivah ke liye 15 din pehle aavedan karna hota hai. Samay seema nikal jana rejection ki sabse aam wajah hai.",
  },
  {
    question: "Shaadi ki sahayata ke liye beti aur ladke ki umar kya honi chahiye?",
    answer: "Beti ki umar kam se kam 18 saal aur ladke ki kam se kam 21 saal.",
  },
  {
    question: "90 din kaam ki shart kya hai?",
    answer:
      "Kai yojanaon mein — jaise kanya vivah sahayata — pichhle 12 mahine mein kam se kam 90 din nirman kaam kiya hona zaroori hai. Ye shart adhoori rehne par aavedan nirast ho jata hai.",
  },
  {
    question: "365 din membership ka matlab kya hai?",
    answer:
      "Registration ho jane ke baad Board ki membership kam se kam 365 din purani honi chahiye. Naye registration par turant har yojana lagu nahi hoti.",
  },
  {
    question: "Divyangta par kitna milta hai, aur kya wo ek saath milta hai?",
    answer:
      "Ek saath nahi. 100% sthayi divyangta par ₹4,00,000, 50% se zyada par ₹3,00,000, aur 25% se zyada par ₹2,00,000 — par ye mool dhan hai jispar byaj lagta hai aur bhugtan mahine ki kisht mein hota hai. Page par diye gaye monthly figures udaharan hain; byaj dar badalne par kisht badal jati hai.",
  },
  {
    question: "Mrityu par kitni sahayata milti hai?",
    answer:
      "Durghatna mein mrityu par ₹5,00,000 mool dhan + byaj, aur samanya mrityu par ₹2,00,000 mool dhan + byaj — dono mahine ki kisht mein. Dono ke saath ₹25,000 antim sanskar sahayata alag se hai. Apanjikrit worker ki kaam par durghatna mrityu par ₹1,00,000 ek baar, nirdharit shart ke antargat.",
  },
  {
    question: "Antim Sanskar Sahayata aur Mrityu Sahayata mein kya farak hai?",
    answer:
      "Antim sanskar sahayata ₹25,000 hai, turant kharch ke liye, ek baar mein. Mrityu sahayata bahut badi rakam hai par wo mool dhan + byaj ke roop mein mahine ki kisht mein aati hai. Ye do alag bhugtan hain.",
  },
  {
    question: "Aatmahatya ke case mein mrityu sahayata milti hai?",
    answer: "Maujuda shart ke mutabik nahi milti.",
  },
  {
    question: "Medical mein kitna reimbursement milta hai?",
    answer:
      "Gambhir bimari sahayata mein official jankari ke mutabik koi adhiktam rakam tay nahi hai — sarkari, swayatt ya SACHIS-empanelled aspatal mein Ayushman Bharat ke niyamon ke barabar reimbursement. Par shartein hain: worker PMJAY/CMJAY ka patra na ho, aur original bill zaroori hain.",
  },
  {
    question: "Kya saara medical kharch hamesha free hai?",
    answer:
      "Nahi. Aspatal ki shart hai, bimari ki shart hai, doctor certificate nirdharit format mein chahiye aur original bill lagte hain.",
  },
  {
    question: "Pension kab se aur kitni milti hai?",
    answer:
      "60 saal ki umar ke baad ₹1,000 prati mah, har 2 saal mein ₹50 ki badhotri ke saath, adhiktam ₹1,250. Iske liye kam se kam 10 saal ka registration zaroori hai aur har April mein jeevan praman patra dena hota hai.",
  },
  {
    question: "Shauchalay ke liye kitna milta hai?",
    answer:
      "₹12,000, do kishton mein — ₹6,000 pehle aur ₹6,000 nirman poora hone aur shauchalay ka istemal shuru hone ke baad. Chayan Zila Panchayati Raj Adhikari ke through baseline survey se hota hai.",
  },
  {
    question: "Skill training ke liye kya lagta hai?",
    answer:
      "UP Skill Development Mission ke through muft training. Worker khud training le to umar 18–35 saal, aur usse akushal worker ki minimum wage ke barabar reimbursement bhi milta hai. Training ke baad assessment exam dena zaroori hai.",
  },
  {
    question: "Atal Awasiya Vidyalaya mein kaun apply kar sakta hai?",
    answer:
      "Anath bachche, aur aise registered worker ke bachche jinki registration ke baad kam se kam 5 saal Board membership ho — adhiktam 2 bachche. Chayan entrance exam aur merit se hota hai. Ek school mein 1,000 seat hoti hain (500 ladke, 500 ladkiyan). Admission ki umar, class aur tareekhein humne yahan nahi likhi — current official notification dekhiye.",
  },
  {
    question: "Aawasiya Vidyalaya Yojana Atal Awasiya se alag hai?",
    answer:
      "Haan. Aawasiya Vidyalaya Yojana 6–14 saal ke bachchon ke liye hai aur official jankari ke mutabik filhal 12 zilon mein chal rahi hai, jise Atal Awasiya Vidyalaya shuru hone ke baad usme milaya jana hai.",
  },
  {
    question: "Aapda rahat mein ₹1,000 guaranteed milta hai?",
    answer:
      "Nahi. Official district page isko COVID-19 ke sandarbh mein banayi gayi scheme batata hai. Iska aaj lagu hona aur bhugtan sarkar/Board ke maujuda nirdeshon par nirbhar hai. Ise 'baadh ya aag par ₹1,000 pakka' samajhna galat hai.",
  },
  {
    question: "Chetna Yojana mein kitna paisa milta hai?",
    answer:
      "Isme kisi worker ko seedha paisa nahi milta. Ye jagrukta ka programme hai — SMS, camp, pamphlet, nukkad natak waghera ke through yojanaon ki jankari failane ke liye.",
  },
  {
    question: "PM Shram Yogi Maan-dhan bhi Labour Card se milta hai?",
    answer:
      "Wo Labour Department ke page par listed hai par UPBOCW ki apni cash scheme nahi hai. Uski patrata aur rakam us programme ke apne niyamon se tay hoti hai.",
  },
  {
    question: "Kitne bachchon tak benefit milta hai?",
    answer:
      "Zyadatar yojanaon mein adhiktam 2 bachche — jaise shiksha, kanya vivah aur bachche/maternity se judi sahayata. Teesre bachche ke liye aavedan aam taur par nirast ho jata hai.",
  },
  {
    question: "Card renew karana zaroori hai?",
    answer:
      "Haan. Bahut si yojanayein 'updated registration' maangti hain. Card lapse hone par aavedan nirast ho sakta hai, isliye renewal samay par karwa lena chahiye.",
  },
  {
    question: "Application reject kyun hoti hai?",
    answer:
      "Sabse aam wajahein: card inactive, membership ki avadhi puri na hona, 90 din kaam ki shart adhoori, bank detail ya Aadhaar ka mismatch, adhoore documents, samay seema ke baad aavedan, aur bachche ya shaadi ki galat detail.",
  },
  {
    question: "Kya DigiConnect Dukan approval dila sakta hai?",
    answer:
      "Nahi. Hum ek private digital service centre hain. Hum documents check karne, form bharne, upload karne, status dekhne aur correction mein assistance dete hain. Manzoori ka faisla sirf sambandhit vibhag karta hai.",
  },
  {
    question: "Kya DigiConnect Dukan sarkari agent hai?",
    answer:
      "Nahi. Hum kisi sarkari vibhag ke authorised ya official agent nahi hain. Hum ek private assistance provider hain.",
  },
  {
    question: "Is page par diye gaye amount pakke hain?",
    answer:
      "Ye jankari site owner dwara di gayi hai aur har scheme par uski verification date likhi hai. Sarkari niyam aur rakam samay-samay par badalte hain — isliye aavedan se pehle latest official notification zaroor dekh lijiye. Jahan hum verify nahi kar paye, wahan humne saaf likh diya hai.",
  },
];
