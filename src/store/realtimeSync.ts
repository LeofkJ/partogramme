import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../initSupabase";

/**
 * Subscribes to INSERT/UPDATE events on `table` for a single partogramme,
 * so edits saved from one device (any platform) show up on every other
 * device viewing that same partogramme without a manual refresh.
 */
export function subscribeToPartogrammeTable<T>(
  channelName: string,
  table: string,
  partogrammeId: string,
  onChange: (row: T) => void
): RealtimeChannel {
  const handlePayload = (payload: any) => onChange(payload.new as T);
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
    .subscribe();
}

export function unsubscribeChannel(channel: RealtimeChannel | null) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
