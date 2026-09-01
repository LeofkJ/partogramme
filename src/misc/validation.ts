/** Parses and validates a dossier-number input string: rejects empty
 * input, non-numeric text, decimals, scientific notation ("1e5"), and
 * anything above a realistic dossier-number ceiling. Requires plain
 * digits only — Number()'s own coercion accepts "1e5"/"0x1F" as valid
 * integers, which isn't what a human typing a dossier number means, so
 * this checks the raw string shape first. Returns the parsed integer, or
 * null if invalid. Shared by AddPartogramme.tsx (create) and
 * MaternityTransferRequestsPanel.tsx (renumber-on-accept) so both enforce
 * the same rule against the bigint noFile column. */
export function parseDossierNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (parsed <= 0 || parsed > 999_999_999) return null;
  return parsed;
}

/** Outer sanity bound for a vitals reading — wide enough to allow a real
 * severe/critical value a clinician legitimately needs to record, narrow
 * enough to catch an order-of-magnitude typo (e.g. "1800" instead of "180"
 * for a fetal heart rate) that a plain isNaN check lets straight through.
 *
 * Deliberately kept in its own file with zero store imports: CheckTypes.ts
 * imports every vitals store class for its instanceof checks, so importing
 * this function from there into those same store files (for their
 * create/update validation) created a require cycle. */
export function isPhysiologicallyPlausible(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** A vitals entry (table cell or graph point) can only be corrected for a
 * short window after it was recorded — long enough to fix a genuine
 * fat-finger typo, short enough that the partogramme stays a trustworthy
 * record of what was actually observed and when, not something quietly
 * rewritable hours or days later. Same zero-store-imports reasoning as
 * isPhysiologicallyPlausible above — every vitals model class calls this
 * directly from its own update()/delete(). */
export const EDIT_WINDOW_MINUTES = 15;

export function isWithinEditWindow(createdAt: string, windowMinutes: number = EDIT_WINDOW_MINUTES): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return Date.now() - createdMs <= windowMinutes * 60 * 1000;
}
