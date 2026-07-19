"use client";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";

export default function APLoginPage() {
  return (
    <UnifiedLoginExperience
      initialTab="partner"
      initialMode="login"
    />
  );
}
