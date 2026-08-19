// Small, dependency-free "time since" formatter — shared by anywhere a
// manual alert's age needs to show (Graph.tsx's trigger card, the hospital
// dashboard's alert card).
export function formatElapsed(fromIso: string): string {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(fromIso).getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  return `${minutes} min`;
}
