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

// NICE intrapartum fetal monitoring guidance (NG229; matches the earlier
// CG190 wording) classifies baseline fetal heart rate into three bands,
// not a flat normal/abnormal split:
//   - reassuring: 110-160 bpm
//   - non-reassuring: 100-109 or 161-180 bpm
//   - abnormal: <100 or >180 bpm
// isBpmAlert is the "abnormal" line — this used to fire at <110/>160 (i.e.
// treated the whole non-reassuring band as a full alert), which is more
// aggressive than actual clinical practice; a stable 110-160 reading needs
// no escalation at all per NICE, non-reassuring values get closer watching
// rather than an alert. Widened to match. See getBpmBand for the
// non-reassuring/caution band this leaves in between.
export function isBpmAlert(bpm: number): boolean {
  return bpm < 100 || bpm > 180;
}

// The "non-reassuring" middle band from the same guidance — a caution,
// not yet an alert. Used by the Dashboard's softer caution colouring (see
// HospitalDashboard.tsx). Deliberately never used to decide
// isPatientFlagged/AlertBanner/the "À surveiller" list — isBpmAlert alone
// still owns that, so a caution never escalates into a popup or the
// global banner, only ever shows as a colour in the plain Dashboard lists.
export function getBpmBand(bpm: number): DilationBand {
  if (isBpmAlert(bpm)) return "red";
  if (bpm < 110 || bpm > 160) return "yellow";
  return "green";
}

// Same red-flag rule the hospital dashboard uses to sort a patient into "À
// surveiller" — bpm out of range, the dilation band is red, or the midwife
// raised at least one manual alert (independent of either threshold — see
// ManualAlert, a patient can have several at once, this only cares whether
// there's at least one). Factored out so any other alert-count consumer
// flags the exact same patients without re-deriving the checks.
export function isPatientFlagged(
  dilationReadings: TimedReading[],
  workStartDateTime: string | null,
  latestBpm: number | null,
  hasManualAlert: boolean = false,
): boolean {
  if (hasManualAlert) return true;
  if (latestBpm != null && isBpmAlert(latestBpm)) return true;
  if (dilationReadings.length > 0) {
    const band = getDilationBand(dilationReadings, workStartDateTime);
    if (band === "red") return true;
  }
  return false;
}
