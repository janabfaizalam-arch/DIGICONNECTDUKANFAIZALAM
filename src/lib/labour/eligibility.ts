import type { LabourScheme } from "@/lib/labour/types";

/**
 * "Kya main eligible hoon?" — answered honestly.
 *
 * This is not an approval and the wording never pretends otherwise. It reads
 * the conditions already recorded against each scheme and sorts them into
 * three buckets: what the answers support, what is missing, and what nobody
 * asked about. The third bucket is the important one — a checker that returns
 * a confident yes while silently ignoring the conditions it never tested is
 * worse than no checker, because somebody will travel to a counter on it.
 *
 * Pure functions over a plain answer object, so the rules can be tested
 * without a browser and without a database.
 */

export type CheckerAnswers = {
  hasCard?: boolean;
  cardActive?: boolean;
  /** Whole years since registration. */
  membershipYears?: number;
  workedDaysLast12Months?: number;
  age?: number;
  childCount?: number;
  childAge?: number;
  childGender?: "girl" | "boy";
  disabilityPercent?: number;
  /** Days since the event the claim is about — marriage, birth, death. */
  daysSinceEvent?: number;
};

export type Verdict = "likely" | "condition_missing" | "needs_info" | "not_applicable";

export type SchemeCheck = {
  scheme: LabourScheme;
  verdict: Verdict;
  /** Conditions the answers satisfy. */
  met: string[];
  /** Conditions the answers fail. These are why an application gets rejected. */
  missing: string[];
  /** Conditions this checker did not test. Never silently dropped. */
  untested: string[];
};

const DAY = 1;

/**
 * The gate every UPBOCW benefit shares.
 *
 * No card, or a lapsed one, and nothing else on the page matters. Saying this
 * first — rather than listing twelve schemes and burying it — is the single
 * most useful thing the checker does.
 */
export function cardIsUsable(answers: CheckerAnswers): boolean {
  return answers.hasCard === true && answers.cardActive !== false;
}

export function checkScheme(scheme: LabourScheme, answers: CheckerAnswers): SchemeCheck {
  const met: string[] = [];
  const missing: string[] = [];
  const untested: string[] = [];
  const conditions = scheme.keyConditions;

  if (answers.hasCard === false) {
    return {
      scheme,
      verdict: "condition_missing",
      met: [],
      missing: ["Labour Card zaroori hai"],
      untested: [],
    };
  }
  if (answers.cardActive === false) {
    missing.push("Labour Card active/renewed hona chahiye");
  } else if (answers.cardActive === true) {
    met.push("Labour Card active hai");
  } else {
    untested.push("Card active hai ya nahi — bataya nahi gaya");
  }

  /* ── Membership ─────────────────────────────────────────────────────── */
  if (conditions.membershipDays) {
    const neededYears = conditions.membershipDays / 365;
    const label = `Registration ke baad ${
      neededYears >= 1 ? `${Math.round(neededYears)} saal` : `${conditions.membershipDays} din`
    } ki membership`;
    if (answers.membershipYears === undefined) untested.push(label);
    else if (answers.membershipYears * 365 >= conditions.membershipDays - DAY) met.push(label);
    else missing.push(label);
  }

  /* ── The 90-day work rule ───────────────────────────────────────────── */
  if (conditions.workDaysLast12Months) {
    const label = `Pichhle 12 mahine mein ${conditions.workDaysLast12Months} din nirman kaam`;
    if (answers.workedDaysLast12Months === undefined) untested.push(label);
    else if (answers.workedDaysLast12Months >= conditions.workDaysLast12Months) met.push(label);
    else missing.push(label);
  }

  /* ── Two-child limit ────────────────────────────────────────────────── */
  if (conditions.childLimit !== undefined) {
    const label = `Adhiktam ${conditions.childLimit} bachche`;
    if (answers.childCount === undefined) untested.push(label);
    else if (answers.childCount <= conditions.childLimit) met.push(label);
    else missing.push(`${label} — aapke ${answers.childCount} bachche bataye gaye`);
  }

  /* ── Age ────────────────────────────────────────────────────────────── */
  const ageSubject = scheme.category === "residential_education" ? answers.childAge : answers.age;
  const ageLabel = scheme.category === "residential_education" ? "Bachche ki umar" : "Umar";
  if (conditions.minAge !== undefined || conditions.maxAge !== undefined) {
    const range =
      conditions.minAge !== undefined && conditions.maxAge !== undefined
        ? `${conditions.minAge}–${conditions.maxAge} saal`
        : conditions.minAge !== undefined
          ? `${conditions.minAge} saal ya zyada`
          : `${conditions.maxAge} saal tak`;
    const label = `${ageLabel}: ${range}`;
    if (ageSubject === undefined) untested.push(label);
    else if (
      (conditions.minAge === undefined || ageSubject >= conditions.minAge) &&
      (conditions.maxAge === undefined || ageSubject <= conditions.maxAge)
    ) {
      met.push(label);
    } else missing.push(label);
  }

  /* ── Application window ─────────────────────────────────────────────── */
  if (conditions.applicationWindow) {
    const label = `Samay seema: ${conditions.applicationWindow}`;
    if (answers.daysSinceEvent === undefined) untested.push(label);
    else if (answers.daysSinceEvent <= 365) met.push(label);
    else missing.push(`${label} — bataya gaya samay nikal chuka lagta hai`);
  }

  /* ── Disability bands ───────────────────────────────────────────────── */
  if (scheme.category === "death" && answers.disabilityPercent !== undefined) {
    if (answers.disabilityPercent > 25) met.push(`Divyangta ${answers.disabilityPercent}%`);
    else missing.push("Divyangta 25% se zyada honi chahiye");
  }

  /*
    A scheme that pays nothing is not something to be "eligible" for. Saying
    "you qualify" for an awareness programme would be a promise of money that
    does not exist.
  */
  if (scheme.category === "awareness" || scheme.category === "linked") {
    return { scheme, verdict: "not_applicable", met, missing, untested };
  }

  const verdict: Verdict = missing.length
    ? "condition_missing"
    : untested.length
      ? "needs_info"
      : "likely";

  return { scheme, verdict, met, missing, untested };
}

export function runChecker(schemes: LabourScheme[], answers: CheckerAnswers): SchemeCheck[] {
  const order: Record<Verdict, number> = {
    likely: 0,
    needs_info: 1,
    condition_missing: 2,
    not_applicable: 3,
  };
  return schemes
    .filter((scheme) => scheme.published)
    .map((scheme) => checkScheme(scheme, answers))
    .sort((a, b) => order[a.verdict] - order[b.verdict] || a.scheme.sortOrder - b.scheme.sortOrder);
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  likely: "Sambhavit patra",
  needs_info: "Aur jankari chahiye",
  condition_missing: "Shart puri nahi",
  not_applicable: "Cash benefit nahi",
};

/**
 * The sentence that has to appear wherever a result is shown.
 *
 * The checker reads conditions off a dataset. The department reads documents
 * and decides. Those are not the same thing and the page must not blur them.
 */
export const CHECKER_DISCLAIMER =
  "Ye sirf ek margdarshan hai, sarkari manzoori nahi. Final eligibility UPBOCW ke niyam aur vibhag ke verification par nirbhar hai.";
