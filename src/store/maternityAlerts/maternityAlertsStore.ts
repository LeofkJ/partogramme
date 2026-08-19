import { makeAutoObservable, runInAction } from "mobx";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { getDilationBand, isBpmAlert, TimedReading } from "../../lib/clinicalAlerts";
import { logger } from "../../lib/logger";

export type MaternityAlertItem = {
  /** Unique per row for list rendering — the ManualAlert row's own id for
   * a manual alert, a synthetic key for a threshold-derived one (those
   * aren't stored rows, so there's nothing to delete). */
  key: string;
  partogrammeId: string;
  noFile: number;
  reason: "dilation" | "bpm" | "manual";
  value: number;
  comment: string | null;
  raisedAt: string | null;
  /** Only set for reason === "manual" — the ManualAlert row id, needed to
   * delete it. */
  alertId: string | null;
};

/** Every currently-flagged patient at the midwife's own maternity — feeds
 * the dropdown next to Graph.tsx's "+ ALERTE" button, so she can jump to
 * any flagged patient from whichever chart she happens to be on, not just
 * see this one patient's own alerts. A patient can have several manual
 * alerts at once (ManualAlert is one-to-many), so unlike
 * HospitalDashboardStore's alertPatients this is one row per alert, not
 * per patient — bpm/dilation breaches still only ever produce one row per
 * patient each, since those aren't individually stored/deletable rows.
 * Fetched on demand (popup open), not polled. */
export class MaternityAlertsStore {
  alerts: MaternityAlertItem[] = [];
  state: "pending" | "done" | "error" = "pending";

  rootStore: RootStore;
  transportLayer: TransportLayer;

  constructor(rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, { rootStore: false, transportLayer: false });
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  async fetchAlerts() {
    const maternityId = this.rootStore.userInfoStore.userInfo.maternityId;
    if (!maternityId) {
      runInAction(() => { this.alerts = []; this.state = "done"; });
      return;
    }
    this.state = "pending";
    try {
      const patients = await this.transportLayer.fetchPartogrammesForMaternityNurse(maternityId);
      const active = (patients ?? []).filter((p) => p.state !== "WORK_FINISHED");
      const ids = active.map((p) => p.id);
      const [{ dilations, bpms }, manualAlerts] = await Promise.all([
        this.transportLayer.fetchLatestVitals(ids),
        this.transportLayer.fetchManualAlerts(ids),
      ]);

      const dilationsById: Record<string, TimedReading[]> = {};
      for (const row of dilations) {
        (dilationsById[row.partogrammeId] ??= []).push({ value: row.value, created_at: row.created_at });
      }
      const latestBpmById: Record<string, TimedReading> = {};
      for (const row of bpms) {
        const existing = latestBpmById[row.partogrammeId];
        if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
          latestBpmById[row.partogrammeId] = { value: row.value, created_at: row.created_at };
        }
      }
      const noFileById: Record<string, number> = {};
      for (const p of active) noFileById[p.id] = p.noFile;

      const alerts: MaternityAlertItem[] = [];

      // One row per manual alert — a patient can have several.
      for (const row of manualAlerts) {
        const noFile = noFileById[row.partogrammeId];
        if (noFile === undefined) continue;
        alerts.push({
          key: row.id, partogrammeId: row.partogrammeId, noFile,
          reason: "manual", value: 0, comment: row.comment, raisedAt: row.createdAt, alertId: row.id,
        });
      }

      // Threshold breaches stay one row per patient each — not individual
      // stored rows, so nothing to list twice or delete.
      for (const p of active) {
        const latestBpm = latestBpmById[p.id]?.value ?? null;
        if (latestBpm != null && isBpmAlert(latestBpm)) {
          alerts.push({
            key: `${p.id}-bpm`, partogrammeId: p.id, noFile: p.noFile,
            reason: "bpm", value: latestBpm, comment: null, raisedAt: null, alertId: null,
          });
          continue;
        }
        const readings = dilationsById[p.id] ?? [];
        if (readings.length > 0) {
          const band = getDilationBand(readings, p.workStartDateTime);
          if (band === "red") {
            const latest = readings.slice().sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )[readings.length - 1];
            alerts.push({
              key: `${p.id}-dilation`, partogrammeId: p.id, noFile: p.noFile,
              reason: "dilation", value: latest.value, comment: null, raisedAt: null, alertId: null,
            });
          }
        }
      }

      runInAction(() => { this.alerts = alerts; this.state = "done"; });
    } catch (error: any) {
      runInAction(() => { this.state = "error"; });
      logger.warn("MaternityAlertsStore: fetchAlerts failed", { error: error?.message });
    }
  }

  async addAlert(partogrammeId: string, comment: string) {
    await this.transportLayer.createManualAlert(partogrammeId, comment);
    await this.fetchAlerts();
  }

  async deleteAlert(alertId: string) {
    await this.transportLayer.deleteManualAlert(alertId);
    runInAction(() => {
      this.alerts = this.alerts.filter((a) => a.alertId !== alertId);
    });
  }
}
