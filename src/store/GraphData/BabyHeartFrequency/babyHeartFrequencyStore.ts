import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { Database } from "../../../../types/supabase";
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from 'react-native-uuid';
import { Partogramme, data_t } from '../../partogramme/partogrammeStore';
import { Alert, Platform } from "react-native";
import { GraphData } from "../GraphData";
import { logger } from "../../../lib/logger";

export type BabyHeartFrequency_t = Database["public"]["Tables"]["BabyHeartFrequency"];

export class BabyHeartFrequencyStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: BabyHeartFrequency[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Fréquence Cardiaque du bébé";
  unit = "bpm";
  
  constructor(partogrammeStore: Partogramme, rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      sortedBabyHeartFrequencyList: computed,
      babyHeartFrequencyGraphData: computed,
      dataList: observable,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // fetch baby heart frequencies from the server and update the store
  loadBabyHeartFrequencies(partogrammeId: string = this.partogrammeStore.partogramme.id) {
    this.isLoading = true;
    this.transportLayer
      .fetchBabyHeartFrequencies(partogrammeId)
      .then((fetchedFrequencies:any) => {
        runInAction(() => {
          if (fetchedFrequencies) {
            fetchedFrequencies.forEach((json: BabyHeartFrequency_t["Row"]) =>
              this.updateBabyHeartFrequencyFromServer(json)
            );
            this.isLoading = false;
          }
        });
      })
       .catch((error:any) => {
        logger.warn("loadBabyHeartFrequencies failed", { partogrammeId, error: error?.message });
        runInAction(() => {
          this.isLoading = false;
          Alert.alert("Erreur", "Impossible de charger les fréquences cardiaques du bébé");
        });
      });
  }

  // Update a baby heart frequency with information from the server. Guarantees a baby heart frequency only
  // exists once. Might either construct a new frequency, update an existing one,
  // or remove a frequency if it has been deleted on the server.
  updateBabyHeartFrequencyFromServer(json: BabyHeartFrequency_t["Row"]) {
    let frequency = this.dataList.find(
      (frequency) => frequency.data.id === json.id
    );
    if (!frequency) {
      frequency = new BabyHeartFrequency(
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
    }
    if (json.isDeleted) {
      this.removeBabyHeartFrequency(frequency);
    } else {
      frequency.updateFromJson(json);
    }
  }

  // Create a new baby heart frequency on the server and add it to the store
  async createBabyHeartFrequency(
    babyFc: number,
    created_at: string,
    Rank: number | null,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    const frequency = new BabyHeartFrequency(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      babyFc,
      created_at,
      partogrammeId,
      Rank,
      isDeleted
    );

    this.isLoading = true;
    this.transportLayer.updateBabyHeartFrequency(frequency.data)
      .then(() => {
        runInAction(() => {
          this.isLoading = false;
          this.dataList.push(frequency);
        });
      })
      .catch((error:any) => {
        logger.warn("createBabyHeartFrequency failed", { id: frequency.data.id, error: error?.message });
        Alert.alert("Erreur",
        "Impossible d'ajouter la fréquence cardiaque du bébé. \n Veuillez réessayer plus tard.");
        runInAction(() => {
          this.isLoading = false;
        });
        Promise.reject(error);
      });
    return frequency;
  }

  // Delete a baby heart frequency from the store
  removeBabyHeartFrequency(frequency: BabyHeartFrequency) {
    this.dataList.splice(
      this.dataList.indexOf(frequency),
      1
    );
    frequency.data.isDeleted = true;
    this.transportLayer.updateBabyHeartFrequency(frequency.data);
  }

  // Get baby frequency list sorted by the delta time between now and the created_at date
  get sortedBabyHeartFrequencyList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Get baby frequency list sorted by the delta time between now and the created_at date
  get babyHeartFrequencyGraphData() {
    return this.sortedBabyHeartFrequencyList.map((frequency) => {
      return frequency.asGraphData;
    });
  }

  // CLean up the store
  cleanUp() {
    this.dataList.splice(0, this.dataList.length);
  }
}

export class BabyHeartFrequency {
  data : BabyHeartFrequency_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };

  store: BabyHeartFrequencyStore;
  partogrammeStore: Partogramme;

  constructor(
    store: BabyHeartFrequencyStore,
    partogrammeStore: Partogramme,
    id: string,
    value: number,
    created_at: string,
    partogrammeId: string,
    Rank: number | null,
    isDeleted: boolean | null = false
  ) {
    makeAutoObservable(this, {
      store: false,
      partogrammeStore: false,
      updateFromJson: false,
      asJson: computed,
      asGraphData: computed,
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
    return this.data;
  }

  get asGraphData() {
    const deltaTime = new Date(this.data.created_at).getTime() - new Date(this.partogrammeStore.asJson.workStartDateTime).getTime();
    const hours = deltaTime / (1000 * 60 * 60); // Calculate hours difference
    return {x: hours, y: this.data.value};
  };

  updateFromJson(json: BabyHeartFrequency_t["Row"]) {
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
      return Promise.reject("Not a number");
    }
    let updatedData = {
      ...this.data,
    }
    updatedData.value = Number(value);
    this.store.transportLayer
      .updateBabyHeartFrequency(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = {
            ...updatedData,
          };
        });
      })
      .catch((error: any) => {
        logger.warn("BabyHeartFrequency.update failed", { id: this.data.id, error: error?.message });
        Platform.OS === "web"
          ? null
          : Alert.alert(
              "Erreur",
              "Impossible de mettre à jour les liquides amniotiques"
            );
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  delete() {
    this.store.removeBabyHeartFrequency(this);
  }

  dispose() {
  }
}
