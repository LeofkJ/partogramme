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
import { RealtimeChannel } from "@supabase/supabase-js";
import { RootStore } from "./rootStore";
import { Partogramme } from "./partogramme/partogrammeStore";
import { TransportLayer } from "../transport/transportLayer";
import { logger } from "../lib/logger";
import { subscribeToPartogrammeTable, unsubscribeChannel } from "./realtimeSync";

export abstract class DataStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  state = "pending"; // "pending", "done" or "error"
  isInSync = false;
  isLoading = false;
  name;
  unit;
  tableName;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(
    partogrammeStore: Partogramme,
    rootStore: RootStore,
    transportLayer: TransportLayer,
    name: string,
    unit: string,
    tableName: string
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
    this.tableName = tableName;
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
    this.subscribeToRealtime(partogrammeId);
    return Promise.resolve();
  }

  // Live-sync: any INSERT/UPDATE on this table for this partogramme, from
  // any device, gets pushed into the store without a manual refresh.
  private subscribeToRealtime(partogrammeId: string) {
    unsubscribeChannel(this.realtimeChannel);
    this.realtimeChannel = subscribeToPartogrammeTable(
      `${this.tableName}-${partogrammeId}`,
      this.tableName,
      partogrammeId,
      (row: any) => runInAction(() => this.updateFromServer(row))
    );
  }

  // Tears down just the live subscription, leaving loaded data in place —
  // for leaving a screen. cleanUp() (data-clearing) also calls this.
  stopRealtimeSync() {
    unsubscribeChannel(this.realtimeChannel);
    this.realtimeChannel = null;
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
