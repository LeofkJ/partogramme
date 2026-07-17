import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { Database } from "../../../../types/supabase";
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from "react-native-uuid";
import { Partogramme } from "../../partogramme/partogrammeStore";
import { TableData } from "../TableData";
import { logger } from "../../../lib/logger";
import { notify } from "../../../lib/notify";

export type MotherTemperature_t =
  Database["public"]["Tables"]["MotherTemperature"];

export class MotherTemperatureStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: MotherTemperature[] = [];
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name = "Températures de la mère";
  unit = "°C";

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
      sortedMotherTemperatureList: computed,
      highestRank: computed,
      motherTemperatureListAsString: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch mother temperatures from the server and update the store
  loadMotherTemperatures(
    partogrammeId: string = this.partogrammeStore.partogramme.id
  ) {
    this.isLoading = true;
    this.transportLayer
      .fetchMotherTemperatures(partogrammeId)
      .then((fetchedTemperatures) => {
        runInAction(() => {
          if (fetchedTemperatures) {
            fetchedTemperatures.forEach((json: MotherTemperature_t["Row"]) =>
              this.updateMotherTemperatureFromServer(json)
            );
            this.isLoading = false;
          }
        });
      });
  }

  // Update a mother temperature with information from the server. Guarantees a mother temperature only
  // exists once. Might either construct a new temperature, update an existing one,
  // or remove a temperature if it has been deleted on the server.
  updateMotherTemperatureFromServer(json: MotherTemperature_t["Row"]) {
    let temperature = this.dataList.find(
      (temperature) => temperature.data.id === json.id
    );
    if (!temperature) {
      temperature = new MotherTemperature(
        this,
        this.partogrammeStore,
        json.id,
        json.value,
        json.created_at,
        json.partogrammeId,
        json.Rank,
        json.isDeleted
      );
      this.dataList.push(temperature);
    }
    if (json.isDeleted) {
      this.removeMotherTemperature(temperature);
    } else {
      temperature.updateFromJson(json);
    }
  }

  // Create a new mother temperature on the server and add it to the store
  createMotherTemperature(
    motherTemperature: number,
    created_at: string,
    Rank: number = this.highestRank + 1,
    partogrammeId: string = this.partogrammeStore.partogramme.id,
    isDeleted: boolean | null = false
  ) {
    const temperature = new MotherTemperature(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      motherTemperature,
      created_at,
      partogrammeId,
      Rank,
      isDeleted
    );
    this.dataList.push(temperature);
    return temperature;
  }

  // Delete a mother temperature from the store
  removeMotherTemperature(temperature: MotherTemperature) {
    this.dataList.splice(this.dataList.indexOf(temperature), 1);
    temperature.data.isDeleted = true;
    this.transportLayer.updateMotherTemperature(temperature.data);
  }

  // Get mother temperature list sorted by the delta time between now and the created_at date
  get sortedMotherTemperatureList() {
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

  // Get mother temperature list as string
  get motherTemperatureListAsString() {
    return this.sortedMotherTemperatureList.map((temperature) => {
      return `${temperature.data.value} ${this.unit}`;
    });
  }

  // CleanUp mother temperature store
  cleanUp() {
    this.dataList.splice(0, this.dataList.length);
  }
}

export class MotherTemperature {
  data: MotherTemperature_t["Row"] = {
    id: "",
    value: 0,
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };

  store: MotherTemperatureStore;
  partogrammeStore: Partogramme;

  constructor(
    store: MotherTemperatureStore,
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

    this.store.transportLayer.updateMotherTemperature(this.data);
  }

  get asJson() {
    return {
      ...this.data,
    };
  }

  updateFromJson(json: MotherTemperature_t["Row"]) {
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
      .updateMotherTemperature(updatedData)
      .then((response: any) => {
        runInAction(() => {
          this.data = updatedData;
        });
      })
      .catch((error: any) => {
        logger.warn("MotherTemperature.update failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de mettre à jour les " + this.store.name);
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  delete() {
    this.store.removeMotherTemperature(this);
  }

  dispose() {
  }
}
