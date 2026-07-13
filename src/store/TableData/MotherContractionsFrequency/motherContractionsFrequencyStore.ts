import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { Database } from "../../../../types/supabase";
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from "react-native-uuid";
import { Partogramme } from "../../partogramme/partogrammeStore";
import { Alert, Platform } from "react-native";
import { logger } from "../../../lib/logger";

export type MotherContractionsFrequency_t =
  Database["public"]["Tables"]["MotherContractionsFrequency"];

export class MotherContractionsFrequencyStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: MotherContractionsFrequency[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Fréquence des contractions";
  unit = "contractions/10min";
  unit_short = "/10min";

  constructor(
    partogrammeStore: Partogramme,
    rootStore: RootStore,
    transportLayer: TransportLayer
  ) {
    makeAutoObservable(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      sortedMotherContractionsFrequencyList: computed,
      highestRank: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch mother contractions frequencies from the server and update the store
  loadMotherContractionsFrequencies(
    partogrammeId: string = this.partogrammeStore.partogramme.id
  ) {
    this.isLoading = true;
    this.transportLayer
      .fetchMotherContractionsFrequencies(partogrammeId)
      .then((fetchedFrequencies) => {
        runInAction(() => {
          if (fetchedFrequencies) {
            fetchedFrequencies.forEach(
              (json: MotherContractionsFrequency_t["Row"]) =>
                this.updateMotherContractionsFrequencyFromServer(json)
            );
            this.isLoading = false;
          }
        });
      });
  }

  // Update a mother contractions frequency with information from the server. Guarantees a mother contractions frequency only
  // exists once. Might either construct a new frequency, update an existing one,
  // or remove a frequency if it has been deleted on the server.
  updateMotherContractionsFrequencyFromServer(
    json: MotherContractionsFrequency_t["Row"]
  ) {
    let frequency = this.dataList.find(
      (frequency) => frequency.data.id === json.id
    );
    if (!frequency) {
      frequency = new MotherContractionsFrequency(
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
      this.removeMotherContractionsFrequency(frequency);
    } else {
      frequency.updateFromJson(json);
    }
  }

  // Create a new mother contractions frequency on the server and add it to the store
  createMotherContractionsFrequency(
    motherContractionsFrequency: number,
    created_at: string,
    Rank: number = this.highestRank + 1,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    const frequency = new MotherContractionsFrequency(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      motherContractionsFrequency,
      created_at,
      partogrammeId,
      Rank,
      isDeleted
    );
    this.dataList.push(frequency);
    return frequency;
  }

  // Delete a mother contractions frequency from the store
  removeMotherContractionsFrequency(frequency: MotherContractionsFrequency) {
    this.dataList.splice(this.dataList.indexOf(frequency), 1);
    frequency.data.isDeleted = true;
    this.transportLayer.updateMotherContractionsFrequency(frequency.data);
  }

  // Get mother contractions frequency list sorted by the delta time between now and the created_at date
  get sortedMotherContractionsFrequencyList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Get the highest rank of the mother contractions frequency list
  get highestRank() {
    return this.dataList.reduce((prev, current) => {
      return prev > current.data.Rank ? prev : current.data.Rank;
    }, 0);
  }

  // Get mother contractions frequency list as string
  get motherContractionFrequencyListAsString() {
    return this.sortedMotherContractionsFrequencyList.map((frequency) => {
      return frequency.data.value.toString() + " " + this.unit_short;
    });
  }

  // clean up the store
  cleanUp() {
    this.dataList.splice(0, this.dataList.length);
    this.state = "done";
    this.isInSync = false;
    this.isLoading = false;
  }
}

export class MotherContractionsFrequency {
  data: MotherContractionsFrequency_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
    };

  store: MotherContractionsFrequencyStore;
  partogrammeStore: Partogramme;

  constructor(
    store: MotherContractionsFrequencyStore,
    partogrammeStore: Partogramme,
    id: string,
    motherContractionsFrequency: number,
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
      value: motherContractionsFrequency,
      created_at: created_at,
      partogrammeId: partogrammeId,
      Rank: Rank,
      isDeleted: isDeleted,
    };

    this.store.transportLayer.updateMotherContractionsFrequency(this.data);
  }

  get asJson() {
    return {
      ...this.data,
    };
  }

  updateFromJson(json: MotherContractionsFrequency_t["Row"]) {
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
    let updatedData = this.asJson;
    updatedData.value = Number(value);
    this.store.transportLayer
      .updateMotherContractionsFrequency(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = updatedData;
        });
      })
      .catch((error: any) => {
        logger.warn("MotherContractionsFrequency.update failed", { id: this.data.id, error: error?.message });
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
    this.store.removeMotherContractionsFrequency(this);
  }

  dispose() {
  }
}
