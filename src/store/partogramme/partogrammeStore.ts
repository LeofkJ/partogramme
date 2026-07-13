import { makeAutoObservable, runInAction, computed, observable } from "mobx";
import uuid from "react-native-uuid";
import { logger } from "../../lib/logger";
import { Database } from "../../../types/supabase";
import { TransportLayer } from "../../transport/transportLayer";
import { RootStore } from "../rootStore";
import { supabase } from "../../initSupabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  BabyHeartFrequency,
  BabyHeartFrequencyStore,
} from "../GraphData/BabyHeartFrequency/babyHeartFrequencyStore";
import {
  Dilation,
  DilationStore,
} from "../GraphData/Dilatation/dilatationStore";
import {
  BabyDescent,
  BabyDescentStore,
} from "../GraphData/BabyDescent/babyDescentStore";
import {
  AmnioticLiquid,
  AmnioticLiquidStore,
} from "../TableData/AmnioticLiquid/amnioticLiquidStore";
import {
  MotherTemperature,
  MotherTemperatureStore,
} from "../TableData/MotherTemperature/motherTemperatureStore";
import {
  MotherHeartFrequency,
  MotherHeartFrequencyStore,
} from "../TableData/MotherHeartFrequency/motherHeartFrequencyStore";
import {
  MotherContractionsFrequency,
  MotherContractionsFrequencyStore,
} from "../TableData/MotherContractionsFrequency/motherContractionsFrequencyStore";
import {
  MotherSystolicBloodPressure,
  MotherSystolicBloodPressureStore,
} from "../TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore";
import {
  MotherDiastolicBloodPressure,
  MotherDiastolicBloodPressureStore,
} from "../TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { DataInputTable_t } from "../../components/Dialogs/DialogDataInputTable";
import {
  MotherContractionDuration,
  MotherContractionDurationStore,
} from "../TableData/MotherContractionDuration/MotherContractionDurationStore";
import { Comment, CommentStore } from "../Comment/CommentStore";

export type Partogramme_t = Database["public"]["Tables"]["Partogramme"];

export type dataStore_t =
  | BabyHeartFrequencyStore
  | DilationStore
  | BabyDescentStore
  | AmnioticLiquidStore
  | MotherTemperatureStore
  | MotherHeartFrequencyStore
  | MotherContractionsFrequencyStore
  | MotherContractionDurationStore
  | MotherSystolicBloodPressureStore
  | MotherDiastolicBloodPressureStore
  | CommentStore;

export type dataTable_t =
  | MotherSystolicBloodPressure
  | MotherDiastolicBloodPressure
  | MotherContractionsFrequency
  | MotherContractionDuration
  | MotherHeartFrequency
  | MotherTemperature
  | AmnioticLiquid;
export type data_t =
  | dataTable_t
  | BabyDescent
  | BabyHeartFrequency
  | Dilation
  | Comment;

export const getStatusBackgroundColor = (
  status: Database["public"]["Enums"]["PartogrammeState"]
) => {
  if (status === "ADMITTED") {
    return "#8c8c8c";
  }
  if (status === "IN_PROGRESS") {
    return "#fcdd7e";
  }
  if (status === "TRANSFERRED") {
    return "#168039";
  }
  if (status === "WORK_FINISHED") {
    return "#168039";
  }
};

export class PartogrammeStore {
  rootStore: RootStore;
  partogrammeList: Partogramme[] = [];
  state = "done"; // "pending", "done" or "error"
  isInSync = false;
  selectedPartogrammeId: string | null = null;
  transportLayer: TransportLayer;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, {
      rootStore: false,
      transportLayer: false,
      realtimeChannel: false,
      isInSync: false,
      selectedPartogramme: computed,
    });
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  get selectedPartogramme(): Partogramme | undefined {
    return this.partogrammeList.find(
      (partogramme) => partogramme.partogramme.id === this.selectedPartogrammeId
    );
  }

  // fetch partogrammes from the server and update the store
  async fetchFromServer(nurseId?: string) {
    this.state = "pending";
    await this.transportLayer
      .fetchPartogrammes(this.rootStore.userInfoStore.userInfo.hospitalId, nurseId)
      .then((fetchedPartogrammes) => {
        runInAction(() => {
          if (fetchedPartogrammes) {
            fetchedPartogrammes.forEach((json: Partogramme_t["Row"]) =>
              this.updatePartogrammeFromServer(json).catch((error) => {
                logger.warn("fetchFromServer: updatePartogrammeFromServer failed", { id: json.id, error: error?.message });
                return Promise.reject(error);
              })
            );
            this.state = "done";
          }
        });
      })
      .catch((error) => {
        runInAction(() => {
          this.state = "error";
        });
        logger.warn("fetchFromServer failed", { nurseId, error: error?.message });
        return Promise.reject(error);
      });

    this.subscribeToRealtime(nurseId);
  }

  // Subscribe to real-time changes on the Partogramme table for the current hospital.
  // When nurseId is provided (nurse role), only process events for that nurse's partogrammes.
  private subscribeToRealtime(nurseId?: string) {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    const hospitalId = this.rootStore.userInfoStore.userInfo.hospitalId;

    const handlePayload = (payload: any) => {
      const row = payload.new as Partogramme_t["Row"];
      if (nurseId && row.nurseId !== nurseId) return;
      runInAction(() => {
        this.updatePartogrammeFromServer(row);
      });
    };

    this.realtimeChannel = supabase
      .channel("partogramme-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Partogramme",
          filter: `hospitalId=eq.${hospitalId}`,
        },
        handlePayload
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Partogramme",
          filter: `hospitalId=eq.${hospitalId}`,
        },
        handlePayload
      )
      .subscribe();
  }

  // Update a partogramme with information from the server. Guarantees a partogramme only
  // exists once. Might either construct a new partogramme, update an existing one,
  // or remove a partogramme if it has been deleted on the server.
  async updatePartogrammeFromServer(json: Partogramme_t["Row"]) {
    let partogramme = this.partogrammeList.find(
      (partogramme) => partogramme.partogramme.id === json.id
    );
    if (!partogramme) {
      partogramme = new Partogramme(
        this,
        json.id,
        json.admissionDateTime,
        json.commentary,
        json.patientFirstName,
        json.patientLastName,
        json.noFile,
        json.nurseId,
        json.state,
        json.isDeleted,
        json.workStartDateTime,
        json.hospitalId,
        json.refDoctorId,
      );
      partogramme ? this.partogrammeList.push(partogramme) : null;
    }
    if (json.isDeleted) {
      await this.removePartogramme(partogramme)
        .then(() => {
          runInAction(() => {
            this.state = "done";
          });
        }
        )
        .catch((error) => {
          runInAction(() => {
            this.state = "error";
          });
          logger.warn("updatePartogrammeFromServer: removePartogramme failed", { id: json.id, error: error?.message });
          return Promise.reject(error);
        });
    } else {
      partogramme.updateFromjson(json);
    }
  }

  // Create a new partogramme on the server and add it to the store
  async createPartogramme(
    admissionDateTime: string,
    commentary: string,
    patientFirstName: string | null,
    patientLastName: string | null,
    noFile: number,
    state: Database["public"]["Enums"]["PartogrammeState"],
    workStartDateTime: string | null,
    hospitalId?: string,
    refDoctorId?: string
  ) {
    const partogramme = new Partogramme(
      this,
      uuid.v4().toString(),
      admissionDateTime,
      commentary,
      patientFirstName,
      patientLastName,
      noFile,
      this.rootStore.profileStore.profile.id,
      state,
      false,
      workStartDateTime,
      hospitalId ? hospitalId : this.rootStore.userInfoStore.userInfo.hospitalId,
      refDoctorId? refDoctorId : this.rootStore.userInfoStore.userInfo.refDoctorId,
    );
    this.state = "pending";
    await this.transportLayer
      .insertPartogramme(partogramme.partogramme)
      .then(() => {
        runInAction(() => {
          this.partogrammeList.push(partogramme);
          this.state = "done";
        });
        logger.info("Partogramme created", { id: partogramme.partogramme.id, noFile: Number(partogramme.partogramme.noFile) });
        return Promise.resolve(partogramme);
      })
      .catch((error) => {
        runInAction(() => {
          this.state = "error";
        });
        logger.error("Partogramme creation failed", { error: error?.message });
        return Promise.reject(error);
      });
    return partogramme;
  }

  // Delete a partogramme from the store
  async removePartogramme(partogramme: Partogramme) {
    partogramme.partogramme.isDeleted = true;
    await this.transportLayer
      .updatePartogramme(partogramme.partogramme)
      .then(() => {
        runInAction(() => {
          this.state = "done";
          this.partogrammeList.splice(this.partogrammeList.indexOf(partogramme), 1);
        });
        logger.info("Partogramme deleted", { id: partogramme.partogramme.id, noFile: Number(partogramme.partogramme.noFile) });
        return Promise.resolve(partogramme);
      })
      .catch((error) => {
        runInAction(() => {
          this.state = "error";
        });
        logger.error("Partogramme deletion failed", { error: error?.message });
        return Promise.reject(error);
      });
  }

  // Update the focused partogramme
  updateSelectedPartogramme(id: string) {
    this.selectedPartogrammeId = id;
  }

  /**
   * This function Clean Up every partogramme.
   */
  cleanUp() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.state = "done";
    this.selectedPartogrammeId = null;
    this.partogrammeList.splice(0, this.partogrammeList.length);
  }

  // Status flag for the loading state of the partogrammeStore
  // TODO: this is not used yet and it should be reworked correctly
  // get isLoading() {
  //   return (
  //     this.state === "pending" ||
  //     this.partogrammeList.some((partogramme) => partogramme.state === "pending")
  //   );
  // }
}

export class Partogramme {
  partogramme: Partogramme_t["Row"] = {
    id: "",
    admissionDateTime: "",
    commentary: "",
    patientFirstName: "",
    patientLastName: "",
    noFile: 0,
    nurseId: "",
    state: "ADMITTED",
    workStartDateTime: null,
    isDeleted: false,
    hospitalId:  "",
    refDoctorId: "",
  };

  periodicInterval: any;

  store: PartogrammeStore;
  babyHeartFrequencyStore: BabyHeartFrequencyStore;
  dilationStore: DilationStore;
  babyDescentStore: BabyDescentStore;
  amnioticLiquidStore: AmnioticLiquidStore;
  motherTemperatureStore: MotherTemperatureStore;
  motherHeartRateFrequencyStore: MotherHeartFrequencyStore;
  motherContractionFrequencyStore: MotherContractionsFrequencyStore;
  motherContractionDurationStore: MotherContractionDurationStore;
  motherSystolicBloodPressureStore: MotherSystolicBloodPressureStore;
  motherDiastolicBloodPressureStore: MotherDiastolicBloodPressureStore;
  commentStore: CommentStore;
  dataStores: dataStore_t[];
  tableStore: DataInputTable_t[];

  editedDataId: String = "";
  autosave = true;

  constructor(
    store: PartogrammeStore,
    id = uuid.v4().toString(),
    admissionDateTime: string,
    commentary: string,
    patientFirstName: string | null,
    patientLastName: string | null,
    noFile: number,
    nurseId: string,
    state: Database["public"]["Enums"]["PartogrammeState"],
    isDeleted: boolean | null = false,
    workStartDateTime: string | null,
    hospitalId: string,
    refDoctorId: string
  ) {
    makeAutoObservable(this, {
      store: false,
      autosave: false,
      asJson: computed,
      partogramme: observable,
      Last10MinutesDataIds: computed,
      isActive: computed,
      startPeriodicCheckForPartogrammeState: false,
      isPartogrammeDataLocked: computed,
    });
    this.store = store;
    this.babyHeartFrequencyStore = new BabyHeartFrequencyStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.dilationStore = new DilationStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.babyDescentStore = new BabyDescentStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.amnioticLiquidStore = new AmnioticLiquidStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.motherTemperatureStore = new MotherTemperatureStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.motherHeartRateFrequencyStore = new MotherHeartFrequencyStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.motherContractionFrequencyStore = new MotherContractionsFrequencyStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.motherContractionDurationStore = new MotherContractionDurationStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );
    this.motherSystolicBloodPressureStore =
      new MotherSystolicBloodPressureStore(
        this,
        this.store.rootStore,
        this.store.transportLayer
      );
    this.motherDiastolicBloodPressureStore =
      new MotherDiastolicBloodPressureStore(
        this,
        this.store.rootStore,
        this.store.transportLayer
      );
    this.commentStore = new CommentStore(
      this,
      this.store.rootStore,
      this.store.transportLayer
    );

    this.tableStore = [
      this.amnioticLiquidStore,
      this.motherTemperatureStore,
      this.motherHeartRateFrequencyStore,
      this.motherContractionFrequencyStore,
      this.motherContractionDurationStore,
      this.motherSystolicBloodPressureStore,
      this.motherDiastolicBloodPressureStore,
    ];

    this.dataStores = [
      this.babyHeartFrequencyStore,
      this.dilationStore,
      this.babyDescentStore,
      this.amnioticLiquidStore,
      this.motherTemperatureStore,
      this.motherHeartRateFrequencyStore,
      this.motherContractionFrequencyStore,
      this.motherContractionDurationStore,
      this.motherSystolicBloodPressureStore,
      this.motherDiastolicBloodPressureStore,
      this.commentStore,
    ];

    this.partogramme = {
      id: id,
      admissionDateTime: admissionDateTime,
      commentary: commentary,
      patientFirstName: patientFirstName,
      patientLastName: patientLastName,
      noFile: noFile,
      nurseId: nurseId,
      state: state,
      workStartDateTime: workStartDateTime,
      isDeleted: isDeleted,
      hospitalId: hospitalId,
      refDoctorId: refDoctorId,
    };

    if (!this.isActive) {
      this.changeState("WORK_FINISHED");
    }
    this.startPeriodicCheckForPartogrammeState();
  }

  // This code returns a JSON representation of the partogramme.
  delete() {
    this.partogramme.isDeleted = true;
    this.store.removePartogramme(this);
  }

  // This code returns a JSON representation of the partogramme.
  get asJson() {
    return {
      ...this.partogramme,
    };
  }

  // This code updates the partogramme from a JSON representation.
  // The partogramme is stored in this.partogramme.
  // The JSON representation is stored in json.
  // The function returns nothing.
  updateFromjson(json: Partogramme_t["Row"]) {
    this.autosave = false;
    this.partogramme = json;
    this.autosave = true;
  }

  /**
   * This function Clean Up every dataStore.
   */
  dispose() {
  }

  /**
   * @brief this function return a list of every data added in the last 10 minutes in the partogramme.
   * @returns the last 10 minutes data ids
   */
  get Last10MinutesDataIds() {
    const now = new Date();
    const last10Minutes = new Date(now.getTime() - 10 * 60000);
    const last10MinutesData = [];
    for (const store of this.dataStores) {
      for (const data of store.dataList) {
        if (
          new Date(data.data.created_at).getTime() > last10Minutes.getTime()
        ) {
          last10MinutesData.push(data);
        }
      }
    }
    return last10MinutesData;
  }

  /**
   * @brief this function return a list of every data added in the last 10 minutes in the partogramme.
   * @param ids the ids of the data to return
   * @returns the last 10 minutes data
   */
  getDataByIds(ids: String[]) {
    const Data = [];
    for (const store of this.dataStores) {
      for (const data of store.dataList) {
        if (ids.includes(data.data.id)) {
          Data.push(data);
        }
      }
    }
    return Data;
  }

  getDataById(id: String) {
    for (const store of this.dataStores) {
      for (const data of store.dataList) {
        if (id === data.data.id) {
          return data;
        }
      }
    }
    return undefined;
  }

  get dataToEdit(): data_t | undefined {
    let data = this.getDataById(this.editedDataId);
    if (data !== undefined) {
      return data;
    }
  }

  /**
   * Return the needed patient data store by iterating over the tableStore array.
   * @param storeName the name of the store to return
   * @returns the store if found, undefined otherwise
   */
  getDataStore(storeName: string) {
    for (const store of this.tableStore) {
      if (store.name === storeName) {
        return store;
      }
    }
    return undefined;
  }

  async changeState(state: Database["public"]["Enums"]["PartogrammeState"]) {
    const data = this.asJson;
    // If the partogramme is in progress, we set the workStartDateTime
    if (state === "IN_PROGRESS") {
      data.workStartDateTime = new Date().toISOString();
    }
    data.state = state;
    this.store.transportLayer
      .updatePartogramme(data)
      .then(() => {
        runInAction(() => {
          this.partogramme = data;
          this.store.state = "done";
        });
      })
      .catch((error) => {
        runInAction(() => {
          this.store.state = "error";
        });
        logger.warn("changeState: updatePartogramme failed", { id: data.id, state, error: error?.message });
        return Promise.reject(error);
      });
  }

  // if more than 12 Hours since workStartDate, the partogramme is not active anymore
  get isActive() {
    if (this.partogramme.workStartDateTime) {
      const workStartDateTime = new Date(this.partogramme.workStartDateTime);
      const now = new Date();
      const diff = now.getTime() - workStartDateTime.getTime();
      const diffHours = Math.floor(diff / (1000 * 60 * 60));
      if (diffHours > 12) {
        return false;
      }
    }
    return true;
  }

  startPeriodicCheckForPartogrammeState() {
    this.periodicInterval = setInterval(() => {
      if (!this.isActive) {
        this.changeState("WORK_FINISHED");
        clearInterval(this.periodicInterval);
      }
    }, 60000);
  }

  get isPartogrammeDataLocked() {
    return this.asJson.state !== "IN_PROGRESS";
  }
}
