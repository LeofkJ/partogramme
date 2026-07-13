/**
 * @file DataStore.ts
 * @brief Implementation of DataStore class that provides a schema for storing data for the application.
 */

import {
  observable,
  action,
  computed,
  makeObservable,
  runInAction,
} from "mobx";
import { RootStore } from "./rootStore";
import { Partogramme } from "./partogramme/partogrammeStore";
import { TransportLayer } from "../transport/transportLayer";
import { logger } from "../lib/logger";

export abstract class DataStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name;
  unit;

  constructor(
    partogrammeStore: Partogramme,
    rootStore: RootStore,
    transportLayer: TransportLayer,
    name: string,
    unit: string
  ) {
    makeObservable(this, {
      rootStore: false,
      transportLayer: false,
      partogrammeStore: false,
      isInSync: false,
      isLoading: observable,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
    this.name = name;
    this.unit = unit;
  }

  // Fetch mother heart frequencies from the server and update the store
  async load(partogrammeId: string = this.partogrammeStore.partogramme.id) {
    this.isLoading = true;
    this.fetch(partogrammeId).then((fetchedData) => {
      runInAction(() => {
        if (fetchedData) {
          fetchedData.forEach((json: any) => this.updateFromServer(json));
          this.isLoading = false;
        }
      });
    })
    .catch((error: any) => {
      this.isLoading = false;
      logger.warn(`${this.name}: load failed`, { partogrammeId, error: error?.message });
      return Promise.reject(error);
    });
    return Promise.resolve();
  }

  abstract fetch(partogrammeId: string): Promise<any>;

  // Update a data  with information from the server. Guarantees a data only
  // exists once. Might either construct a new frequency, update an existing one,
  // or remove a frequency if it has been deleted on the server.
  abstract updateFromServer(json: any): Promise<any>;

  // Create a data on the server and add it to the store
  abstract createData(
    json: any,
  ): Promise<any>;

  // Delete a data from the store
  abstract remove(data: any): Promise<any>;

  abstract get DataListAsString(): string[];

  // CleanUp store
  abstract cleanUp():any;
}
