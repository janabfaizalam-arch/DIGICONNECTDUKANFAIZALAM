import "server-only";

import nodemailer from "nodemailer";

/**
 * Plain SMTP mail, for the few emails the app itself sends (a DC Partner's
 * password reset link). Works with a Gmail account and an App Password:
 *
 *   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
 *   SMTP_USER=<gmail address>  SMTP_PASS=<16 letter App Password>
 *   SMTP_FROM="DigiConnect Dukan <gmail address>"   (optional)
 *
 * Returns false without throwing when mail is not configured or the server
 * refuses, so a caller can say so instead of failing the request.
 */
export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(message: { to: string; subject: string; text: string; html: string }) {
  if (!smtpConfigured()) {
    console.error("[smtp] not_configured");
    return false;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...message });
    return true;
  } catch (error) {
    console.error("[smtp] send_failed", { message: error instanceof Error ? error.message : "unknown" });
    return false;
  }
}
