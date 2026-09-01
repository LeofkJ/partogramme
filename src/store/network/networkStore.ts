import { makeAutoObservable, runInAction } from "mobx";
import { NativeModules } from "react-native";
import type { NetInfoSubscription } from "@react-native-community/netinfo";
import { RootStore } from "../rootStore";
import { logger } from "../../lib/logger";

/** App-wide connectivity awareness — backs OfflineBanner.tsx. Before this,
 * the app had zero knowledge of being offline; it only found out when a
 * specific in-flight request failed or hung. `start()` is self-contained
 * (no auth dependency) so it works even on the pre-login screen. */
export class NetworkStore {
  isOffline = false;

  rootStore: RootStore;
  private unsubscribe: NetInfoSubscription | null = null;
  private offlineTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, { rootStore: false });
    this.rootStore = rootStore;
  }

  start() {
    if (this.unsubscribe) return;
    // The native module isn't linked into this build yet (needs a dev
    // client rebuild after `expo install @react-native-community/netinfo`).
    // Requiring netinfo's JS wrapper at all — even inside a try/catch —
    // triggers its own internal invariant/error logging as a side effect
    // of module evaluation, regardless of whether the thrown exception
    // itself gets caught. Checking the native module's registration first
    // avoids ever loading that wrapper until it's actually there, so this
    // stays silent (isOffline just stays false) until rebuilt.
    if (!NativeModules.RNCNetInfo) return;
    try {
      const mod = require("@react-native-community/netinfo");
      const NetInfo = mod.default ?? mod;
      this.unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
        if (this.offlineTimer) {
          clearTimeout(this.offlineTimer);
          this.offlineTimer = null;
        }
        // The iOS Simulator's reachability check flaps isConnected
        // true/false/true within a second or two on its own, with no real
        // connectivity change — going straight off that toggled the banner
        // (and its mount/unmount animation) on every flap. Reconnects apply
        // immediately since there's no harm in hiding the banner fast, but
        // going offline needs to hold for a beat before it's trusted.
        if (state.isConnected === false) {
          this.offlineTimer = setTimeout(() => {
            runInAction(() => {
              this.isOffline = true;
            });
          }, 1500);
        } else {
          runInAction(() => {
            this.isOffline = false;
          });
        }
      });
    } catch (error: any) {
      logger.warn("NetworkStore: NetInfo unavailable", { error: error?.message });
    }
  }

  stop() {
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
      this.offlineTimer = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
