import { validatePartnerApplication } from "@/lib/partner-applications";

/**
 * Checking one field in the browser, with the server's own rules.
 *
 * `validatePartnerApplication` is pure and does no I/O, so the form can run
 * the real rules instead of a second copy that drifts from them. It returns
 * the *first* failure, though, which is not what a blur handler needs: leaving
 * the mobile field while the name is still empty would report the name.
 *
 * So the field under test is dropped into a skeleton that is otherwise known
 * to be valid, and the answer is kept only when it is about that field. If a
 * new required field is ever added and the skeleton stops being valid, the
 * worst that happens is blur checks go quiet — the real check still runs on
 * submit, and `partner-application-validation.test.ts` fails the build.
 */

export type ApplicationFields = {
  fullName: string;
  businessName: string;
  mobile: string;
  email: string;
  district: string;
  state: string;
  pin: string;
  password: string;
};

/** Placeholder answers that pass every rule, used only as a backdrop. */
export const VALID_SKELETON: ApplicationFields = {
  fullName: "Valid Name",
  businessName: "Valid Business",
  mobile: "9000000000",
  email: "valid@gmail.com",
  district: "",
  state: "",
  pin: "285001",
  password: "validpass1",
};

/**
 * The error for one field, or null.
 */
export function errorForField(
  field: keyof ApplicationFields,
  form: ApplicationFields,
): string | null {
  const probe = { ...VALID_SKELETON, [field]: form[field] };

  const result = validatePartnerApplication(probe);
  if (result.ok) return null;
  return result.field === field ? result.error : null;
}

/** The first thing wrong with the whole form, as the server would see it. */
export function firstError(
  form: ApplicationFields,
): { field: keyof ApplicationFields; message: string } | null {
  const result = validatePartnerApplication(form);
  if (result.ok) return null;
  return { field: result.field as keyof ApplicationFields, message: result.error };
}
