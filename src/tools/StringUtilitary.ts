/**
 * @module tools
 * @description
 * Tools for string manipulation
 * @see {@link module:tools}
 * @requires module:tools
 */

export const formatDateString = (date: string | null): string => {
  if (!date) return "Aucune date";
  return new Date(date as string)
                .toLocaleString()
                .replace(",", "");
}

export const formatDateOnly = (date: string | null): string => {
  if (!date) return "Aucune date";
  return new Date(date).toLocaleDateString();
}

export const formatTimeOnly = (date: string | null): string => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

