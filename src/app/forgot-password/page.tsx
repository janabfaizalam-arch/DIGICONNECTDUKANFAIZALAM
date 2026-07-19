import { redirect } from "next/navigation";

/** Legacy customer email reset → single Forgot / Create PIN flow. */
export default function ForgotPasswordRedirectPage() {
  redirect("/customer/forgot-pin");
}
