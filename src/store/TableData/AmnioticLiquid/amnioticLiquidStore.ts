import { computed, makeAutoObservable, observable, runInAction } from "mobx";
import { Database } from '../../../../types/supabase';
import { TransportLayer } from "../../../transport/transportLayer";
import { RootStore } from "../../rootStore";
import uuid from "react-native-uuid";
import { Partogramme } from "../../partogramme/partogrammeStore";
import { throws } from "assert";
import { liquidStates, getStringByEnum } from '../../../../types/constants';
import { isLiquidState } from "../../../misc/CheckTypes";
import { logger } from "../../../lib/logger";
import { notify } from "../../../lib/notify";

export type AmnioticLiquid_t =
  Database["public"]["Tables"]["amnioticLiquid"];

export class AmnioticLiquidStore {
  rootStore: RootStore;
  partogrammeStore: Partogramme;
  transportLayer: TransportLayer;
  dataList: AmnioticLiquid[] = [];
  state = "done"; // "pending", "done" or "error"
  isInSync = false;
  name = "Liquides amniotiques";
  unit = "";

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
      sortedAmnioticLiquidList: computed,
      highestRank: computed,
      amnioticLiquidAsTableString: computed,
      orderedAmnioticLiquidList: computed,
    });
    this.partogrammeStore = partogrammeStore;
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  // Fetch amniotic liquids from the server and update the store
  async loadAmnioticLiquids(
    partogrammeId: string = this.partogrammeStore.partogramme.id
  ) {
    this.state = "pending";
    this.transportLayer
      .fetchAmnioticLiquids(partogrammeId)
      .then((fetchedLiquids:any) => {
        runInAction(() => {
          if (fetchedLiquids) {
            fetchedLiquids.forEach((json: AmnioticLiquid_t["Row"]) =>
              this.updateAmnioticLiquidFromServer(json)
                .catch((error) => {
                  logger.warn("loadAmnioticLiquids: updateAmnioticLiquidFromServer failed", { id: json.id, error: error?.message });
                  notify.error("Erreur", "Impossible de charger les liquides amniotiques");
                })
                .then(() => { })
            )
            this.state = "done";
          }
        });
      })
      .catch((error:any) => {
        this.state = "error";
        logger.warn("loadAmnioticLiquids failed", { partogrammeId, error: error?.message });
        notify.error("Erreur", "Impossible de charger les liquides amniotiques");
        return Promise.reject(error);
      });
  }

  // Update an amniotic liquid with information from the server. Guarantees an amniotic liquid only
  // exists once. Might either construct a new liquid, update an existing one,
  // or remove a liquid if it has been deleted on the server.
  async updateAmnioticLiquidFromServer(json: AmnioticLiquid_t["Row"]) {
    let liquid = this.dataList.find(
      (liquid) => liquid.data.id === json.id
    );
    if (!liquid) {
      liquid = new AmnioticLiquid(
        this,
        this.partogrammeStore,
        json.id,
        json.created_at,
        json.partogrammeId,
        json.Rank,
        json.isDeleted,
        json.value
      );
      this.transportLayer
        .updateAmnioticLiquid(liquid.data)
        .then(() => {
          runInAction(() => {
            this.dataList.push(liquid!);
            this.state = "done";
          });
        })
        .catch((error:any) => {
          runInAction(() => {
            this.state = "error";
          });
          logger.warn("updateAmnioticLiquidFromServer: updateAmnioticLiquid failed", { id: json.id, error: error?.message });
          return Promise.reject(error);
        });
    }
    if (json.isDeleted) {
      this.removeAmnioticLiquid(liquid)
        .then(() => { })
        .catch((error) => {
          logger.warn("updateAmnioticLiquidFromServer: removeAmnioticLiquid failed", { id: json.id, error: error?.message });
          notify.error("Erreur", "Impossible de supprimer les liquides amniotiques");
          return Promise.reject(error);
        });
    } else {
      liquid.updateFromJson(json);
    }
  }

  // Create a new amniotic liquid on the server and add it to the store
  async createAmnioticLiquid(
    created_at: string,
    Rank: number,
    stateLiquid: Database["public"]["Enums"]["LiquidState"],
    isDeleted: boolean | null = false,
    partogrammeId: string = this.partogrammeStore.partogramme.id
  ) {
    const liquid = new AmnioticLiquid(
      this,
      this.partogrammeStore,
      uuid.v4().toString(),
      created_at,
      partogrammeId,
      Rank,
      isDeleted,
      stateLiquid
    );
    this.transportLayer
      .updateAmnioticLiquid(liquid.data)
      .then(() => {
        runInAction(() => {
          this.dataList.push(liquid!);
          this.state = "done";
        });
      })
      .catch((error:any) => {
        runInAction(() => {
          this.state = "error";
        });
        logger.warn("createAmnioticLiquid failed", { id: liquid.data.id, error: error?.message });
        return Promise.reject(error);
      });
    return liquid;
  }

  // Delete an amniotic liquid from the store
  async removeAmnioticLiquid(liquid: AmnioticLiquid) {
    liquid.data.isDeleted = true;
    this.transportLayer
      .updateAmnioticLiquid(liquid.data)
      .then(() => {
        runInAction(() => {
          this.dataList.splice(
            this.dataList.indexOf(liquid),
            1
          );
          this.state = "done";
        });
      })
      .catch((error:any) => {
        runInAction(() => {
          liquid.data.isDeleted = false;
          this.state = "error";
        });
        logger.warn("removeAmnioticLiquid failed", { id: liquid.data.id, error: error?.message });
        return Promise.reject(error);
      });
  }

  // Get amniotic liquid list sorted by the created_at date
  get sortedAmnioticLiquidList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Get the highest rank of the amniotic liquid list
  get highestRank() {
    return this.dataList.reduce((prev, current) => {
      return prev > current.data.Rank
        ? prev
        : current.data.Rank;
    }, 0);
  }
  // Get the every amnioticliquid state from the list
  get amnioticLiquidAsTableString() {
    return this.orderedAmnioticLiquidList.map((liquid) => {
      return getStringByEnum(liquidStates, liquid.data.value);
    });
  }

  // Get the ordered amniotic liquid list
  get orderedAmnioticLiquidList() {
    return this.dataList.slice().sort((a, b) => {
      return (
        new Date(a.data.created_at).getTime() -
        new Date(b.data.created_at).getTime()
      );
    });
  }

  // Clean up the store
  cleanUp() {
    this.dataList.splice(0, this.dataList.length);
  }
}

export class AmnioticLiquid {
  data: AmnioticLiquid_t["Row"] = {
    id: "",
    value: "NONE",
    created_at: "",
    partogrammeId: "",
    Rank: null,
    isDeleted: false,
  };

  store: AmnioticLiquidStore;
  partogrammeStore: Partogramme;

  constructor(
    store: AmnioticLiquidStore,
    partogrammeStore: Partogramme,
    id: string,
    created_at: string,
    partogrammeId: string,
    Rank: number,
    isDeleted: boolean | null = false,
    stateLiquid: Database["public"]["Enums"]["LiquidState"]
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
      created_at: created_at,
      partogrammeId: partogrammeId,
      Rank: Rank,
      isDeleted: isDeleted,
      value: stateLiquid,
    };
  }

  get asJson() {
    return {
      ...this.data,
    };
  }

  updateFromJson(json: AmnioticLiquid_t["Row"]) {
    this.data = json;
  }

  delete() {
    this.store.removeAmnioticLiquid(this)
      .then(() => {
      })
      .catch((error) => {
        logger.warn("AmnioticLiquid.delete failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de supprimer les liquides amniotiques");
      });
  }

  async update(value: String) {
    let updatedData = this.asJson;
    updatedData.value = value;
    this.store.transportLayer
      .updateAmnioticLiquid(updatedData)
      .then((response:any) => {
        runInAction(() => {
          this.data = updatedData;
        })
      })
      .catch((error:any) => {
        logger.warn("AmnioticLiquid.update failed", { id: this.data.id, error: error?.message });
        notify.error("Erreur", "Impossible de mettre à jour les liquides amniotiques");
        runInAction(() => {
          this.store.state = "error";
        });
        return Promise.reject(error);
      });
  }

  dispose() {
  }
}
