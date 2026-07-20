import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Database } from "../../../../types/supabase";
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from 'react-native-uuid';
import { Partogramme } from "../../partogramme/partogrammeStore";
import { GraphData } from "../GraphData";
import { logger } from "../../../lib/logger";
import { notify } from "../../../lib/notify";
import { subscribeToPartogrammeTable, unsubscribeChannel } from "../../realtimeSync";

export type Dilation_t = Database["public"]["Tables"]["Dilation"];

export class DilationStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: Dilation[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Dilation";
  unit = "cm";
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(partogrammeStore: Partogramme, rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable<DilationStore, "realtimeChannel">(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      realtimeChannel: false,
      sortedDilationList: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch dilations from the server and update the store
  loadDilations(partogrammeId: string = this.partogrammeStore.partogramme.id) {
    this.isLoading = true;
    this.transportLayer.fetchDilations(partogrammeId).then((fetchedDilations) => {
      runInAction(() => {
        if (fetchedDilations) {
          fetchedDilations.forEach((json: Dilation_t["Row"]) => this.updateDilationFromServer(json));
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
    this.realtimeChannel = subscribeToPartogrammeTable<Dilation_t["Row"]>(
      `Dilation-${partogrammeId}`,
      "Dilation",
      partogrammeId,
      (row) => runInAction(() => this.updateDilationFromServer(row))
    );
  }

  // Update a dilation with information from the server. Guarantees a dilation only exists once.
  // Might either construct a new dilation, update an existing one,
  // or remove a dilation if it has been deleted on the server.
  updateDilationFromServer(json: Dilation_t["Row"]) {
    let dilation = this.dataList.find((dilation) => dilation.data.id === json.id);
    if (!dilation) {
      dilation = new Dilation(
        this,
        this.partogrammeStore,
        json.id,
        json.created_at,
        json.value,
        json.partogrammeId,
        json.Rank,
        json.isDeleted
      );
      this.dataList.push(dilation);
    }
    if (json.isDeleted) {
      this.removeDilation(dilation);
    } else {
      dilation.updateFromJson(json);
    }
  }

  // Create a new dilation on the server and add it to the store
  createDilation(
    created_at: string,
    dilation: number,
    Rank: number | null,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    const dilationObj = new Dilation(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      created_at,
      dilation,
      partogrammeId,
      Rank,
      isDeleted
    );
    this.dataList.push(dilationObj);
    return dilationObj;
  }

  // Delete a dilation from the store
  removeDilation(dilation: Dilation) {
    this.dataList.splice(this.dataList.indexOf(dilation), 1);
    dilation.data.isDeleted = true;
    this.transportLayer.updateDilation(dilation.data);
  }

  // Get dilation list sorted by the delta time between now and the created_at date
  get sortedDilationList() {
    return this.dataList.slice().sort((a, b) => {
      return new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime();
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
  };
}

export class Dilation {
  data: Dilation_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };

  store: DilationStore;
  partogrammeStore: Partogramme;

  constructor(
    store: DilationStore,
    partogrammeStore: Partogramme,
    id: string,
    created_at: string,
    dilation: number,
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
      created_at: created_at,
      value: dilation,
      partogrammeId: partogrammeId,
      Rank: Rank,
      isDeleted: isDeleted,
    };

    this.store.transportLayer.updateDilation(this.data);
  }

  get asJson() {
    return {
      ...this.data,
    };
  }

  updateFromJson(json: Dilation_t["Row"]) {
    this.data = json;
  }

  async update(value: String) {
    let convValue = Number(value);
    if (isNaN(convValue)) {
      notify.error("Erreur", "La valeur saisie n'est pas un nombre. Veuillez saisir un nombre");
      return  Promise.reject("Not a number");
    }
    let updatedData = this.asJson;
    updatedData.value = Number(value);
    this.store.transportLayer
      .updateDilation(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = updatedData;
        });
      })
      .catch((error: any) => {
        logger.warn("Dilation.update failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de mettre à jour les " + this.store.name);
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  delete() {
    this.store.removeDilation(this);
  }

  dispose() {
  }
}