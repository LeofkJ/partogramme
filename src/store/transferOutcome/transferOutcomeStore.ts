import { makeAutoObservable, runInAction } from "mobx";
import { RootStore } from "../rootStore";
import { TransportLayer } from "../../transport/transportLayer";
import { logger } from "../../lib/logger";
import { subscribeToTransferOutcomes, unsubscribeChannel } from "../realtimeSync";
import { RealtimeChannel } from "@supabase/supabase-js";

export type TransferOutcome = {
  partogrammeId: string;
  noFile: number;
  status: "accepted" | "rejected";
  comment: string | null;
};

/** Backs the "your transfer request was accepted/rejected" popup (see
 * DialogTransferOutcome.tsx) — for whichever doctor or hospital nurse made
 * the request, not just doctors (see 2026-08-19_hospital_staff_edit_and_request.sql,
 * hospital nurses request transfers too). Two delivery paths: a boot-time
 * check (checkOnBoot, mirrors AlertBannerStore's pattern) covers "I wasn't
 * logged in when the midwife decided," and a realtime subscription covers
 * "I was already looking at the app." Both funnel into the same `outcome`
 * field so the popup doesn't care which path found it. */
export class TransferOutcomeStore {
  outcome: TransferOutcome | null = null;

  rootStore: RootStore;
  transportLayer: TransportLayer;
  private channel: RealtimeChannel | null = null;

  constructor(rootStore: RootStore, transportLayer: TransportLayer) {
    makeAutoObservable(this, { rootStore: false, transportLayer: false, channel: false });
    this.rootStore = rootStore;
    this.transportLayer = transportLayer;
  }

  private toOutcome(row: {
    id: string;
    noFile: number;
    transferRequestStatus: string | null;
    transferRequestRejectionComment: string | null;
  }): TransferOutcome | null {
    if (row.transferRequestStatus !== "accepted" && row.transferRequestStatus !== "rejected") return null;
    return {
      partogrammeId: row.id,
      noFile: row.noFile,
      status: row.transferRequestStatus,
      comment: row.transferRequestRejectionComment,
    };
  }

  // Run once per login (checkSessionOnBoot's caller, same moment
  // AlertBannerStore hydrates) — catches an outcome that landed while the
  // requester was logged out or the app was closed.
  async checkOnBoot(profileId: string) {
    try {
      const row = await this.transportLayer.fetchTransferRequestOutcome(profileId);
      if (!row) return;
      const outcome = this.toOutcome(row);
      if (outcome) runInAction(() => { this.outcome = outcome; });
    } catch (error: any) {
      logger.warn("TransferOutcomeStore: checkOnBoot failed", { error: error?.message });
    }
  }

  // Run once per login, alongside checkOnBoot — stays subscribed for the
  // rest of the session so a decision made while the requester is actively
  // using the app shows up immediately instead of waiting for their next
  // login. unsubscribe() tears it down on logout.
  subscribe(profileId: string) {
    this.channel = subscribeToTransferOutcomes(profileId, (row) => {
      const outcome = this.toOutcome(row);
      if (outcome) runInAction(() => { this.outcome = outcome; });
    });
  }

  unsubscribe() {
    unsubscribeChannel(this.channel);
    this.channel = null;
  }

  // Called once the requester has actually seen the popup — clears the
  // outcome columns server-side (so it doesn't resurface on the next boot
  // check or a stray realtime replay) and locally.
  async acknowledge() {
    const current = this.outcome;
    if (!current) return;
    runInAction(() => { this.outcome = null; });
    try {
      await this.transportLayer.acknowledgeTransferRequestOutcome(current.partogrammeId);
    } catch (error: any) {
      logger.warn("TransferOutcomeStore: acknowledge failed", { error: error?.message });
    }
  }

  reset() {
    this.unsubscribe();
    this.outcome = null;
  }
}
