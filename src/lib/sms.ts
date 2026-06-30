// Shared SMS opt-in helpers. The consent text is the legal disclosure shown at
// opt-in and stored as proof (TCPA / carrier compliance).

export const SMS_CONSENT_TEXT =
  "By providing my phone number and checking this box, I agree to receive recurring automated marketing text messages from Homefront Markets at the number provided. Consent is not a condition of purchase. Msg & data rates may apply. Msg frequency varies. Reply STOP to unsubscribe, HELP for help.";

// Normalize a US phone number to E.164 (+1XXXXXXXXXX), or null if invalid.
export function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Pretty-print an E.164 US number as (312) 555-1234.
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (n.length !== 10) return e164;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}
