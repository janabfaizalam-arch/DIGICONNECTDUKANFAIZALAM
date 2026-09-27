/**
 * The one list of WhatsApp templates this app sends through Meta.
 *
 * A template has to be created and APPROVED in WhatsApp Manager before Meta
 * delivers it; nothing here claims that it is. The registry says what the
 * code sends (name, language, how many body params, whether it has an OTP
 * button). Whether Meta has approved it is checked live with
 * `fetchMetaTemplateStatuses` (admin diagnostics), never assumed.
 *
 * Name and language can be overridden per template from the environment, so
 * a template approved under a different name (say `application_update_v2`,
 * or language `en_US`) needs no code change:
 *   WHATSAPP_TEMPLATE_<KEY>            e.g. WHATSAPP_TEMPLATE_LOGIN_OTP=login_code
 *   WHATSAPP_TEMPLATE_<KEY>_LANGUAGE   e.g. WHATSAPP_TEMPLATE_LOGIN_OTP_LANGUAGE=en_US
 *   META_WHATSAPP_TEMPLATE_LANGUAGE    default language for all (default "en")
 */

export const WHATSAPP_TEMPLATE_KEYS = ["application_update", "login_otp", "signup_otp", "password_reset"] as const;
export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export type WhatsAppTemplateDefinition = {
  key: WhatsAppTemplateKey;
  defaultName: string;
  category: "UTILITY" | "AUTHENTICATION";
  /** Number of {{n}} variables in the body, in order. */
  bodyParams: string[];
  /** Authentication templates carry the code on button 0 as well. */
  otpButton: boolean;
  /** Suggested body when creating it in WhatsApp Manager (UTILITY only). */
  suggestedBody?: string;
};

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, WhatsAppTemplateDefinition> = {
  application_update: {
    key: "application_update",
    defaultName: "application_update",
    category: "UTILITY",
    bodyParams: ["customerName", "serviceName", "applicationNumber", "detail"],
    otpButton: false,
    suggestedBody: "Namaste {{1}}, aapki {{2}} application ({{3}}) ka update: {{4}} — DigiConnect Dukan",
  },
  login_otp: {
    key: "login_otp",
    defaultName: "login_otp",
    category: "AUTHENTICATION",
    bodyParams: ["otp"],
    otpButton: true,
  },
  signup_otp: {
    key: "signup_otp",
    defaultName: "signup_otp",
    category: "AUTHENTICATION",
    bodyParams: ["otp"],
    otpButton: true,
  },
  password_reset: {
    key: "password_reset",
    defaultName: "password_reset",
    category: "AUTHENTICATION",
    bodyParams: ["otp"],
    otpButton: true,
  },
};

export const DEFAULT_TEMPLATE_LANGUAGE = "en";

function envName(key: string) {
  return `WHATSAPP_TEMPLATE_${key.toUpperCase()}`;
}

export type ResolvedTemplate = {
  key: WhatsAppTemplateKey;
  name: string;
  language: string;
  /** Which env var set the name, or "default". */
  nameSource: string;
  definition: WhatsAppTemplateDefinition;
};

export function resolveTemplate(key: WhatsAppTemplateKey, env: NodeJS.ProcessEnv = process.env): ResolvedTemplate {
  const definition = WHATSAPP_TEMPLATES[key];
  const nameEnv = env[envName(key)]?.trim();
  const language =
    env[`${envName(key)}_LANGUAGE`]?.trim() || env.META_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || DEFAULT_TEMPLATE_LANGUAGE;
  return {
    key,
    name: nameEnv || definition.defaultName,
    language,
    nameSource: nameEnv ? envName(key) : "default",
    definition,
  };
}

/**
 * Language for a template by its (possibly overridden) name — used when the
 * outbox only stored the name. Unknown names get the default language.
 */
export function resolveTemplateLanguage(templateName: string, env: NodeJS.ProcessEnv = process.env): string {
  for (const key of WHATSAPP_TEMPLATE_KEYS) {
    const resolved = resolveTemplate(key, env);
    if (resolved.name === templateName) return resolved.language;
  }
  return env.META_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || DEFAULT_TEMPLATE_LANGUAGE;
}

export type MetaTemplateStatus = {
  key: WhatsAppTemplateKey;
  name: string;
  language: string;
  category: string;
  /** APPROVED | PENDING | REJECTED | PAUSED | DISABLED … as Meta reports it, or MISSING. */
  status: string;
  sendable: boolean;
};

/**
 * Compare the registry with what Meta actually has for the WABA
 * (GET /{waba-id}/message_templates). Pure: takes Meta's rows.
 */
export function compareWithMetaTemplates(
  metaRows: Array<{ name?: string; language?: string; status?: string; category?: string }>,
  env: NodeJS.ProcessEnv = process.env,
): MetaTemplateStatus[] {
  return WHATSAPP_TEMPLATE_KEYS.map((key) => {
    const resolved = resolveTemplate(key, env);
    const row = metaRows.find((r) => r.name === resolved.name && r.language === resolved.language);
    const status = row?.status ? String(row.status).toUpperCase() : "MISSING";
    return {
      key,
      name: resolved.name,
      language: resolved.language,
      category: row?.category ? String(row.category).toUpperCase() : resolved.definition.category,
      status,
      sendable: status === "APPROVED",
    };
  });
}
