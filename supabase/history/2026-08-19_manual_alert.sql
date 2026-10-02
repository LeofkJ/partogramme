-- Manual midwife-raised alerts (task.md's "Midwife should also be able to
-- raise/flag an alert manually" — Nicole specifically asked for this).
--
-- One-to-many: a patient can have several open alerts at once, each with
-- its own reason — a single boolean column on Partogramme couldn't
-- represent more than one at a time, so this replaces that first attempt
-- (manualAlert/manualAlertComment/manualAlertAt columns, dropped below —
-- never confirmed deployed) with a real table.
--
-- Visibility mirrors Partogramme's own RLS exactly: ANY midwife at the
-- patient's maternity (not just the one who created the patient — matches
-- how she already sees every patient at her maternity, not just her own)
-- can raise/delete an alert; hospital staff (doctor/nurse) can see alerts
-- for any patient associated with their hospital, same as they see the
-- patient itself.
--
-- Apply manually via the Supabase SQL editor. Idempotent, safe to re-run.

alter table "Partogramme" drop column if exists "manualAlert";
alter table "Partogramme" drop column if exists "manualAlertComment";
alter table "Partogramme" drop column if exists "manualAlertAt";

create table if not exists "ManualAlert" (
  id uuid primary key default gen_random_uuid(),
  "partogrammeId" uuid not null references "Partogramme"(id),
  comment text not null,
  "createdAt" timestamptz not null default now(),
  "isDeleted" boolean not null default false
);

alter table "ManualAlert" enable row level security;

drop policy if exists "Maternity nurses can view alerts at their maternity" on "ManualAlert";
create policy "Maternity nurses can view alerts at their maternity"
  on "ManualAlert"
  for select
  using (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  );

drop policy if exists "Hospital staff can view alerts for their patients" on "ManualAlert";
create policy "Hospital staff can view alerts for their patients"
  on "ManualAlert"
  for select
  using (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and u.role in ('DOCTOR', 'NURSE')
        and (
          u."hospitalId" = p."hospitalId"
          or exists (
            select 1 from "hospitalMaternityLink" hml
            where hml."hospitalId" = u."hospitalId"
              and hml."maternityId" = p."maternityId"
          )
        )
    )
  );

drop policy if exists "Maternity nurses can create alerts at their maternity" on "ManualAlert";
create policy "Maternity nurses can create alerts at their maternity"
  on "ManualAlert"
  for insert
  with check (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  );

drop policy if exists "Maternity nurses can delete alerts at their maternity" on "ManualAlert";
create policy "Maternity nurses can delete alerts at their maternity"
  on "ManualAlert"
  for update
  using (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  )
  with check (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  );
