import { makeAutoObservable, runInAction } from "mobx";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { logger } from "../../lib/logger";
import { supabase } from "../../initSupabase";

/** Backs the floating "X patientes ont une alerte" banner shown app-wide
 * after login (see AlertBanner.tsx) — hospital staff only (doctor/hospital
 * nurse), reusing HospitalDashboardStore's own alert computation. Not shown
 * to maternity nurses: her own patient list already shows every patient at
 * her maternity permanently, and manual alerts are things she raises
 * herself — a banner nagging her about patients she's already looking at
 * directly would just be noise (same reasoning task.md already used to
 * skip a separate maternity dashboard). */
export class AlertBannerStore {
  alertCount = 0;
  dismissed = false;
  // userInfoStore/profileStore both rehydrate from AsyncStorage on boot, so
  // a stale profileId from a *previous* session can sit in memory before
  // anyone has actually re-authenticated this run (e.g. sitting on the
  // Login screen after a logout). `loggedIn` is the real gate — only ever
  // flips true once a live Supabase session is confirmed (resetForLogin /
  // checkSessionOnBoot), so the banner never lights up off a stale snapshot.
  loggedIn = false;

  rootStore: RootStore;
  transportLayer: TransportLayer;

  constructor(rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, { rootStore: false, transportLayer: false });
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  get visible(): boolean {
    return this.loggedIn && this.alertCount > 0 && !this.dismissed;
  }

  dismiss() {
    this.dismissed = true;
  }

  signOut() {
    this.loggedIn = false;
    this.dismissed = false;
    this.alertCount = 0;
  }

  // Called right after a successful login — a fresh session should show the
  // banner again even if it was dismissed last time, as long as alerts are
  // still open. userInfoStore hasn't loaded role/hospitalId/maternityId yet
  // at this point (that only happens once Menu mounts), so this fetches it
  // itself rather than relying on Menu's own later fetchUserInfo call.
  async resetForLogin() {
    this.dismissed = false;
    try {
      await this.rootStore.userInfoStore.fetchUserInfo();
    } catch (error: any) {
      logger.warn("AlertBannerStore: resetForLogin fetchUserInfo failed", { error: error?.message });
      return;
    }
    this.loggedIn = true;
    await this.refresh();
  }

  // Run once on app boot (AlertBanner's mount effect). Covers a web page
  // refresh / app relaunch: the store tree is rebuilt from scratch, but a
  // valid Supabase session may still be persisted separately — only that
  // real session, not the rehydrated MobX snapshot, is allowed to flip
  // `loggedIn` on.
  async checkSessionOnBoot() {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      await this.resetForLogin();
    }
  }

  async refresh() {
    const userInfo = this.rootStore.userInfoStore.userInfo;
    if (!userInfo.profileId) {
      runInAction(() => { this.alertCount = 0; });
      return;
    }
    const isMaternityNurse = userInfo.role === "NURSE" && userInfo.nurseType === "MATERNITY";
    if (isMaternityNurse || !userInfo.hospitalId) {
      runInAction(() => { this.alertCount = 0; });
      return;
    }
    try {
      await this.rootStore.hospitalDashboardStore.fetchDashboard();
      runInAction(() => { this.alertCount = this.rootStore.hospitalDashboardStore.alertPatients.length; });
    } catch (error: any) {
      logger.warn("AlertBannerStore: refresh failed", { error: error?.message });
    }
  }
}
