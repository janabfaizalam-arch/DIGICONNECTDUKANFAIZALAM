import { asRecord, getCustomerMobile, getCustomerName } from "@/lib/crm";
import type { Application } from "@/lib/portal-types";

type NullableText = string | null | undefined;

export type AdminIdentitySourceRow = {
  id?: NullableText;
  user_id?: NullableText;
  full_name?: NullableText;
  email?: NullableText;
  mobile?: NullableText;
  phone?: NullableText;
  mobile_number?: NullableText;
  pincode?: NullableText;
  city?: NullableText;
  state?: NullableText;
  address?: NullableText;
  created_at?: NullableText;
  user_metadata?: {
    full_name?: NullableText;
    name?: NullableText;
    mobile?: NullableText;
    phone?: NullableText;
    pincode?: NullableText;
    city?: NullableText;
    state?: NullableText;
  };
};

export type ResolvedAdminCustomerIdentity = {
  userId: string | null;
  customerId: string | null;
  name: string;
  mobile: string;
  email: string;
  pincode: string;
  city: string;
  state: string;
  address: string;
  createdAt: string | null;
  sources: string[];
};

function firstText(...values: NullableText[]) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) ?? "";
}

export function normalizeAdminMobile(value: NullableText) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function getApplicationCustomerIdentity(application: Application): ResolvedAdminCustomerIdentity {
  const formData = asRecord(application.form_data);
  const customerDetails = asRecord(application.customer_details);

  return {
    userId: application.user_id ?? null,
    customerId: application.customer_id ?? null,
    name: firstText(
      String(customerDetails.name ?? ""),
      getCustomerName(application),
      String(formData.name ?? ""),
      String(formData.fullName ?? ""),
      application.customers?.full_name,
    ),
    mobile: normalizeAdminMobile(
      firstText(
        String(customerDetails.mobile ?? ""),
        application.customer_mobile,
        getCustomerMobile(application),
        String(formData.mobile ?? ""),
        String(formData.phone ?? ""),
        application.customers?.mobile,
      ),
    ),
    email: firstText(String(customerDetails.email ?? ""), application.customer_email, String(formData.email ?? ""), application.customers?.email),
    pincode: firstText(String(customerDetails.pincode ?? ""), String(formData.pincode ?? ""), application.customers?.pincode),
    city: firstText(String(customerDetails.city ?? ""), String(formData.city ?? ""), application.customers?.city),
    state: firstText(String(customerDetails.state ?? ""), String(formData.state ?? ""), application.customers?.state),
    address: firstText(String(customerDetails.address ?? ""), String(formData.address ?? ""), application.customers?.address),
    createdAt: application.created_at ?? null,
    sources: ["application"],
  };
}

export function resolveAdminCustomerIdentity({
  userId,
  customerId,
  profile,
  customer,
  customerProfile,
  authUser,
  latestApplication,
}: {
  userId?: NullableText;
  customerId?: NullableText;
  profile?: AdminIdentitySourceRow | null;
  customer?: AdminIdentitySourceRow | null;
  customerProfile?: AdminIdentitySourceRow | null;
  authUser?: AdminIdentitySourceRow | null;
  latestApplication?: Application | null;
}): ResolvedAdminCustomerIdentity {
  const applicationIdentity = latestApplication ? getApplicationCustomerIdentity(latestApplication) : null;
  const sources = [
    profile ? "profiles" : "",
    customerProfile ? "customer_profiles" : "",
    customer ? "customers" : "",
    authUser ? "auth.users" : "",
    applicationIdentity ? "applications" : "",
  ].filter(Boolean);

  return {
    userId: firstText(userId, profile?.id, profile?.user_id, customerProfile?.user_id, customer?.user_id, authUser?.id, applicationIdentity?.userId) || null,
    customerId: firstText(customerId, customer?.id, applicationIdentity?.customerId) || null,
    name: firstText(
      profile?.full_name,
      customerProfile?.full_name,
      customer?.full_name,
      authUser?.user_metadata?.full_name,
      authUser?.user_metadata?.name,
      applicationIdentity?.name,
      profile?.email,
      customer?.email,
      authUser?.email,
    ),
    mobile: normalizeAdminMobile(
      firstText(
        authUser?.phone,
        profile?.mobile,
        profile?.phone,
        profile?.mobile_number,
        customerProfile?.mobile,
        customerProfile?.phone,
        customerProfile?.mobile_number,
        customer?.mobile,
        customer?.phone,
        customer?.mobile_number,
        authUser?.user_metadata?.mobile,
        authUser?.user_metadata?.phone,
        applicationIdentity?.mobile,
      ),
    ),
    email: firstText(profile?.email, customerProfile?.email, customer?.email, authUser?.email, applicationIdentity?.email),
    pincode: firstText(profile?.pincode, customerProfile?.pincode, customer?.pincode, authUser?.user_metadata?.pincode, applicationIdentity?.pincode),
    city: firstText(profile?.city, customerProfile?.city, customer?.city, authUser?.user_metadata?.city, applicationIdentity?.city),
    state: firstText(profile?.state, customerProfile?.state, customer?.state, authUser?.user_metadata?.state, applicationIdentity?.state),
    address: firstText(profile?.address, customerProfile?.address, customer?.address, applicationIdentity?.address),
    createdAt: firstText(profile?.created_at, customerProfile?.created_at, customer?.created_at, authUser?.created_at, applicationIdentity?.createdAt) || null,
    sources,
  };
}
