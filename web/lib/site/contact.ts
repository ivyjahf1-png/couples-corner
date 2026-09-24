/**
 * Public support contact details — ONE source of truth for the whole app.
 *
 * No personal address, phone number or developer inbox is hardcoded anywhere.
 * Generic, brand-owned placeholders ship by default, and a deployment can
 * override either value through public environment variables (NEXT_PUBLIC_* so
 * the same value inlines into server and client bundles):
 *
 *   NEXT_PUBLIC_SUPPORT_EMAIL     → e.g. support@your-domain.com
 *   NEXT_PUBLIC_SUPPORT_WHATSAPP  → digits only, e.g. 15550100123
 *
 * When no WhatsApp number is configured the WhatsApp channel is simply not
 * rendered, so a placeholder phone number never reaches a visitor.
 */

const emailOverride = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const whatsappOverride = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

/** Brand support inbox (generic placeholder unless overridden by env). */
export const SUPPORT_EMAIL: string =
  emailOverride?.trim() || "support@couplescorner.com";

/** Digits-only WhatsApp number, or "" when no channel is configured. */
export const SUPPORT_WHATSAPP_DIGITS: string = (whatsappOverride ?? "").replace(/[^0-9]/g, "");

/** True when a WhatsApp support channel is configured for this deployment. */
export const HAS_WHATSAPP_SUPPORT: boolean = SUPPORT_WHATSAPP_DIGITS.length > 0;

/** wa.me deep link for the configured number ("" when unconfigured). */
export const SUPPORT_WHATSAPP_URL: string = HAS_WHATSAPP_SUPPORT
  ? `https://wa.me/${SUPPORT_WHATSAPP_DIGITS}`
  : "";

/** Display form of the configured number ("" when unconfigured). */
export const SUPPORT_WHATSAPP_DISPLAY: string = HAS_WHATSAPP_SUPPORT
  ? `+${SUPPORT_WHATSAPP_DIGITS}`
  : "";

/** mailto: link for the support inbox. */
export const SUPPORT_MAILTO: string = `mailto:${SUPPORT_EMAIL}`;
