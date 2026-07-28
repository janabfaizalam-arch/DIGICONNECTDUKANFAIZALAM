import { redirect } from "next/navigation";

/** Legacy path — middleware also remaps; page redirect as belt-and-suspenders. */
export default async function LegacyCustomerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/customer/applications/${id}`);
}
