/**
 * Normalizes a Benin phone number to a consistent "+229XXXXXXXXXX" format
 * (no spaces) regardless of how it was typed — with/without a leading +,
 * spaces, dashes, the 00229 international dialing prefix, or no country
 * code at all (treated as already-local digits). Doesn't invent or drop
 * digits, just strips one layer of country-code prefix (00 or 229) if
 * present and re-attaches a bare "+229".
 */
export function normalizeBeninPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let digits = trimmed.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("229")) {
    digits = digits.slice(3);
  }
  if (!digits) return "";

  return `+229${digits}`;
}
