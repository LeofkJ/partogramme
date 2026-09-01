import { makeAutoObservable, runInAction, computed, observable } from "mobx";
import { makePersistable } from "mobx-persist-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  private realtimeHadDropped = false;
  // Floor between reconnect-triggered refetches — a channel that errors and
  // reconnects in a tight loop (seen once already: an unfiltered
  // subscription did exactly this) must not be able to re-trigger
  // fetchFromServer(), and therefore a fresh subscribeToRealtime() call, on
  // every single cycle. Belt-and-suspenders on top of always filtering the
  // subscription now (see subscribeToRealtime).
  private lastReconnectRefetchAt = 0;

  constructor(rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, {
      rootStore: false,
      transportLayer: false,
      realtimeChannel: false,
      realtimeHadDropped: false,
      lastReconnectRefetchAt: false,
      isInSync: false,
      selectedPartogramme: computed,
    });
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
    // Survives a web page refresh, so the Graph screen can recover which
    // patient was open instead of just bouncing back to the menu.
    makePersistable(this, {
      name: "PartogrammeStore",
      properties: ["selectedPartogrammeId"],
      storage: AsyncStorage,
    });
  }

  get selectedPartogramme(): Partogramme | undefined {
    return this.partogrammeList.find(
      (partogramme) => partogramme.partogramme.id === this.selectedPartogrammeId
    );
  }

  // Called on app foreground (see App.js's AppState listener) — realtime's
  // own reconnect logic only fires on a clean websocket close/error, which
  // iOS/Android can bypass by silently suspending the socket on background,
  // so a phone locked for a while and reopened needs an explicit refetch.
  // Mirrors the exact nurse/doctor branch already duplicated in
  // Menu.tsx/Graph.tsx, plus re-loads the currently-open patient's own
  // vitals/tables/comments (Graph.tsx's fetchData list) since those have
  // their own separate realtime channels this doesn't otherwise touch.
  resyncOnForeground() {
    const userInfo = this.rootStore.userInfoStore.userInfo;
    if (userInfo.role === "NURSE") {
      this.fetchFromServer(this.rootStore.profileStore.profile.id);
    } else {
      this.fetchFromServer();
    }

    const current = this.selectedPartogramme;
    if (current === undefined) return;
    current.babyHeartFrequencyStore.loadBabyHeartFrequencies();
    current.babyDescentStore.loadBabyDescents();
    current.dilationStore.loadDilations();
    current.motherSystolicBloodPressureStore.loadData();
    current.motherDiastolicBloodPressureStore.loadData();
    current.motherContractionFrequencyStore.loadMotherContractionsFrequencies();
    current.motherContractionDurationStore.load();
    current.motherTemperatureStore.loadMotherTemperatures();
    current.motherHeartRateFrequencyStore.loadMotherHeartFrequencies();
    current.amnioticLiquidStore.loadAmnioticLiquids();
    current.commentStore.load();
  }

  // fetch partogrammes from the server and update the store
  async fetchFromServer(nurseId?: string) {
    this.state = "pending";
    const userInfo = this.rootStore.userInfoStore.userInfo;
    const isMaternityNurse = userInfo.role === "NURSE" && userInfo.nurseType === "MATERNITY";
    // Hospital staff (doctor or hospital nurse) both see every patient at
    // their hospital plus every not-yet-transferred patient at a linked
    // maternity — not just the nurse's own active queue anymore (see
    // task.md). Only maternity nurses keep the separate maternityId-scoped
    // fetch.
    const fetchPromise = isMaternityNurse && nurseId && userInfo.maternityId
      ? this.transportLayer.fetchPartogrammesForMaternityNurse(userInfo.maternityId)
      : this.transportLayer.fetchPartogrammesForHospitalStaff(userInfo.hospitalId as string);
    await fetchPromise
      .then((fetchedPartogrammes) => {
        runInAction(() => {
          if (fetchedPartogrammes) {
            const fetchedIds = new Set(fetchedPartogrammes.map((json) => json.id));
            for (let i = this.partogrammeList.length - 1; i >= 0; i--) {
              if (!fetchedIds.has(this.partogrammeList[i].partogramme.id)) {
                this.partogrammeList.splice(i, 1);
              }
            }
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

    // Hospital nurses now get the same "never drop a row" realtime handling
    // as doctors (full hospital visibility, not just her own active queue)
    // — only pass nurseId through for maternity nurses, who are the one
    // case subscribeToRealtime still branches on.
    this.subscribeToRealtime(isMaternityNurse ? nurseId : undefined);
  }

  // Subscribe to real-time changes on the Partogramme table.
  // When nurseId is provided (nurse role), only process events for that nurse's partogrammes.
  //
  // REVERTED 2026-09-01: briefly tried dropping the `filter` entirely so
  // hospital staff would also get live updates for a not-yet-transferred
  // maternity patient (hospitalId is null on those rows, so the old
  // hospitalId filter missed them — see the transfer-request staleness fix
  // below). An unfiltered postgres_changes subscription on this project
  // errors/reconnects in a tight loop instead of just staying open, and
  // every reconnect calls fetchFromServer() again — which pegged the
  // client hammering the same list query dozens of times a second. Back to
  // a real (if narrower) filter: hospitalId for hospital staff, maternityId
  // for maternity nurses — at least each role's own primary scope gets
  // reliable realtime again (maternity nurses previously got zero, since
  // they have no hospitalId at all). The cross-boundary case (a hospital
  // doctor's transfer-request state on a linked maternity's patient) is
  // covered by Graph.tsx's own periodic refetch instead, not realtime.
  private subscribeToRealtime(nurseId?: string) {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    const userInfo = this.rootStore.userInfoStore.userInfo;
    const isMaternityNurse = userInfo.nurseType === "MATERNITY";
    const filter = isMaternityNurse
      ? (userInfo.maternityId ? `maternityId=eq.${userInfo.maternityId}` : undefined)
      : (userInfo.hospitalId ? `hospitalId=eq.${userInfo.hospitalId}` : undefined);
    // No usable scope to filter on (shouldn't happen once userInfo has
    // loaded) — skip subscribing rather than risk another unfiltered,
    // reconnect-looping channel.
    if (!filter) return;

    const handlePayload = (payload: any) => {
      const row = payload.new as Partogramme_t["Row"];
      if (nurseId) {
        if (row.nurseId !== nurseId) return;
        // Claimed by a doctor (or finished) since her last fetch — she's no
        // longer "currently managing" it, so drop it from her list right
        // away instead of just updating its status in place. Local-only:
        // no server call, the state change already happened server-side.
        // Not for a midwife — she keeps permanent visibility into her
        // maternity's patients regardless of state (see
        // MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §2), so a state change
        // should update the row in place, never remove it.
        if (!isMaternityNurse && row.state !== "ADMITTED" && row.state !== "IN_PROGRESS") {
          runInAction(() => {
            const existing = this.partogrammeList.find((p) => p.partogramme.id === row.id);
            if (existing) this.partogrammeList.splice(this.partogrammeList.indexOf(existing), 1);
          });
          return;
        }
      }
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
          filter,
        },
        handlePayload
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Partogramme",
          filter,
        },
        handlePayload
      )
      .subscribe((status) => {
        // Supabase's websocket reconnects itself, but nothing re-syncs app
        // data afterward — a device offline for a few minutes would
        // otherwise miss any INSERT/UPDATE that happened during the gap.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.realtimeHadDropped = true;
        } else if (status === "SUBSCRIBED" && this.realtimeHadDropped) {
          this.realtimeHadDropped = false;
          const now = Date.now();
          if (now - this.lastReconnectRefetchAt < 10000) {
            logger.warn("partogrammeStore: skipping reconnect refetch, too soon since the last one", { msSinceLast: now - this.lastReconnectRefetchAt });
            return;
          }
          this.lastReconnectRefetchAt = now;
          this.fetchFromServer(nurseId);
        }
      });
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
        json.workFinishedDateTime,
        json.maternityId,
        json.transferReason,
        json.urgencyLevel,
      );
      partogramme ? this.partogrammeList.push(partogramme) : null;
    }
    if (json.isDeleted) {
      // The server already has isDeleted = true here (this only runs off a
      // fetch or realtime payload) — patients can no longer be deleted from
      // the app itself (see the auto soft-delete cron job), so this is
      // strictly local list cleanup, never a write back to the server.
      runInAction(() => {
        const index = this.partogrammeList.indexOf(partogramme);
        if (index !== -1) this.partogrammeList.splice(index, 1);
        this.state = "done";
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
    refDoctorId?: string | null
  ) {
    const creator = this.rootStore.userInfoStore.userInfo;
    // A maternity nurse's patient starts at the maternity, with no
    // hospital yet — she picks one when she actually transfers (see
    // Partogramme.transferToHospital). A hospital nurse's patient keeps
    // the existing behavior exactly as before.
    const isMaternityNurse = creator.role === "NURSE" && creator.nurseType === "MATERNITY";
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
      isMaternityNurse ? null : (hospitalId ? hospitalId : creator.hospitalId),
      // No longer inherited from the nurse's own assigned doctor — every
      // doctor in the hospital can already see/claim any patient (see
      // 2026-07-30_partogramme_ref_doctor_nullable.sql), so pre-assigning
      // one here was friction without real access-control value. Starts
      // empty; changeState sets it to whichever doctor actually claims or
      // finishes the patient.
      refDoctorId ?? null,
      null,
      isMaternityNurse ? creator.maternityId : null,
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
    workFinishedDateTime: null,
    isDeleted: false,
    hospitalId:  "",
    maternityId: null,
    refDoctorId: "",
    transferReason: null,
    transferRequestHospitalId: null,
    transferRequestByDoctorId: null,
    transferRequestRejectionComment: null,
    transferRequestStatus: null,
    urgencyLevel: null,
  };

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
    hospitalId: string | null,
    refDoctorId: string | null,
    workFinishedDateTime: string | null = null,
    maternityId: string | null = null,
    transferReason: string | null = null,
    urgencyLevel: Database["public"]["Enums"]["UrgencyLevel"] | null = null
  ) {
    makeAutoObservable(this, {
      store: false,
      autosave: false,
      asJson: computed,
      partogramme: observable,
      Last10MinutesDataIds: computed,
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
      workFinishedDateTime: workFinishedDateTime,
      isDeleted: isDeleted,
      hospitalId: hospitalId,
      maternityId: maternityId,
      refDoctorId: refDoctorId,
      transferReason: transferReason,
      transferRequestHospitalId: null,
      transferRequestByDoctorId: null,
      transferRequestRejectionComment: null,
      transferRequestStatus: null,
      urgencyLevel: urgencyLevel,
    };
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
  /**
   * Every data point of the partogramme across all stores, newest first,
   * so any entry can be corrected while the record is active.
   */
  get allDataSorted() {
    const allData = [];
    for (const store of this.dataStores) {
      for (const data of store.dataList) {
        allData.push(data);
      }
    }
    return allData.sort(
      (a, b) =>
        new Date(b.data.created_at).getTime() -
        new Date(a.data.created_at).getTime()
    );
  }

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
    // Only default workStartDateTime here if it was never actually set —
    // it's chosen at admission time and every elapsed-time calculation
    // downstream (table rows, graph bands) depends on it staying fixed.
    // Overwriting it on every transition to IN_PROGRESS reset the clock to
    // "now" each time, making elapsed time look stuck near zero forever.
    if (state === "IN_PROGRESS" && !data.workStartDateTime) {
      data.workStartDateTime = new Date().toISOString();
    }
    // Attributes the patient to whichever doctor actually claims
    // (TRANSFERRED) or finishes (WORK_FINISHED) them — nothing picks a
    // doctor up front anymore since every doctor in the hospital can
    // already see/act on any patient (see
    // 2026-07-30_partogramme_ref_doctor_nullable.sql). Always the current
    // actor, so attribution follows whoever actually did the work even if
    // a different doctor claimed it earlier.
    const actingUser = this.store.rootStore.userInfoStore.userInfo;
    if (actingUser.role === "DOCTOR" && (state === "TRANSFERRED" || state === "WORK_FINISHED")) {
      data.refDoctorId = this.store.rootStore.profileStore.profile.id;
    }
    // Starts the 30-day auto soft-delete clock (see
    // 2026-08-05_auto_softdelete_finished_partogrammes.sql) — only set once,
    // the same guard reasoning as workStartDateTime above.
    if (state === "WORK_FINISHED" && !data.workFinishedDateTime) {
      data.workFinishedDateTime = new Date().toISOString();
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

  // Hospital staff requesting a transfer of a linked-maternity patient to
  // their own hospital, from the patient's own (read-only) chart. Doesn't
  // change hospitalId/state — the midwife still has to accept or reject
  // (see acceptTransferRequest/rejectTransferRequest below).
  async requestTransfer(hospitalId: string, doctorProfileId: string) {
    const data = this.asJson;
    data.transferRequestHospitalId = hospitalId;
    data.transferRequestByDoctorId = doctorProfileId;
    // Clear any leftover outcome from a previous request cycle on this same
    // patient (e.g. rejected once, requested again later) so the new
    // pending request starts from a clean slate.
    data.transferRequestStatus = null;
    data.transferRequestRejectionComment = null;
    await this.store.transportLayer
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
        logger.warn("requestTransfer: updatePartogramme failed", { id: data.id, hospitalId, error: error?.message });
        return Promise.reject(error);
      });
  }

  // Maternity nurse → hospital referral (see MATERNITY_TRANSFER_PLAN.md).
  // Deliberately separate from changeState rather than folded into it —
  // this is the maternity nurse handing the patient to a hospital for the
  // first time, not a doctor claim/finish, and reuses none of that
  // method's attribution logic. State becomes TRANSFERRED with no
  // refDoctorId yet, same as an unclaimed referral — a doctor at the
  // target hospital claims it via the existing RÉCLAMER flow from there.
  async transferToHospital(
    hospitalId: string,
    reason: string,
  ) {
    const data = this.asJson;
    data.hospitalId = hospitalId;
    data.state = "TRANSFERRED";
    data.transferReason = reason;
    await this.store.transportLayer
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
        logger.warn("transferToHospital: updatePartogramme failed", { id: data.id, hospitalId, error: error?.message });
        return Promise.reject(error);
      });
  }

  // Midwife accepting a doctor's transfer request (see
  // MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §5) — same end state as her own
  // direct transferToHospital (patient lands in the requesting hospital's
  // unclaimed pool, RÉCLAMER handles the rest), just triggered from a
  // request instead of her own initiative. No reason/urgency to carry over
  // — the doctor's request didn't collect either.
  // transferRequestByDoctorId deliberately survives this (only
  // transferRequestHospitalId clears, which is what drops it off the
  // midwife's own pending list) — the requester's outcome notification
  // reads it via transferRequestStatus, and acknowledgeTransferRequestOutcome
  // is what finally clears it once they've actually seen the popup.
  // noFileOverride: lets the midwife renumber the dossier in the same
  // action when the target hospital already has a different patient with
  // this number (23505 on Partogramme_hospitalId_noFile_unique — see
  // MaternityTransferRequestsPanel's inline retry) — without this,
  // accepting was a dead end since nothing else lets her edit noFile.
  async acceptTransferRequest(noFileOverride?: number) {
    const data = this.asJson;
    const hospitalId = data.transferRequestHospitalId;
    if (!hospitalId) return;
    const linkStillExists = await this.store.transportLayer.hospitalMaternityLinkExists(
      data.maternityId as string,
      hospitalId,
    );
    if (!linkStillExists) {
      const error: any = new Error("Cet hôpital n'est plus lié à cette maternité.");
      error.code = "LINK_REMOVED";
      throw error;
    }
    data.hospitalId = hospitalId;
    data.state = "TRANSFERRED";
    data.transferRequestHospitalId = null;
    data.transferRequestStatus = "accepted";
    if (noFileOverride !== undefined) data.noFile = noFileOverride;
    await this.store.transportLayer
      .resolveTransferRequest(data)
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
        logger.warn("acceptTransferRequest: resolveTransferRequest failed", { id: data.id, error: error?.message, code: error?.code });
        return Promise.reject(error);
      });
  }

  // Midwife rejecting a doctor's transfer request — comment is optional,
  // nothing else about the patient changes, she keeps managing her
  // as normal. transferRequestByDoctorId survives this too, same reasoning
  // as acceptTransferRequest above.
  async rejectTransferRequest(comment: string | null) {
    const data = this.asJson;
    data.transferRequestHospitalId = null;
    data.transferRequestStatus = "rejected";
    data.transferRequestRejectionComment = comment;
    await this.store.transportLayer
      .resolveTransferRequest(data)
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
        logger.warn("rejectTransferRequest: resolveTransferRequest failed", { id: data.id, error: error?.message, code: error?.code });
        return Promise.reject(error);
      });
  }

  // Midwife moving an already-transferred patient to a different hospital
  // — a wrong claim, or a straight Hospital A -> Hospital B change (see
  // MATERNITY_HOSPITAL_WORKFLOW_PLAN.md, both turned out to be the same
  // action). Clears refDoctorId — whoever claimed her at the old hospital
  // no longer has any relationship to this patient, the new hospital's
  // doctor has to claim fresh via RÉCLAMER. State stays TRANSFERRED.
  async reassignToHospital(hospitalId: string, reason: string) {
    const data = this.asJson;
    data.hospitalId = hospitalId;
    data.refDoctorId = null;
    data.transferReason = reason;
    await this.store.transportLayer
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
        logger.warn("reassignToHospital: updatePartogramme failed", { id: data.id, hospitalId, error: error?.message });
        return Promise.reject(error);
      });
  }

  // Midwife pulling an already-transferred patient all the way back to her
  // own maternity, instead of reassigning her to a different hospital —
  // same override authority as reassignToHospital (works even if a doctor
  // already claimed her, see MATERNITY_HOSPITAL_WORKFLOW_PLAN.md). Clears
  // hospitalId/refDoctorId entirely and drops the state back to
  // IN_PROGRESS, same as any patient still being followed at the maternity.
  async pullBackToMaternity() {
    const data = this.asJson;
    data.hospitalId = null;
    data.refDoctorId = null;
    data.state = "IN_PROGRESS";
    data.transferReason = null;
    await this.store.transportLayer
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
        logger.warn("pullBackToMaternity: updatePartogramme failed", { id: data.id, error: error?.message });
        return Promise.reject(error);
      });
  }

  get isPartogrammeDataLocked() {
    return this.asJson.state !== "IN_PROGRESS";
  }
}
