/**
 * @module tools
 * @description
 * Tools for string manipulation
 * @see {@link module:tools}
 * @requires module:tools
 */

// Explicit "fr-FR" everywhere below — this app is French-language
// end-to-end, so dates shouldn't follow whatever locale the device/browser
// happens to default to (some environments fall back to an ISO-looking
// "2026-07-27" instead of a real French date, which reads as a bug).

export const formatDateString = (date: string | null): string => {
  if (!date) return "Aucune date";
  return new Date(date as string)
                .toLocaleString("fr-FR")
                .replace(",", "");
}

export const formatDateOnly = (date: string | null): string => {
  if (!date) return "Aucune date";
  return new Date(date).toLocaleDateString("fr-FR");
}

export const formatTimeOnly = (date: string | null): string => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

