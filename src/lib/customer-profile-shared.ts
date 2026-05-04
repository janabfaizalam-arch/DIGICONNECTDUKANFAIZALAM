export type CustomerProfile = {
  id: string;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  photo_url: string | null;
  profile_completed: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CustomerProfileFormValues = {
  full_name: string;
  mobile: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  photo_url: string;
};

const requiredCustomerProfileFields = ["full_name", "mobile", "email", "address", "city", "state", "pincode"] as const;

export function isCustomerProfileComplete(profile: Partial<CustomerProfile> | null | undefined) {
  if (!profile) {
    return false;
  }

  return requiredCustomerProfileFields.every((field) => String(profile[field] ?? "").trim().length > 0);
}

export function getCustomerProfileCompletion(profile: Partial<CustomerProfile> | null | undefined) {
  if (!profile) {
    return { completed: 0, total: requiredCustomerProfileFields.length, percent: 0 };
  }

  const completed = requiredCustomerProfileFields.filter((field) => String(profile[field] ?? "").trim().length > 0).length;
  const total = requiredCustomerProfileFields.length;

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
