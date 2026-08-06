/**
 * Shared clinical alert thresholds — used by the patient card
 * (partogrammeList.tsx) and the admin Dashboard so both flag the exact same
 * patients as needing attention. Kept dependency-free (plain value/timestamp
 * pairs, not store classes) so either a live MobX store or a raw fetched row
 * can feed it.
 */

export type DilationBand = "green" | "yellow" | "red";

export interface TimedReading {
  value: number;
  created_at: string;
}

// Same green/yellow/red WHO banding logic as the dilation graph, condensed
// to a single point-in-time classification for the latest reading — no
// color until the patient has actually reached active phase (>=4cm).
export function getDilationBand(
  readings: TimedReading[],
  workStartDateTime: string | null,
): DilationBand | null {
  if (readings.length === 0 || !workStartDateTime) return null;
  const sorted = readings.slice().sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const anchor = sorted.find((p) => p.value >= 4);
  if (!anchor) return null;

  const startMs = new Date(workStartDateTime).getTime();
  const latest = sorted[sorted.length - 1];
  const bandOffset = (new Date(anchor.created_at).getTime() - startMs) / (1000 * 60 * 60);
  const x = (new Date(latest.created_at).getTime() - startMs) / (1000 * 60 * 60);
  const h = x - bandOffset;
  const y = latest.value;

  const alertLine = Math.min(10, 4 + h);
  if (y > alertLine) return "green";
  if (h >= 4 && y < h) return "red";
  return "yellow";
}

// Normal fetal heart rate baseline is 110-160 bpm — bradycardia below,
// tachycardia above (standard obstetric reference range, not WHO-partograph
// specific like the dilation band).
export function isBpmAlert(bpm: number): boolean {
  return bpm < 110 || bpm > 160;
}
