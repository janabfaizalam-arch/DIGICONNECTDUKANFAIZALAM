import { permanentRedirect } from "next/navigation";
import { ITR_LANDING_PATH } from "@/lib/itr/constants";

export default function IncomeTaxReturnFilingAliasPage() {
  permanentRedirect(ITR_LANDING_PATH);
}
