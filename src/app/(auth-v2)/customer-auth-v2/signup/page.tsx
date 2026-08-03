import { redirect } from "next/navigation";

/** Legacy Auth V2 signup retired — single canonical flow at /customer/signup. */
export default function CustomerAuthV2SignupRedirect() {
  redirect("/customer/signup");
}
