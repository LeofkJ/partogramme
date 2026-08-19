import { makeAutoObservable, runInAction } from "mobx";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { getDilationBand, isBpmAlert, TimedReading } from "../../lib/clinicalAlerts";
import { logger } from "../../lib/logger";

export type AlertPatient = {
  id: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  noFile: number;
  /** null for a patient already at the viewer's own hospital — the
   * maternity fields only apply to not-yet-transferred linked-maternity
   * patients. */
  maternityId: string | null;
  maternityName: string | null;
  reason: "dilation" | "bpm" | "manual";
  value: number;
  /** Only set when reason === "manual" — the most recent alert's own
   * explanation and when it was raised. A patient can have more than one
   * manual alert at once; manualAlertCount is the total. */
  comment: string | null;
  raisedAt: string | null;
  manualAlertCount: number;
  /** Only meaningful for a linked-maternity, not-yet-transferred patient —
   * lets the UI show "En attente" instead of the request button. */
  requestedByMyHospital: boolean;
};

export type LinkedMaternityPatient = {
  id: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  noFile: number;
  latestBpm: number | null;
  latestDilation: number | null;
};

export type LinkedMaternitySummary = {
  id: string;
  name: string;
  /** Non-flagged patients only — a flagged one appears in alertPatients
   * instead, same mutual-exclusion rule as the hospital's own list. */
  patients: LinkedMaternityPatient[];
};

export type OwnHospitalPatient = {
  id: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  noFile: number;
  state: string;
  latestBpm: number | null;
  latestDilation: number | null;
};

/** A hospital's own dashboard (see task.md's "Dashboard scope") — shared by
 * every doctor and hospital nurse at that hospital (not maternity nurses,
 * who use their own patient list instead, see the Menu screen's permanent
 * maternity visibility). Two halves: the hospital's own patients, and every
 * linked maternity's alerts/census — matching task.md explicitly ("shows
 * all maternity centers linked to it and their actual patients", "shows
 * which patients are currently admitted", "non-flagged patients are shown
 * too, just not highlighted"). An alerts-only version was tried, but that
 * contradicts those lines directly — reverted back to showing everything. */
export class HospitalDashboardStore {
  alertPatients: AlertPatient[] = [];
  linkedMaternities: LinkedMaternitySummary[] = [];
  ownHospitalPatients: OwnHospitalPatient[] = [];
  state: "pending" | "done" | "error" = "pending";

  rootStore: RootStore;
  transportLayer: TransportLayer;

  constructor(rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, { rootStore: false, transportLayer: false });
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  async fetchDashboard() {
    const hospitalId = this.rootStore.userInfoStore.userInfo.hospitalId;
    if (!hospitalId) {
      runInAction(() => {
        this.alertPatients = [];
        this.linkedMaternities = [];
        this.ownHospitalPatients = [];
        this.state = "done";
      });
      return;
    }
    this.state = "pending";
    try {
      const [ownHospitalPatients, links, maternities] = await Promise.all([
        this.transportLayer.fetchPartogrammes(hospitalId),
        this.transportLayer.fetchHospitalMaternityLinks(),
        this.transportLayer.fetchAllMaternities(),
      ]);

      const linkedMaternityIds = links.filter((l) => l.hospitalId === hospitalId).map((l) => l.maternityId);
      const maternityNameById = Object.fromEntries(maternities.map((m) => [m.id, m.name]));
      const candidates = await this.transportLayer.fetchMaternityAlertCandidates(linkedMaternityIds);

      const ownActivePatients = ownHospitalPatients.filter((p) => p.state !== "WORK_FINISHED");

      const vitalsIds = [...ownActivePatients.map((p) => p.id), ...candidates.map((c) => c.id)];
      const [{ dilations, bpms }, manualAlerts] = await Promise.all([
        this.transportLayer.fetchLatestVitals(vitalsIds),
        this.transportLayer.fetchManualAlerts(vitalsIds),
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
      // fetchManualAlerts already orders by createdAt desc, so [0] is the
      // most recent one for a given patient — a patient can have several
      // at once, this just surfaces the latest on the dashboard card.
      const manualAlertsById: Record<string, { comment: string; createdAt: string }[]> = {};
      for (const row of manualAlerts) {
        (manualAlertsById[row.partogrammeId] ??= []).push({ comment: row.comment, createdAt: row.createdAt });
      }

      const flagged: AlertPatient[] = [];
      // Returns whether this patient got flagged — callers use this to keep
      // "À surveiller" and the other sections mutually exclusive. A flagged
      // own-hospital patient must appear ONLY in the alert list, never
      // duplicated into the plain "À l'hôpital" list too.
      const checkFlag = (
        id: string,
        patientFirstName: string | null,
        patientLastName: string | null,
        noFile: number,
        workStartDateTime: string | null,
        maternityId: string | null,
        requestedByMyHospital: boolean,
      ): boolean => {
        const patientManualAlerts = manualAlertsById[id] ?? [];
        if (patientManualAlerts.length > 0) {
          flagged.push({
            id, patientFirstName, patientLastName, noFile,
            maternityId, maternityName: maternityId ? maternityNameById[maternityId] ?? "—" : null,
            reason: "manual", value: 0,
            comment: patientManualAlerts[0].comment, raisedAt: patientManualAlerts[0].createdAt,
            manualAlertCount: patientManualAlerts.length, requestedByMyHospital,
          });
          return true;
        }
        const latestBpm = latestBpmById[id]?.value ?? null;
        if (latestBpm != null && isBpmAlert(latestBpm)) {
          flagged.push({
            id, patientFirstName, patientLastName, noFile,
            maternityId, maternityName: maternityId ? maternityNameById[maternityId] ?? "—" : null,
            reason: "bpm", value: latestBpm, comment: null, raisedAt: null, manualAlertCount: 0, requestedByMyHospital,
          });
          return true;
        }
        const readings = dilationsById[id] ?? [];
        if (readings.length > 0) {
          const band = getDilationBand(readings, workStartDateTime);
          if (band === "red") {
            const latest = readings.slice().sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )[readings.length - 1];
            flagged.push({
              id, patientFirstName, patientLastName, noFile,
              maternityId, maternityName: maternityId ? maternityNameById[maternityId] ?? "—" : null,
              reason: "dilation", value: latest.value, comment: null, raisedAt: null, manualAlertCount: 0, requestedByMyHospital,
            });
            return true;
          }
        }
        return false;
      };

      const ownRows: OwnHospitalPatient[] = [];
      for (const p of ownActivePatients) {
        const wasFlagged = checkFlag(p.id, p.patientFirstName, p.patientLastName, p.noFile, p.workStartDateTime, null, false);
        if (wasFlagged) continue;
        const dilationReadings = dilationsById[p.id] ?? [];
        const latestDilation = dilationReadings.length > 0
          ? dilationReadings.slice().sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )[dilationReadings.length - 1].value
          : null;
        ownRows.push({
          id: p.id,
          patientFirstName: p.patientFirstName,
          patientLastName: p.patientLastName,
          noFile: p.noFile,
          state: p.state,
          latestBpm: latestBpmById[p.id]?.value ?? null,
          latestDilation,
        });
      }
      const patientsByMaternityId: Record<string, LinkedMaternityPatient[]> = {};
      for (const c of candidates) {
        const wasFlagged = checkFlag(
          c.id, c.patientFirstName, c.patientLastName, c.noFile, c.workStartDateTime,
          c.maternityId as string, c.transferRequestHospitalId === hospitalId,
        );
        if (wasFlagged) continue;
        const dilationReadings = dilationsById[c.id] ?? [];
        const latestDilation = dilationReadings.length > 0
          ? dilationReadings.slice().sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )[dilationReadings.length - 1].value
          : null;
        const maternityId = c.maternityId as string;
        (patientsByMaternityId[maternityId] ??= []).push({
          id: c.id,
          patientFirstName: c.patientFirstName,
          patientLastName: c.patientLastName,
          noFile: c.noFile,
          latestBpm: latestBpmById[c.id]?.value ?? null,
          latestDilation,
        });
      }
      const linkedMaternitySummaries: LinkedMaternitySummary[] = linkedMaternityIds.map((id) => ({
        id,
        name: maternityNameById[id] ?? "—",
        patients: patientsByMaternityId[id] ?? [],
      }));

      runInAction(() => {
        this.alertPatients = flagged;
        this.linkedMaternities = linkedMaternitySummaries;
        this.ownHospitalPatients = ownRows;
        this.state = "done";
      });
    } catch (error: any) {
      runInAction(() => { this.state = "error"; });
      logger.warn("HospitalDashboardStore: fetchDashboard failed", { error: error?.message });
    }
  }

  async requestTransfer(partogrammeId: string) {
    const hospitalId = this.rootStore.userInfoStore.userInfo.hospitalId;
    const doctorProfileId = this.rootStore.profileStore.profile.id;
    if (!hospitalId) return;
    await this.transportLayer.requestMaternityTransfer(partogrammeId, hospitalId, doctorProfileId);
    runInAction(() => {
      const patient = this.alertPatients.find((p) => p.id === partogrammeId);
      if (patient) patient.requestedByMyHospital = true;
    });
  }

  // Hospital staff closing a midwife-raised alert once the patient is
  // theirs (transferred or claimed — maternityId is null on this list).
  // Refetches so a leftover bpm/dilation flag still shows if it's there.
  async clearManualAlerts(partogrammeId: string) {
    await this.transportLayer.deleteManualAlertsForPartogramme(partogrammeId);
    await this.fetchDashboard();
  }
}
