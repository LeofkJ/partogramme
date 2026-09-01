-- Adds "Partogramme" to the supabase_realtime publication, if it isn't
-- already there — required for the realtime subscription in
-- partogrammeStore.ts to fire at all. Without this, no client ever
-- receives a live INSERT/UPDATE for this table regardless of what the
-- app-side subscription filter is set to.
--
-- Found while diagnosing: a hospital doctor's transfer request, once
-- rejected by the midwife, left the doctor's "DEMANDER UN TRANSFERT"
-- button stuck on "DEMANDE ENVOYÉE" (disabled) until they left the Graph
-- screen and came back — and a stale transferRequestStatus on either side
-- could make a genuine accept/reject fail with "already decided", since
-- resolveTransferRequest's `.is("transferRequestStatus", null)` guard no
-- longer matched the row. The app-side fix (partogrammeStore.ts's
-- subscription filter, and a periodic refetch in Graph.tsx as a fallback)
-- only helps once this table is actually broadcasting changes.
--
-- Apply manually via the Supabase SQL editor. Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'Partogramme'
  ) then
    alter publication supabase_realtime add table "Partogramme";
  end if;
end $$;
