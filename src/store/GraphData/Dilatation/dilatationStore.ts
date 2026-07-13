import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { Database } from "../../../../types/supabase";
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from 'react-native-uuid';
import { Partogramme } from "../../partogramme/partogrammeStore";
import { GraphData } from "../GraphData";
import { Alert, Platform } from "react-native";
import { logger } from "../../../lib/logger";

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

  constructor(partogrammeStore: Partogramme, rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
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
  cleanUp() {
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
      Platform.OS === "web"
        ? null
        : Alert.alert(
            "Erreur",
            "La valeur saisie n'est pas un nombre. Veuillez saisir un nombre"
          );
      return  Promise.reject("Not a number");
    }
    let updatedData = this.asJson;
    updatedData.value = Number(value);
    this.store.transportLayer
      .updateSystolicMotherBloodPressure(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = updatedData;
        });
      })
      .catch((error: any) => {
        logger.warn("Dilation.update failed", { id: this.data.id, error: error?.message });
        Platform.OS === "web"
          ? null
          : Alert.alert(
              "Erreur",
              "Impossible de mettre à jour les " + this.store.name
            );
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