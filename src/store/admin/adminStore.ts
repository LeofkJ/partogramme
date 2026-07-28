import { makeAutoObservable, runInAction } from "mobx";
import uuid from "react-native-uuid";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { UserInfo, Hospital, Role } from "../user/userInfoStore";
import { notify } from "../../lib/notify";
import { logger } from "../../lib/logger";

export class AdminStore {
  accounts: UserInfo["Row"][] = [];
  hospitals: Hospital["Row"][] = [];
  // profileId -> email. Separate from `accounts` since email lives on
  // Profile, not userInfo (see 2026-07-28_admin_profile_select.sql).
  emailByProfileId: Record<string, string> = {};
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

  async fetchAll() {
    this.state = "pending";
    try {
      const [accounts, hospitals, profiles] = await Promise.all([
        this.transportLayer.fetchAllUserInfo(),
        this.transportLayer.fetchAllHospitals(),
        this.transportLayer.fetchAllProfiles(),
      ]);
      runInAction(() => {
        this.accounts = accounts;
        this.hospitals = hospitals;
        this.emailByProfileId = Object.fromEntries(
          profiles.filter((p) => p.email).map((p) => [p.id, p.email as string]),
        );
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
    role: "NURSE" | "DOCTOR";
    hospitalId: string | null;
    refDoctorId: string | null;
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
}

export type { Role };
