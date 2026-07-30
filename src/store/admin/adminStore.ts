import { makeAutoObservable, runInAction } from "mobx";
import uuid from "react-native-uuid";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { UserInfo, Hospital, Role } from "../user/userInfoStore";
import { notify } from "../../lib/notify";
import { logger } from "../../lib/logger";

type PartogrammeSummary = { id: string; nurseId: string; refDoctorId: string | null; state: string };

export class AdminStore {
  accounts: UserInfo["Row"][] = [];
  hospitals: Hospital["Row"][] = [];
  // profileId -> email. Separate from `accounts` since email lives on
  // Profile, not userInfo (see 2026-07-28_admin_profile_select.sql).
  emailByProfileId: Record<string, string> = {};
  // profileId -> ISO timestamp, or null if never logged in. From auth.users
  // via an Edge Function (see 2026-07-29 admin-list-logins).
  lastLoginByProfileId: Record<string, string | null> = {};
  // Every active (non-finished) partogramme, hospital-wide — just enough to
  // compute each employee's active-patient count below.
  partogrammes: PartogrammeSummary[] = [];
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

  async fetchAll() {
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
      notify.error("Erreur", "Impossible de charger les comptes");
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
