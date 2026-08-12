import { redirect } from "next/navigation";

/** Retired PIN/OTP customer auth — kept so existing links and bookmarks land on the new flow. */
export default function Page() {
  redirect("/customer/login");
}
