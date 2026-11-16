export type PartnerRow = {
  id: string;
  user_id: string | null;
  mobile: string | null;
  username: string | null;
  full_name: string | null;
  status: string | null;
  created_at: string | null;
};

/**
 * When two partner records share one mobile number, which one is the partner.
 *
 * This happens: the same person gets onboarded twice, once as a draft that was
 * abandoned and once properly, and both rows keep the same number. Only one of
 * them can own the number as a login, because the login route resolves a
 * username to exactly one account.
 *
 * The first run of this gave the number to whichever row was created first,
 * which in every real case on this system was the wrong one -- an empty or
 * draft record, while the row that had actually filed applications was refused
 * and left unable to sign in at all.
 *
 * So the number follows the work: the record with applications wins, then an
 * active record over a draft, then the most recent. The loser is not deleted
 * and its data is untouched; it simply stops answering to the number.
 */
export function pickNumberOwner(rows: PartnerRow[], applications: Map<string, number>): PartnerRow {
  return [...rows].sort((a, b) => {
    const work = (applications.get(b.id) ?? 0) - (applications.get(a.id) ?? 0);
    if (work !== 0) return work;

    const live = (b.status === "active" ? 1 : 0) - (a.status === "active" ? 1 : 0);
    if (live !== 0) return live;

    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  })[0];
}

