import { makeAutoObservable, runInAction } from "mobx";
import uuid from "react-native-uuid";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { UserInfo, Hospital, Role } from "../user/userInfoStore";
import { notify } from "../../lib/notify";
import { logger } from "../../lib/logger";
import { getDilationBand, isBpmAlert, TimedReading } from "../../lib/clinicalAlerts";

export type PartogrammeState = "ADMITTED" | "IN_PROGRESS" | "TRANSFERRED" | "WORK_FINISHED";

export type PartogrammeSummary = {
  id: string;
  nurseId: string;
  refDoctorId: string | null;
  state: string;
  hospitalId: string;
  admissionDateTime: string;
  workStartDateTime: string | null;
  workFinishedDateTime: string | null;
  noFile: number;
  patientFirstName: string | null;
  patientLastName: string | null;
  commentary: string;
};

// Full dilation history (getDilationBand needs the whole curve to find the
// real anchor point, not just the latest value) but only the latest BPM
// (the BPM threshold is a plain point-in-time check, no history needed).
type VitalsEntry = { dilationReadings: TimedReading[]; latestBpm: number | null };

// "Active" here just means logged in recently enough to plausibly still be
// on shift — a simple proxy, not real presence tracking.
const ACTIVE_LOGIN_WINDOW_MS = 24 * 60 * 60 * 1000;
export function loggedInRecently(lastLogin: string | null | undefined): boolean {
  if (!lastLogin) return false;
  return Date.now() - new Date(lastLogin).getTime() < ACTIVE_LOGIN_WINDOW_MS;
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export class AdminStore {
  accounts: UserInfo["Row"][] = [];
  hospitals: Hospital["Row"][] = [];
  // profileId -> email. Separate from `accounts` since email lives on
  // Profile, not userInfo (see 2026-07-28_admin_profile_select.sql).
  emailByProfileId: Record<string, string> = {};
  // profileId -> ISO timestamp, or null if never logged in. From auth.users
  // via an Edge Function (see 2026-07-29 admin-list-logins).
  lastLoginByProfileId: Record<string, string | null> = {};
  // Every non-deleted partogramme, hospital-wide — feeds both the
  // per-employee active-patient count and the Dashboard.
  partogrammes: PartogrammeSummary[] = [];
  // partogrammeId -> latest dilation/BPM reading, for the Dashboard's
  // "needs attention" widget. Only populated for currently-active patients
  // (see fetchDashboardVitals) — not loaded by fetchAll, since the
  // accounts/hospitals pages never need it.
  vitalsByPartogrammeId: Record<string, VitalsEntry> = {};
  state = "pending";

  rootStore: RootStore;
  transportLayer: TransportLayer;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    this.transportLayer = rootStore.transportLayer;
  }

  get nurses() {
    return this.accounts.filter((a) => a.role === "NURSE");
  }

  get doctors() {
    return this.accounts.filter((a) => a.role === "DOCTOR");
  }

  /** active: currently theirs to manage — a nurse has a patient from
   * ADMITTED through IN_PROGRESS (until TRANSFERRED, pushed by her or
   * claimed by a doctor — see 2026-07-28_doctor_claim_patient.sql); a
   * doctor only has one once it's actually TRANSFERRED to them.
   * inactive: patients they've handled that have since moved past that —
   * transferred away or finished for a nurse, finished for a doctor. Not a
   * lifetime total, just "no longer active." */
  patientCounts(account: UserInfo["Row"]): { active: number; inactive: number } {
    if (account.role === "NURSE") {
      const mine = this.partogrammes.filter((p) => p.nurseId === account.profileId);
      return {
        active: mine.filter((p) => p.state === "ADMITTED" || p.state === "IN_PROGRESS").length,
        inactive: mine.filter((p) => p.state === "TRANSFERRED" || p.state === "WORK_FINISHED").length,
      };
    }
    if (account.role === "DOCTOR") {
      const mine = this.partogrammes.filter((p) => p.refDoctorId === account.profileId);
      return {
        active: mine.filter((p) => p.state === "TRANSFERRED").length,
        inactive: mine.filter((p) => p.state === "WORK_FINISHED").length,
      };
    }
    return { active: 0, inactive: 0 };
  }

  private scoped(hospitalId?: string | null) {
    return hospitalId ? this.partogrammes.filter((p) => p.hospitalId === hospitalId) : this.partogrammes;
  }

  /** Live count by state — the Dashboard's census cards. Pass a hospitalId
   * to scope to one hospital, or omit for the aggregate across all of them. */
  censusByState(hospitalId?: string | null): Record<PartogrammeState, number> {
    const rows = this.scoped(hospitalId);
    return {
      ADMITTED: rows.filter((p) => p.state === "ADMITTED").length,
      IN_PROGRESS: rows.filter((p) => p.state === "IN_PROGRESS").length,
      TRANSFERRED: rows.filter((p) => p.state === "TRANSFERRED").length,
      WORK_FINISHED: rows.filter((p) => p.state === "WORK_FINISHED").length,
    };
  }

  /** Today's throughput — how many patients were admitted vs finished today. */
  todayThroughput(hospitalId?: string | null): { admittedToday: number; finishedToday: number } {
    const rows = this.scoped(hospitalId);
    return {
      admittedToday: rows.filter((p) => isToday(p.admissionDateTime)).length,
      finishedToday: rows.filter((p) => isToday(p.workFinishedDateTime)).length,
    };
  }

  /** The actual rows behind censusByState/todayThroughput — for the
   * Dashboard's click-through detail popup on a stat count. */
  patientsInState(state: PartogrammeState, hospitalId?: string | null): PartogrammeSummary[] {
    return this.scoped(hospitalId).filter((p) => p.state === state);
  }

  patientsAdmittedToday(hospitalId?: string | null): PartogrammeSummary[] {
    return this.scoped(hospitalId).filter((p) => isToday(p.admissionDateTime));
  }

  patientsFinishedToday(hospitalId?: string | null): PartogrammeSummary[] {
    return this.scoped(hospitalId).filter((p) => isToday(p.workFinishedDateTime));
  }

  /** Nurses/doctors assigned to the scope vs how many have logged in
   * recently (see loggedInRecently) — a rough "who's actually around". */
  staffSnapshot(hospitalId?: string | null): {
    totalNurses: number; activeNurses: number;
    totalDoctors: number; activeDoctors: number;
  } {
    const staff = hospitalId ? this.accounts.filter((a) => a.hospitalId === hospitalId) : this.accounts;
    const nurses = staff.filter((a) => a.role === "NURSE");
    const doctors = staff.filter((a) => a.role === "DOCTOR");
    return {
      totalNurses: nurses.length,
      activeNurses: nurses.filter((a) => loggedInRecently(this.lastLoginByProfileId[a.profileId])).length,
      totalDoctors: doctors.length,
      activeDoctors: doctors.filter((a) => loggedInRecently(this.lastLoginByProfileId[a.profileId])).length,
    };
  }

  /** The accounts behind staffSnapshot's active/total counts — for the
   * Dashboard's click-through detail popup. */
  staffList(role: "NURSE" | "DOCTOR", hospitalId?: string | null): UserInfo["Row"][] {
    const staff = hospitalId ? this.accounts.filter((a) => a.hospitalId === hospitalId) : this.accounts;
    return staff.filter((a) => a.role === role);
  }

  /** One row per hospital with its own census + staffing — the root
   * admin's aggregate view drills into this instead of a hospital picker. */
  hospitalBreakdown(): { hospital: Hospital["Row"]; census: Record<PartogrammeState, number>; staff: ReturnType<AdminStore["staffSnapshot"]> }[] {
    return this.hospitals.map((hospital) => ({
      hospital,
      census: this.censusByState(hospital.id),
      staff: this.staffSnapshot(hospital.id),
    }));
  }

  /** Currently-active patients (not yet finished) whose latest dilation is
   * in the WHO red band or whose latest BPM is outside 110-160 — the
   * Dashboard's "needs attention" list. Carries the actual reading (not
   * just which one triggered) so the UI can show the real number instead
   * of a generic "abnormal" label. Requires fetchDashboardVitals to have
   * run first; returns nothing until it has. */
  needsAttention(hospitalId?: string | null): (PartogrammeSummary & { reason: "dilation" | "bpm"; value: number })[] {
    const rows = this.scoped(hospitalId).filter((p) => p.state !== "WORK_FINISHED");
    const flagged: (PartogrammeSummary & { reason: "dilation" | "bpm"; value: number })[] = [];
    for (const p of rows) {
      const vitals = this.vitalsByPartogrammeId[p.id];
      if (!vitals) continue;
      if (vitals.latestBpm != null && isBpmAlert(vitals.latestBpm)) {
        flagged.push({ ...p, reason: "bpm", value: vitals.latestBpm });
        continue;
      }
      if (vitals.dilationReadings.length > 0) {
        const band = getDilationBand(vitals.dilationReadings, p.workStartDateTime);
        if (band === "red") {
          const latest = vitals.dilationReadings.slice().sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )[vitals.dilationReadings.length - 1];
          flagged.push({ ...p, reason: "dilation", value: latest.value });
        }
      }
    }
    return flagged;
  }

  /** Dilation history + latest BPM per currently-active patient, for
   * needsAttention above. Separate from fetchAll since only the Dashboard
   * needs it and it's heavier (reads two more tables across every active
   * patient). */
  async fetchDashboardVitals() {
    const activeIds = this.partogrammes
      .filter((p) => p.state !== "WORK_FINISHED")
      .map((p) => p.id);
    try {
      const { dilations, bpms } = await this.transportLayer.fetchLatestVitalsForAdmin(activeIds);

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

      const next: Record<string, VitalsEntry> = {};
      for (const id of activeIds) {
        next[id] = {
          dilationReadings: dilationsById[id] ?? [],
          latestBpm: latestBpmById[id]?.value ?? null,
        };
      }
      runInAction(() => {
        this.vitalsByPartogrammeId = next;
      });
    } catch (error: any) {
      logger.warn("AdminStore: fetchDashboardVitals failed", { error: error?.message });
    }
  }

  /** `silent`: skip the error toast — for background/polling refreshes
   * (see Dashboard.tsx) where a single flaky request shouldn't interrupt
   * the admin with a popup every 30s. The initial page-load call still
   * wants the toast, so it stays the default. */
  async fetchAll(silent = false) {
    this.state = "pending";
    try {
      const [accounts, hospitals, profiles, lastLoginByProfileId, partogrammes] = await Promise.all([
        this.transportLayer.fetchAllUserInfo(),
        this.transportLayer.fetchAllHospitals(),
        this.transportLayer.fetchAllProfiles(),
        this.transportLayer.adminListLogins(),
        this.transportLayer.fetchAllPartogrammesForAdmin(),
      ]);
      runInAction(() => {
        this.accounts = accounts;
        this.hospitals = hospitals;
        this.emailByProfileId = Object.fromEntries(
          profiles.filter((p) => p.email).map((p) => [p.id, p.email as string]),
        );
        this.lastLoginByProfileId = lastLoginByProfileId;
        this.partogrammes = partogrammes as PartogrammeSummary[];
        this.state = "done";
      });
    } catch (error: any) {
      runInAction(() => { this.state = "error"; });
      logger.warn("AdminStore: fetchAll failed", { error: error?.message });
      if (!silent) notify.error("Erreur", "Impossible de charger les comptes");
    }
  }

  async createAccount(input: {
    email: string;
    firstName: string;
    lastName: string;
    role: "NURSE" | "DOCTOR" | "ADMIN";
    hospitalId: string | null;
    phone?: string;
  }) {
    try {
      const result = await this.transportLayer.adminCreateAccount(input);
      await this.fetchAll();
      return result;
    } catch (error: any) {
      logger.warn("AdminStore: createAccount failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de créer le compte");
      throw error;
    }
  }

  async createHospital(input: { name: string; city: string }) {
    try {
      await this.transportLayer.createHospital({
        id: uuid.v4().toString(),
        name: input.name,
        city: input.city,
      });
      notify.success("Hôpital ajouté");
      await this.fetchAll();
    } catch (error: any) {
      logger.warn("AdminStore: createHospital failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible d'ajouter l'hôpital");
      throw error;
    }
  }

  async removeHospital(hospitalId: string) {
    try {
      await this.transportLayer.removeHospital(hospitalId);
      runInAction(() => {
        this.hospitals = this.hospitals.filter((h) => h.id !== hospitalId);
      });
      notify.success("Hôpital supprimé");
    } catch (error: any) {
      logger.warn("AdminStore: removeHospital failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de supprimer l'hôpital");
      throw error;
    }
  }

  async removeAccount(userInfoId: string) {
    try {
      await this.transportLayer.adminRemoveAccount(userInfoId);
      runInAction(() => {
        this.accounts = this.accounts.filter((a) => a.id !== userInfoId);
      });
      notify.success("Accès retiré");
    } catch (error: any) {
      logger.warn("AdminStore: removeAccount failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de retirer l'accès");
      throw error;
    }
  }

  async updateAccount(input: {
    userInfoId: string;
    firstName: string;
    lastName: string;
    phone?: string;
    hospitalId: string | null;
    role?: "NURSE" | "DOCTOR" | "ADMIN";
  }) {
    try {
      await this.transportLayer.adminUpdateAccount(input);
      await this.fetchAll();
      notify.success("Compte mis à jour");
    } catch (error: any) {
      logger.warn("AdminStore: updateAccount failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de mettre à jour le compte");
      throw error;
    }
  }
}

export type { Role };
