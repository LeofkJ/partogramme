-- Explicit hospital <-> maternity relationship (see
-- MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §1). Replaces the implicit
-- region-text-match that the transfer dialog used until now — an admin now
-- explicitly links specific maternities to specific hospitals. `region`
-- columns on both tables stay as-is; they're reference/display info only
-- from here on, not the actual relationship.
--
-- Many-to-many: a maternity can reasonably relate to more than one
-- hospital (and vice versa), so this is a plain junction table, not a
-- single FK on either side.
--
-- Apply manually via the Supabase SQL editor, same as every other file
-- here.

-- hospitalId is uuid (matching "hospital".id's actual column type) while
-- maternityId is text (matching "maternity".id, created as text in
-- 2026-08-09_maternity_nurses_and_transfer.sql) — the two tables genuinely
-- use different id types, this isn't a typo.
create table "hospitalMaternityLink" (
  id text primary key,
  "hospitalId" uuid not null references "hospital"(id),
  "maternityId" text not null references "maternity"(id),
  unique ("hospitalId", "maternityId")
);

alter table "hospitalMaternityLink" enable row level security;

-- Broadly readable — a midwife needs it to know which hospitals she can
-- transfer to, a doctor needs it to know which maternities' alerts he can
-- see, same reasoning as "hospital"/"maternity" themselves being broadly
-- readable.
create policy "Authenticated users can view hospital-maternity links"
  on "hospitalMaternityLink"
  for select
  to authenticated
  using (true);

create policy "Admins can create hospital-maternity links"
  on "hospitalMaternityLink"
  for insert
  with check (public.is_admin());

create policy "Admins can delete hospital-maternity links"
  on "hospitalMaternityLink"
  for delete
  using (public.is_admin());
