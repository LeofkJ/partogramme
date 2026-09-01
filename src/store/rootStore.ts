import { TransportLayer } from "../transport/transportLayer";
import { PartogrammeStore } from "./partogramme/partogrammeStore";
import { ProfileStore } from "./user/profileStore";
import { UserInfoStore } from "./user/userInfoStore";
import { AdminStore } from "./admin/adminStore";
import { HospitalDashboardStore } from "./hospitalDashboard/hospitalDashboardStore";
import { AlertBannerStore } from "./alertBanner/alertBannerStore";
import { MaternityAlertsStore } from "./maternityAlerts/maternityAlertsStore";
import { TransferOutcomeStore } from "./transferOutcome/transferOutcomeStore";
import { NetworkStore } from "./network/networkStore";

export class RootStore {
  profileStore: ProfileStore;
  partogrammeStore: PartogrammeStore;
  userInfoStore: UserInfoStore;
  adminStore: AdminStore;
  hospitalDashboardStore: HospitalDashboardStore;
  alertBannerStore: AlertBannerStore;
  maternityAlertsStore: MaternityAlertsStore;
  transferOutcomeStore: TransferOutcomeStore;
  networkStore: NetworkStore;
  transportLayer: TransportLayer;

  constructor() {
    this.transportLayer = new TransportLayer();
    this.profileStore = new ProfileStore(this);
    this.userInfoStore = new UserInfoStore(this);
    this.partogrammeStore = new PartogrammeStore(this, this.transportLayer);
    this.adminStore = new AdminStore(this);
    this.hospitalDashboardStore = new HospitalDashboardStore(this, this.transportLayer);
    this.alertBannerStore = new AlertBannerStore(this, this.transportLayer);
    this.maternityAlertsStore = new MaternityAlertsStore(this, this.transportLayer);
    this.transferOutcomeStore = new TransferOutcomeStore(this, this.transportLayer);
    this.networkStore = new NetworkStore(this);
  }
}

declare global {
  var __rootStore: RootStore | undefined;
}

if (!global.__rootStore) {
  global.__rootStore = new RootStore();
}

export const rootStore = global.__rootStore;
