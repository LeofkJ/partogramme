import { TransportLayer } from "../transport/transportLayer";
import { PartogrammeStore } from "./partogramme/partogrammeStore";
import { ProfileStore } from "./user/profileStore";
import { UserInfoStore } from "./user/userInfoStore";

export class RootStore {
  profileStore: ProfileStore;
  partogrammeStore: PartogrammeStore;
  userInfoStore: UserInfoStore;
  transportLayer: TransportLayer;

  constructor() {
    this.transportLayer = new TransportLayer();
    this.profileStore = new ProfileStore(this);
    this.userInfoStore = new UserInfoStore(this);
    this.partogrammeStore = new PartogrammeStore(this, this.transportLayer);
  }
}

declare global {
  var __rootStore: RootStore | undefined;
}

if (!global.__rootStore) {
  global.__rootStore = new RootStore();
}

export const rootStore = global.__rootStore;
