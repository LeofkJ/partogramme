import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/initSupabase";

/**
 * Subscribes to INSERT/UPDATE events on `table` for a single partogramme,
 * so edits saved from one device (any platform) show up on every other
 * device viewing that same partogramme without a manual refresh.
 */
export function subscribeToPartogrammeTable<T>(
  channelName: string,
  table: string,
  partogrammeId: string,
  onChange: (row: T) => void,
  onReconnect?: () => void
): RealtimeChannel {
  const handlePayload = (payload: any) => onChange(payload.new as T);
  let hadDropped = false;
  return supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table, filter: `partogrammeId=eq.${partogrammeId}` },
      handlePayload
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table, filter: `partogrammeId=eq.${partogrammeId}` },
      handlePayload
    )
    .subscribe((status) => {
      // Supabase's websocket reconnects itself, but nothing re-syncs app
      // data afterward — a device offline for a few minutes would
      // otherwise miss any INSERT/UPDATE that happened during the gap.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        hadDropped = true;
      } else if (status === "SUBSCRIBED" && hadDropped) {
        hadDropped = false;
        onReconnect?.();
      }
    });
}

export function unsubscribeChannel(channel: RealtimeChannel | null) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

/**
 * Subscribes to UPDATE events on Partogramme rows where the current user
 * is the transfer requester — so a doctor/hospital nurse sees the
 * accept/reject outcome popup right away if they're online when the
 * midwife decides, instead of only finding out on their next login.
 */
export function subscribeToTransferOutcomes(
  requesterProfileId: string,
  onChange: (row: { id: string; noFile: number; transferRequestStatus: string | null; transferRequestRejectionComment: string | null }) => void,
  onReconnect?: () => void,
): RealtimeChannel {
  let hadDropped = false;
  return supabase
    .channel(`transfer-outcomes-${requesterProfileId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Partogramme",
        filter: `transferRequestByDoctorId=eq.${requesterProfileId}`,
      },
      (payload) => onChange(payload.new as any),
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        hadDropped = true;
      } else if (status === "SUBSCRIBED" && hadDropped) {
        hadDropped = false;
        onReconnect?.();
      }
    });
}
