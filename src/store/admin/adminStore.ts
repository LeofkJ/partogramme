import { makeAutoObservable, runInAction } from "mobx";
import uuid from "react-native-uuid";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { UserInfo, Hospital, Maternity, HospitalMaternityLink, Role } from "../user/userInfoStore";
import { notify } from "../../lib/notify";
import { logger } from "../../lib/logger";

export class AdminStore {
  accounts: UserInfo["Row"][] = [];
  hospitals: Hospital["Row"][] = [];
  maternities: Maternity["Row"][] = [];
  hospitalMaternityLinks: HospitalMaternityLink["Row"][] = [];
  // profileId -> email. Separate from `accounts` since email lives on
  // Profile, not userInfo (see 2026-07-28_admin_profile_select.sql).
  emailByProfileId: Record<string, string> = {};
  // profileId -> ISO timestamp, or null if never logged in. From auth.users
  // via an Edge Function (see 2026-07-29 admin-list-logins).
  lastLoginByProfileId: Record<string, string | null> = {};
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

  /** `silent`: skip the error toast — for background/polling refreshes
   * where a single flaky request shouldn't interrupt the admin with a
   * popup every 30s. The initial page-load call still wants the toast, so
   * it stays the default. */
  async fetchAll(silent = false) {
    this.state = "pending";
    try {
      const [accounts, hospitals, maternities, hospitalMaternityLinks, profiles, lastLoginByProfileId] = await Promise.all([
        this.transportLayer.fetchAllUserInfo(),
        this.transportLayer.fetchAllHospitals(),
        this.transportLayer.fetchAllMaternities(),
        this.transportLayer.fetchHospitalMaternityLinks(),
        this.transportLayer.fetchAllProfiles(),
        this.transportLayer.adminListLogins(),
      ]);
      runInAction(() => {
        this.accounts = accounts;
        this.hospitals = hospitals;
        this.maternities = maternities;
        this.hospitalMaternityLinks = hospitalMaternityLinks;
        this.emailByProfileId = Object.fromEntries(
          profiles.filter((p) => p.email).map((p) => [p.id, p.email as string]),
        );
        this.lastLoginByProfileId = lastLoginByProfileId;
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
    maternityId?: string | null;
    nurseType?: "HOSPITAL" | "MATERNITY" | null;
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

  async createHospital(input: { name: string; city: string; region?: string }) {
    try {
      await this.transportLayer.createHospital({
        id: uuid.v4().toString(),
        name: input.name,
        city: input.city,
        region: input.region || null,
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

  async createMaternity(input: { name: string; region: string; address?: string }) {
    try {
      await this.transportLayer.createMaternity({
        id: uuid.v4().toString(),
        name: input.name,
        region: input.region,
        address: input.address ?? null,
      });
      notify.success("Maternité ajoutée");
      await this.fetchAll();
    } catch (error: any) {
      logger.warn("AdminStore: createMaternity failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible d'ajouter la maternité");
      throw error;
    }
  }

  async removeMaternity(maternityId: string) {
    try {
      await this.transportLayer.removeMaternity(maternityId);
      runInAction(() => {
        this.maternities = this.maternities.filter((m) => m.id !== maternityId);
      });
      notify.success("Maternité supprimée");
    } catch (error: any) {
      logger.warn("AdminStore: removeMaternity failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de supprimer la maternité");
      throw error;
    }
  }

  /** Pre-fills the midwife's hospital picker on transfer/reassign — see
   * Graph.tsx's transferHospitalItems. Doesn't restrict her choice, she
   * can still pick any hospital. */
  async updateMaternityDefaultHospital(maternityId: string, defaultHospitalId: string | null) {
    try {
      await this.transportLayer.updateMaternityDefaultHospital(maternityId, defaultHospitalId);
      runInAction(() => {
        const maternity = this.maternities.find((m) => m.id === maternityId);
        if (maternity) maternity.defaultHospitalId = defaultHospitalId;
      });
      notify.success("Hôpital par défaut mis à jour");
    } catch (error: any) {
      logger.warn("AdminStore: updateMaternityDefaultHospital failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de mettre à jour l'hôpital par défaut");
      throw error;
    }
  }

  /** Hospitals currently linked to a maternity (see
   * MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §1) — the admin-assigned
   * relationship, not the region text match. */
  hospitalsForMaternity(maternityId: string): Hospital["Row"][] {
    const linkedIds = new Set(
      this.hospitalMaternityLinks.filter((l) => l.maternityId === maternityId).map((l) => l.hospitalId),
    );
    return this.hospitals.filter((h) => linkedIds.has(h.id));
  }

  /** Maternities currently linked to a hospital — the other direction of
   * hospitalsForMaternity. */
  maternitiesForHospital(hospitalId: string): Maternity["Row"][] {
    const linkedIds = new Set(
      this.hospitalMaternityLinks.filter((l) => l.hospitalId === hospitalId).map((l) => l.maternityId),
    );
    return this.maternities.filter((m) => linkedIds.has(m.id));
  }

  async linkMaternityToHospital(maternityId: string, hospitalId: string) {
    try {
      const link = { id: uuid.v4().toString(), maternityId, hospitalId };
      await this.transportLayer.linkHospitalMaternity(link);
      runInAction(() => {
        this.hospitalMaternityLinks.push(link);
      });
    } catch (error: any) {
      logger.warn("AdminStore: linkMaternityToHospital failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de lier l'hôpital et la maternité");
      throw error;
    }
  }

  async unlinkMaternityFromHospital(maternityId: string, hospitalId: string) {
    const link = this.hospitalMaternityLinks.find(
      (l) => l.maternityId === maternityId && l.hospitalId === hospitalId,
    );
    if (!link) return;
    try {
      await this.transportLayer.unlinkHospitalMaternity(link.id);
      runInAction(() => {
        this.hospitalMaternityLinks = this.hospitalMaternityLinks.filter((l) => l.id !== link.id);
      });
    } catch (error: any) {
      logger.warn("AdminStore: unlinkMaternityFromHospital failed", { error: error?.message });
      notify.error("Erreur", error?.message ?? "Impossible de délier l'hôpital et la maternité");
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
