import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Database } from "../../../../types/supabase";
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from "react-native-uuid";
import { Partogramme } from "../../partogramme/partogrammeStore";
import { logger } from "../../../lib/logger";
import { notify } from "../../../lib/notify";
import { subscribeToPartogrammeTable, unsubscribeChannel } from "../../realtimeSync";
import { isPhysiologicallyPlausible, isWithinEditWindow, EDIT_WINDOW_MINUTES } from "../../../lib/validation";

export type BabyDescent_t = Database["public"]["Tables"]["BabyDescent"];

// Same 0-10 scale as Dilation — this app plots descent on the dilation
// graph's shared y-axis, not the standard clinical -5..+5 station scale.
const DESCENT_MIN = 0;
const DESCENT_MAX = 10;

export class BabyDescentStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: BabyDescent[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Descente du bébé";
  unit = "cm";
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(
    partogrammeStore: Partogramme,
    rootStore: RootStore,
    transportLayer: TransportLayer
  ) {
    makeAutoObservable<BabyDescentStore, "realtimeChannel">(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      realtimeChannel: false,
      sortedBabyDescentList: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch baby descents from the server and update the store
  loadBabyDescents(
    partogrammeId: string = this.partogrammeStore.partogramme.id
  ) {
    this.isLoading = true;
    this.transportLayer
      .fetchBabyDescents(partogrammeId)
      .then((fetchedDescents) => {
        runInAction(() => {
          if (fetchedDescents) {
            fetchedDescents.forEach((json: BabyDescent_t["Row"]) =>
              this.updateBabyDescentFromServer(json)
            );
            this.isLoading = false;
          }
        });
      });
    this.subscribeToRealtime(partogrammeId);
  }

  // Live-sync: any INSERT/UPDATE on this table for this partogramme, from
  // any device, gets pushed into the store without a manual refresh.
  private subscribeToRealtime(partogrammeId: string) {
    unsubscribeChannel(this.realtimeChannel);
    this.realtimeChannel = subscribeToPartogrammeTable<BabyDescent_t["Row"]>(
      `BabyDescent-${partogrammeId}`,
      "BabyDescent",
      partogrammeId,
      (row) => runInAction(() => this.updateBabyDescentFromServer(row))
    );
  }

  // Update a baby descent with information from the server. Guarantees a baby descent only
  // exists once. Might either construct a new descent, update an existing one,
  // or remove a descent if it has been deleted on the server.
  updateBabyDescentFromServer(json: BabyDescent_t["Row"]) {
    const existing = this.dataList.find(
      (descent) => descent.data.id === json.id
    );
    // Check isDeleted before constructing — a self-echoed realtime update for
    // a row already removed locally shouldn't resurrect it just to delete it
    // again (that flicker is what required a second delete tap).
    if (json.isDeleted) {
      if (existing) this.removeBabyDescent(existing);
      return;
    }
    if (!existing) {
      const descent = new BabyDescent(
        this,
        this.partogrammeStore,
        json.id,
        json.value,
        json.created_at,
        json.partogrammeId,
        json.Rank,
        json.isDeleted
      );
      this.dataList.push(descent);
    } else {
      existing.updateFromJson(json);
    }
  }

  // Create a new baby descent on the server and add it to the store — only
  // added to dataList once the write is confirmed, so a failed write (bad
  // connection) never leaves a phantom reading on the chart.
  createBabyDescent(
    babyDescent: number,
    created_at: string,
    Rank: number | null,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    if (!isPhysiologicallyPlausible(babyDescent, DESCENT_MIN, DESCENT_MAX)) {
      notify.error("Erreur", `Valeur hors limites physiologiques (${DESCENT_MIN}–${DESCENT_MAX}). Vérifiez la saisie.`);
      return;
    }
    const descent = new BabyDescent(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      babyDescent,
      created_at,
      partogrammeId,
      Rank,
      isDeleted
    );
    this.transportLayer.updateBabyDescent(descent.data)
      .then(() => {
        runInAction(() => {
          this.dataList.push(descent);
        });
      })
      .catch((error: any) => {
        logger.warn("createBabyDescent failed", { id: descent.data.id, error: error?.message });
        notify.error("Erreur", "Impossible d'ajouter la descente du bébé. \nVeuillez réessayer plus tard.");
        return Promise.reject(error);
      });
    return descent;
  }

  // Delete a baby descent from the store
  removeBabyDescent(descent: BabyDescent) {
    this.dataList.splice(this.dataList.indexOf(descent), 1);
    descent.data.isDeleted = true;
    this.transportLayer.updateBabyDescent(descent.data);
  }

  // Get baby descent list sorted by the delta time between now and the created_at date
  get sortedBabyDescentList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Clean up the store
  // Tears down just the live subscription, leaving loaded data in place —
  // for leaving a screen. cleanUp() (data-clearing) also calls this.
  stopRealtimeSync() {
    unsubscribeChannel(this.realtimeChannel);
    this.realtimeChannel = null;
  }

  cleanUp() {
    this.stopRealtimeSync();
    this.dataList.splice(0, this.dataList.length);
  }
}

export class BabyDescent {
  data : BabyDescent_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };

  store: BabyDescentStore;
  partogrammeStore: Partogramme;

  constructor(
    store: BabyDescentStore,
    partogrammeStore: Partogramme,
    id: string,
    babyDescent: number,
    created_at: string,
    partogrammeId: string,
    Rank: number | null,
    isDeleted: boolean | null = false
  ) {
    makeAutoObservable(this, {
      store: false,
      partogrammeStore: false,
      data: observable,
      updateFromJson: false,
      asJson: computed,
    });
    this.store = store;
    this.partogrammeStore = partogrammeStore;
    this.data = {
      id: id,
      value: babyDescent,
      created_at: created_at,
      partogrammeId: partogrammeId,
      Rank: Rank,
      isDeleted: isDeleted,
    };
  }

  get asJson() {
    return {
      ...this.data,
    };
  }

  updateFromJson(json: BabyDescent_t["Row"]) {
    this.data = json;
  }

  // Correction window: only editable/deletable for EDIT_WINDOW_MINUTES
  // after it was recorded — see isWithinEditWindow.
  get isEditable() {
    return isWithinEditWindow(this.data.created_at);
  }

  delete() {
    if (!this.isEditable) {
      notify.error("Erreur", `Cette valeur ne peut plus être supprimée (délai de ${EDIT_WINDOW_MINUTES} minutes dépassé).`);
      return;
    }
    this.store.removeBabyDescent(this);
  }

  async update(value : String)
  {
    if (!this.isEditable) {
      notify.error("Erreur", `Cette valeur ne peut plus être modifiée (délai de ${EDIT_WINDOW_MINUTES} minutes dépassé).`);
      return Promise.reject(new Error("Edit window expired"));
    }
    let convValue = Number(value);
    if (isNaN(convValue)) {
      notify.error("Erreur", "La valeur saisie n'est pas un nombre. Veuillez saisir un nombre");
      return Promise.reject(new Error("Not a number"));
    }
    if (!isPhysiologicallyPlausible(convValue, DESCENT_MIN, DESCENT_MAX)) {
      notify.error("Erreur", `Valeur hors limites physiologiques (${DESCENT_MIN}–${DESCENT_MAX}). Vérifiez la saisie.`);
      return Promise.reject(new Error("Out of range"));
    }
    let updatedData = this.asJson;
    updatedData.value = convValue;
    this.store.transportLayer
      .updateBabyDescent(updatedData)
      .then((response) => {
        runInAction(() => {
          this.data = updatedData;
        })
      })
      .catch((error) => {
        logger.warn("BabyDescent.update failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de mettre à jour la descente du bébé");
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  dispose() {
  }
}
