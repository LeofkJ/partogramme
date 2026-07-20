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

export type MotherDiastolicBloodPressure_t =
  Database["public"]["Tables"]["MotherDiastolicBloodPressure"];

export class MotherDiastolicBloodPressureStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: MotherDiastolicBloodPressure[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Pressions artérielles diastolique de la mère";
  unit = "mmHg";
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(
    partogrammeStore: Partogramme,
    rootStore: RootStore,
    transportLayer: TransportLayer
  ) {
    makeAutoObservable<MotherDiastolicBloodPressureStore, "realtimeChannel">(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      realtimeChannel: false,
      sortedMotherBloodPressureList: computed,
      highestRank: computed,
      motherBloodPressureListAsString: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch mother blood pressures from the server and update the store
  loadData(partogrammeId: string = this.partogrammeStore.partogramme.id) {
    this.isLoading = true;
    this.transportLayer
      .fetchDiastolicMotherBloodPressures(partogrammeId)
      .then((fetchedPressures) => {
        runInAction(() => {
          if (fetchedPressures) {
            fetchedPressures.forEach(
              (json: MotherDiastolicBloodPressure_t["Row"]) =>
                this.updateMotherBloodPressureFromServer(json)
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
    this.realtimeChannel = subscribeToPartogrammeTable<MotherDiastolicBloodPressure_t["Row"]>(
      `MotherDiastolicBloodPressure-${partogrammeId}`,
      "MotherDiastolicBloodPressure",
      partogrammeId,
      (row) => runInAction(() => this.updateMotherBloodPressureFromServer(row))
    );
  }

  // Update a mother blood pressure with information from the server. Guarantees a mother blood pressure only
  // exists once. Might either construct a new pressure, update an existing one,
  // or remove a pressure if it has been deleted on the server.
  updateMotherBloodPressureFromServer(
    json: MotherDiastolicBloodPressure_t["Row"]
  ) {
    let pressure = this.dataList.find(
      (pressure) => pressure.data.id === json.id
    );
    if (!pressure) {
      pressure = new MotherDiastolicBloodPressure(
        this,
        this.partogrammeStore,
        json.id,
        json.value,
        json.created_at,
        json.partogrammeId,
        json.Rank,
        json.isDeleted
      );
      this.dataList.push(pressure);
    }
    if (json.isDeleted) {
      this.removeDiastolicMotherBloodPressure(pressure);
    } else {
      pressure.updateFromJson(json);
    }
  }

  // Create a new mother blood pressure on the server and add it to the store
  createNew(
    motherBloodPressure: number,
    created_at: string,
    Rank: number = this.highestRank + 1,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    const pressure = new MotherDiastolicBloodPressure(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      motherBloodPressure,
      created_at,
      partogrammeId,
      Rank,
      isDeleted
    );
    this.transportLayer
      .createDiastolicMotherBloodPressure(pressure.data)
      .then((response: any) => {
        runInAction(() => {
          this.dataList.push(pressure);
        });
      })
      .catch((error: any) => {
        logger.warn("createDiastolicMotherBloodPressure failed", { id: pressure.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de créer la pression artérielle diastolique de la mère");
        runInAction(() => {
          this.state = "error";
        });
      });
    return pressure;
  }

  // Delete a mother blood pressure from the store
  removeDiastolicMotherBloodPressure(pressure: MotherDiastolicBloodPressure) {
    this.dataList.splice(this.dataList.indexOf(pressure), 1);
    pressure.data.isDeleted = true;
    this.transportLayer.updateDiastolicMotherBloodPressure(pressure.data);
  }

  // Get mother blood pressure list sorted by the delta time between now and the created_at date
  get sortedMotherBloodPressureList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Get the highest rank of the mother blood pressure list
  get highestRank() {
    return this.dataList.reduce((prev, current) => {
      return prev > current.data.Rank ? prev : current.data.Rank;
    }, 0);
  }

  // Get every mother blood pressure in the list as string
  get motherBloodPressureListAsString() {
    return this.sortedMotherBloodPressureList.map((pressure) => pressure.data.value.toString() + " " + this.unit);
  }

  // clean up the store
  // Tears down just the live subscription, leaving loaded data in place —
  // for leaving a screen. cleanUp() (data-clearing) also calls this.
  stopRealtimeSync() {
    unsubscribeChannel(this.realtimeChannel);
    this.realtimeChannel = null;
  }

  cleanUp() {
    this.stopRealtimeSync();
    this.dataList.splice(0, this.dataList.length);
    this.state = "done";
    this.isInSync = false;
    this.isLoading = false;
  }
}

export class MotherDiastolicBloodPressure {
  data: MotherDiastolicBloodPressure_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };
  store: MotherDiastolicBloodPressureStore;
  partogrammeStore: Partogramme;

  constructor(
    store: MotherDiastolicBloodPressureStore,
    partogrammeStore: Partogramme,
    id: string,
    motherBloodPressure: number,
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
      value: motherBloodPressure,
      created_at: created_at,
      partogrammeId: partogrammeId,
      Rank: Rank,
      isDeleted: isDeleted,
    };

    this.store.transportLayer.updateDiastolicMotherBloodPressure(this.data);
  }

  get asJson() {
    return {
      ...this.data,
    };
  }

  updateFromJson(json: MotherDiastolicBloodPressure_t["Row"]) {
    this.data = json;
  }

  async update(value: String) {
    let convValue = Number(value);
    if (isNaN(convValue)) {
      notify.error("Erreur", "La valeur saisie n'est pas un nombre. Veuillez saisir un nombre");
      return Promise.reject("Not a number");
    }
    let updatedData = this.asJson;
    updatedData.value = Number(value);
    this.store.transportLayer
      .updateDiastolicMotherBloodPressure(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = updatedData;
        });
      })
      .catch((error: any) => {
        logger.warn("MotherDiastolicBloodPressure.update failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de mettre à jour les liquides amniotiques");
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  delete() {
    this.store.removeDiastolicMotherBloodPressure(this);
  }

  dispose() {
  }
}
