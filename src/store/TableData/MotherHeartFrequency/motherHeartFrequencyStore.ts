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

export type MotherHeartFrequency_t =
  Database["public"]["Tables"]["MotherHeartFrequency"];

const MOTHER_BPM_MIN = 30;
const MOTHER_BPM_MAX = 250;

export class MotherHeartFrequencyStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: MotherHeartFrequency[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Fréquence cardiaque de la mère";
  unit = "bpm";
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(
    partogrammeStore: Partogramme,
    rootStore: RootStore,
    transportLayer: TransportLayer
  ) {
    makeAutoObservable<MotherHeartFrequencyStore, "realtimeChannel">(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      realtimeChannel: false,
      sortedMotherHeartFrequencyList: computed,
      highestRank: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch mother heart frequencies from the server and update the store
  loadMotherHeartFrequencies(
    partogrammeId: string = this.partogrammeStore.partogramme.id
  ) {
    this.isLoading = true;
    this.transportLayer
      .fetchMotherHeartFrequencies(partogrammeId)
      .then((fetchedFrequencies) => {
        runInAction(() => {
          if (fetchedFrequencies) {
            fetchedFrequencies.forEach((json: MotherHeartFrequency_t["Row"]) =>
              this.updateMotherHeartFrequencyFromServer(json)
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
    this.realtimeChannel = subscribeToPartogrammeTable<MotherHeartFrequency_t["Row"]>(
      `MotherHeartFrequency-${partogrammeId}`,
      "MotherHeartFrequency",
      partogrammeId,
      (row) => runInAction(() => this.updateMotherHeartFrequencyFromServer(row))
    );
  }

  // Update a mother heart frequency with information from the server. Guarantees a mother heart frequency only
  // exists once. Might either construct a new frequency, update an existing one,
  // or remove a frequency if it has been deleted on the server.
  updateMotherHeartFrequencyFromServer(json: MotherHeartFrequency_t["Row"]) {
    const existing = this.dataList.find(
      (frequency) => frequency.data.id === json.id
    );
    // Check isDeleted before constructing — a self-echoed realtime update for
    // a row already removed locally shouldn't resurrect it just to delete it
    // again (that flicker is what required a second delete tap).
    if (json.isDeleted) {
      if (existing) this.removeMotherHeartFrequency(existing);
      return;
    }
    if (!existing) {
      const frequency = new MotherHeartFrequency(
        this,
        this.partogrammeStore,
        json.id,
        json.value,
        json.created_at,
        json.partogrammeId,
        json.Rank,
        json.isDeleted
      );
      this.dataList.push(frequency);
    } else {
      existing.updateFromJson(json);
    }
  }

  // Create a new mother heart frequency on the server and add it to the
  // store — only added to dataList once the write is confirmed, so a
  // failed write (bad connection) never leaves a phantom reading on the chart.
  createMotherHeartFrequency(
    value: number,
    created_at: string,
    Rank: number = this.highestRank + 1,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    if (!isPhysiologicallyPlausible(value, MOTHER_BPM_MIN, MOTHER_BPM_MAX)) {
      notify.error("Erreur", `Valeur hors limites physiologiques (${MOTHER_BPM_MIN}–${MOTHER_BPM_MAX} bpm). Vérifiez la saisie.`);
      return;
    }
    const frequency = new MotherHeartFrequency(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      value,
      created_at,
      partogrammeId,
      Rank,
      isDeleted
    );
    this.transportLayer.updateMotherHeartFrequency(frequency.data)
      .then(() => {
        runInAction(() => {
          this.dataList.push(frequency);
        });
      })
      .catch((error: any) => {
        logger.warn("createMotherHeartFrequency failed", { id: frequency.data.id, error: error?.message });
        notify.error("Erreur", "Impossible d'ajouter la fréquence cardiaque de la mère. \nVeuillez réessayer plus tard.");
        return Promise.reject(error);
      });
    return frequency;
  }

  // Delete a mother heart frequency from the store
  removeMotherHeartFrequency(frequency: MotherHeartFrequency) {
    this.dataList.splice(this.dataList.indexOf(frequency), 1);
    frequency.data.isDeleted = true;
    this.transportLayer.updateMotherHeartFrequency(frequency.data);
  }

  // Get mother heart frequency list sorted by the delta time between now and the created_at date
  get sortedMotherHeartFrequencyList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Get the highest rank of the mother heart frequency list
  get highestRank() {
    return this.dataList.reduce((prev, current) => {
      return prev > current.data.Rank ? prev : current.data.Rank;
    }, 0);
  }

  get motherHeartRateFrequencyListAsString() {
    return this.sortedMotherHeartFrequencyList.map((frequency) => {
      return `${frequency.data.value} ${this.unit}`;
    });
  }

  // CleanUp mother heart frequency store
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
export class MotherHeartFrequency {
  data: MotherHeartFrequency_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };

  store: MotherHeartFrequencyStore;
  partogrammeStore: Partogramme;

  constructor(
    store: MotherHeartFrequencyStore,
    partogrammeStore: Partogramme,
    id: string,
    value: number,
    created_at: string,
    partogrammeId: string,
    Rank: number,
    isDeleted: boolean | null = false
  ) {
    makeAutoObservable(this, {
      store: false,
      partogrammeStore: false,
      data: observable,
      updateFromJson: false,
    });
    this.store = store;
    this.partogrammeStore = partogrammeStore;
    this.data = {
      id: id,
      value: value,
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

  updateFromJson(json: MotherHeartFrequency_t["Row"]) {
    this.data = json;
  }

  // Correction window: only editable/deletable for EDIT_WINDOW_MINUTES
  // after it was recorded — see isWithinEditWindow.
  get isEditable() {
    return isWithinEditWindow(this.data.created_at);
  }

  async update(value: String) {
    if (!this.isEditable) {
      notify.error("Erreur", `Cette valeur ne peut plus être modifiée (délai de ${EDIT_WINDOW_MINUTES} minutes dépassé).`);
      return Promise.reject(new Error("Edit window expired"));
    }
    let convValue = Number(value);
    if (isNaN(convValue)) {
      notify.error("Erreur", "La valeur saisie n'est pas un nombre. Veuillez saisir un nombre");
      return Promise.reject(new Error("Not a number"));
    }
    if (!isPhysiologicallyPlausible(convValue, MOTHER_BPM_MIN, MOTHER_BPM_MAX)) {
      notify.error("Erreur", `Valeur hors limites physiologiques (${MOTHER_BPM_MIN}–${MOTHER_BPM_MAX} bpm). Vérifiez la saisie.`);
      return Promise.reject(new Error("Out of range"));
    }
    let updatedData = this.asJson;
    updatedData.value = Number(value);
    this.store.transportLayer
      .updateMotherHeartFrequency(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = updatedData;
        });
      })
      .catch((error: any) => {
        logger.warn("MotherHeartFrequency.update failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de mettre à jour les " + this.store.name);
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  delete() {
    if (!this.isEditable) {
      notify.error("Erreur", `Cette valeur ne peut plus être supprimée (délai de ${EDIT_WINDOW_MINUTES} minutes dépassé).`);
      return;
    }
    this.store.removeMotherHeartFrequency(this);
  }

  dispose() {
  }
}
