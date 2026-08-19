import * as Sentry from "../lib/sentry";
import { logger } from "../lib/logger";
import { supabase } from "../initSupabase";
import { AmnioticLiquid_t as AmnioticLiquid_t } from "../store/TableData/AmnioticLiquid/amnioticLiquidStore";
import { BabyDescent_t } from "../store/GraphData/BabyDescent/babyDescentStore";
import { BabyHeartFrequency_t } from "../store/GraphData/BabyHeartFrequency/babyHeartFrequencyStore";
import { Dilation_t } from "../store/GraphData/Dilatation/dilatationStore";
import { MotherSystolicBloodPressure_t } from "../store/TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore";
import { MotherDiastolicBloodPressure_t } from "../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { MotherContractionsFrequency_t } from "../store/TableData/MotherContractionsFrequency/motherContractionsFrequencyStore";
import { MotherHeartFrequency_t } from "../store/TableData/MotherHeartFrequency/motherHeartFrequencyStore";
import { MotherTemperature_t } from "../store/TableData/MotherTemperature/motherTemperatureStore";
import { Partogramme_t } from "../store/partogramme/partogrammeStore";
import { MotherContractionDuration_t } from "../store/TableData/MotherContractionDuration/MotherContractionDurationStore";
import { Comment_t } from "../store/Comment/CommentStore";
import { UserInfo } from "../store/user/userInfoStore";
import { Profile } from "../store/user/profileStore";

// supabase-js's FunctionsHttpError only exposes a generic "non-2xx status
// code" message; the actual JSON body the Edge Function returned lives on
// error.context (the raw Response). Unwrap it, log it, and return the real
// message so callers can surface it to the user instead of the generic
// wrapper message.
async function unwrapFunctionError(fnName: string, error: any): Promise<Error> {
  let body: any = undefined;
  try {
    body = await error?.context?.clone?.().json();
  } catch {
    try { body = await error?.context?.clone?.().text(); } catch {}
  }
  logger.error(`Edge Function ${fnName} failed: ${error?.message}`, { status: error?.context?.status, body });
  const realMessage = typeof body === "object" && body?.error ? body.error : undefined;
  return new Error(realMessage ?? error?.message ?? "Unknown error");
}

export class TransportLayer {
  client = supabase;

  async fetchPartogrammes(hospitalId: string, nurseId?: string) {
    if (nurseId && hospitalId) {
      // Only patients she's currently managing — once a patient is
      // TRANSFERRED (pushed by her or claimed by a doctor) or WORK_FINISHED,
      // she's no longer "currently managing" it (see
      // 2026-07-28_doctor_claim_patient.sql for the write-side counterpart).
      const { data, error } = await supabase
        .from("Partogramme")
        .select("*")
        .eq("nurseId", nurseId)
        .eq("hospitalId", hospitalId)
        .eq("isDeleted", false)
        .in("state", ["ADMITTED", "IN_PROGRESS"]);
      if (error) { logger.error(error.message, { code: error.code }); Sentry.captureException(error); throw error; }
      return data;
    } else {
      const { data, error } = await supabase
        .from("Partogramme")
        .select("*")
        .eq("hospitalId", hospitalId)
        .eq("isDeleted", false);
      if (error) { logger.error(error.message, { code: error.code }); Sentry.captureException(error); throw error; }
      return data;
    }
  }

  /** Every doctor/nurse at a hospital sees every patient associated with
   * that hospital, plus every not-yet-transferred patient at any maternity
   * linked to it — not just alert-flagged ones (see task.md, reverses the
   * earlier "doctors see alerts only" decision). Two queries merged
   * client-side rather than one OR'd query, since "own hospital" and
   * "linked maternity, not yet transferred" are different shapes
   * (hospitalId match vs. hospitalId is null + maternityId in a list). */
  async fetchPartogrammesForHospitalStaff(hospitalId: string) {
    const [ownHospital, linkedMaternities] = await Promise.all([
      supabase
        .from("Partogramme")
        .select("*")
        .eq("hospitalId", hospitalId)
        .eq("isDeleted", false),
      supabase
        .from("hospitalMaternityLink")
        .select("maternityId")
        .eq("hospitalId", hospitalId),
    ]);
    if (ownHospital.error) {
      logger.error(ownHospital.error.message, { code: ownHospital.error.code });
      Sentry.captureException(ownHospital.error);
      throw ownHospital.error;
    }
    if (linkedMaternities.error) {
      logger.error(linkedMaternities.error.message, { code: linkedMaternities.error.code });
      Sentry.captureException(linkedMaternities.error);
      throw linkedMaternities.error;
    }

    const maternityIds = linkedMaternities.data.map((l) => l.maternityId);
    if (maternityIds.length === 0) {
      return ownHospital.data;
    }

    const { data: maternityPatients, error: maternityError } = await supabase
      .from("Partogramme")
      .select("*")
      .in("maternityId", maternityIds)
      .is("hospitalId", null)
      .eq("isDeleted", false);
    if (maternityError) {
      logger.error(maternityError.message, { code: maternityError.code });
      Sentry.captureException(maternityError);
      throw maternityError;
    }

    return [...ownHospital.data, ...maternityPatients];
  }

  /** Same scope as fetchPartogrammes' nurse branch (her own ADMITTED/
   * IN_PROGRESS patients), just keyed on maternityId instead of
   * hospitalId — a separate method rather than overloading
   * fetchPartogrammes, since a maternity nurse has no hospitalId at all. */
  // Every non-deleted patient at this maternity, any state — a midwife
  // keeps permanent visibility into her maternity's patients even after
  // they've been transferred/finished elsewhere (see
  // MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §2). Not scoped to a single nurse's
  // own patients: any midwife at the maternity sees all of it, matching
  // what the RLS policy already permits (keyed on maternityId, not
  // nurseId) — this used to also filter by nurseId/state, narrower than
  // what was actually allowed.
  async fetchPartogrammesForMaternityNurse(maternityId: string) {
    const { data, error } = await supabase
      .from("Partogramme")
      .select("*")
      .eq("maternityId", maternityId)
      .eq("isDeleted", false);
    if (error) { logger.error(error.message, { code: error.code }); Sentry.captureException(error); throw error; }
    return data;
  }

  // Plain UPDATE, not upsert — every caller acts on a patient that already
  // exists (insertPartogramme below is the only genuine create path).
  // .upsert() compiles to INSERT ... ON CONFLICT DO UPDATE, which needs
  // the caller to satisfy an INSERT policy even when a conflict always
  // occurs — doctors have none (they never create patients), so any
  // doctor action routed through this (RÉCLAMER, transfer requests, state
  // changes) failed with a 42501 despite the UPDATE policy itself being
  // correct. Confirmed live: the exact same write succeeds as a plain
  // UPDATE under a doctor's identity, fails as an upsert.
  async updatePartogramme(partogramme: Partogramme_t["Row"]) {
    const { data, error } = await supabase
      .from("Partogramme")
      .update({ ...partogramme })
      .eq("id", partogramme.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertPartogramme(partogramme: Partogramme_t["Row"]) {
    const { data, error } = await supabase
      .from("Partogramme")
      .insert({ ...partogramme });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchBabyHeartFrequencies(partogrammeId: string) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteBabyHeartFrequency(id: string) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateBabyHeartFrequency(frequency: BabyHeartFrequency_t["Row"]) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .upsert({ ...frequency })
      .eq("id", frequency.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertBabyHeartFrequency(frequency: BabyHeartFrequency_t["Insert"]) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .insert({ ...frequency });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchDilations(partogrammeId: string) {
    const { data, error } = await supabase
      .from("Dilation")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateDilation(dilation: Dilation_t["Row"]) {
    const { data, error } = await supabase
      .from("Dilation")
      .upsert({ ...dilation })
      .eq("id", dilation.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertDilation(dilation: Dilation_t["Insert"]) {
    const { data, error } = await supabase
      .from("Dilation")
      .insert({ ...dilation });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteDilation(id: string) {
    const { data, error } = await supabase
      .from("Dilation")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchBabyDescents(partogrammeId: string) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateBabyDescent(babyDescent: BabyDescent_t["Row"]) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .upsert({ ...babyDescent })
      .eq("id", babyDescent.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertBabyDescent(babyDescent: BabyDescent_t["Insert"]) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .insert({ ...babyDescent });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteBabyDescent(id: string) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchAmnioticLiquids(partogrammeId: string) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateAmnioticLiquid(amnioticLiquid: AmnioticLiquid_t["Row"]) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .upsert({ ...amnioticLiquid })
      .eq("id", amnioticLiquid.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertAmnioticLiquid(amnioticLiquid: AmnioticLiquid_t["Insert"]) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .insert({ ...amnioticLiquid });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteAmnioticLiquid(amnioticLiquidId: string) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .update({ isDeleted: true })
      .eq("id", amnioticLiquidId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchSystolicMotherBloodPressures(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async createSystolicMotherBloodPressure(
    motherBloodPressure: MotherSystolicBloodPressure_t["Insert"],
  ) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .insert(motherBloodPressure);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateSystolicMotherBloodPressure(
    motherBloodPressure: MotherSystolicBloodPressure_t["Update"],
  ) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .update(motherBloodPressure)
      .eq("id", motherBloodPressure.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteSystolicMotherBloodPressure(motherBloodPressureId: string) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .update({ isDeleted: true })
      .eq("id", motherBloodPressureId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchDiastolicMotherBloodPressures(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async createDiastolicMotherBloodPressure(
    motherBloodPressure: MotherDiastolicBloodPressure_t["Insert"],
  ) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .insert(motherBloodPressure);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateDiastolicMotherBloodPressure(
    motherBloodPressure: MotherDiastolicBloodPressure_t["Update"],
  ) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .update(motherBloodPressure)
      .eq("id", motherBloodPressure.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteDiastolicMotherBloodPressure(motherBloodPressureId: string) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .update({ isDeleted: true })
      .eq("id", motherBloodPressureId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchMotherContractionsFrequencies(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteMotherContractionsFrequency(id: string) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateMotherContractionsFrequency(
    frequency: MotherContractionsFrequency_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .upsert({ ...frequency })
      .eq("id", frequency.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertMotherContractionsFrequency(
    frequency: MotherContractionsFrequency_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .insert({ ...frequency });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchMotherHeartFrequencies(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteMotherHeartFrequency(id: string) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateMotherHeartFrequency(frequency: MotherHeartFrequency_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .upsert({ ...frequency })
      .eq("id", frequency.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertMotherHeartFrequency(frequency: MotherHeartFrequency_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .insert({ ...frequency });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchMotherTemperatures(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteMotherTemperature(id: string) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateMotherTemperature(temperature: MotherTemperature_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .upsert({ ...temperature })
      .eq("id", temperature.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertMotherTemperature(temperature: MotherTemperature_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .insert({ ...temperature });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchMotherContractionDurations(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteMotherContractionDuration(
    motherContraction: MotherContractionDuration_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .update({ isDeleted: true })
      .eq("id", motherContraction.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateMotherContractionDuration(
    duration: MotherContractionDuration_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .upsert({ ...duration })
      .eq("id", duration.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertMotherContractionDuration(
    duration: MotherContractionDuration_t["Insert"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .insert({ ...duration });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchComments(partogrammeId: string) {
    const { data, error } = await supabase
      .from("Comment")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async deleteComment(id: string) {
    const { data, error } = await supabase
      .from("Comment")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateComment(comment: Comment_t["Row"]) {
    const { data, error } = await supabase
      .from("Comment")
      .upsert({ ...comment })
      .eq("id", comment.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async insertComment(comment: Comment_t["Insert"]) {
    const { data, error } = await supabase
      .from("Comment")
      .insert({ ...comment });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchUserInfo(profileId: String) {
    const { data, error } = await supabase
      .from("userInfo")
      .select("*")
      .eq("profileId", profileId)
      .single();
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async saveUserInfo(userInfo: UserInfo["Row"]) {
    const { data, error } = await supabase
      .from("userInfo")
      .upsert(userInfo, { onConflict: "profileId" });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async updateProfile(profile: Profile["Row"]) {
    const { data, error } = await supabase
      .from("Profile")
      .update(profile)
      .eq("id", profile.id);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchAllProfiles() {
    const { data, error } = await supabase.from("Profile").select("*");
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchAllHospitals() {
    const { data, error } = await supabase
      .from("hospital")
      .select("*")
      .neq("isDeleted", true);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // Admin-only, gated by the "Admins can create hospitals" RLS policy
  // (supabase/policies/2026-07-27_admin_hospital_insert.sql).
  async createHospital(hospital: { id: string; name: string; city: string; region?: string | null }) {
    const { data, error } = await supabase
      .from("hospital")
      .insert({ ...hospital, isDeleted: false });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // Soft-delete, same pattern as Partogramme/userInfo. Admin-only, gated by
  // the "Admins can update hospitals" RLS policy
  // (supabase/policies/2026-07-27_admin_hospital_update.sql).
  async removeHospital(hospitalId: string) {
    const { data, error } = await supabase
      .from("hospital")
      .update({ isDeleted: true })
      .eq("id", hospitalId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchAllMaternities() {
    const { data, error } = await supabase
      .from("maternity")
      .select("*")
      .neq("isDeleted", true);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // Admin-only, gated by the "Admins can create maternities" RLS policy
  // (supabase/policies/2026-08-09_maternity_nurses_and_transfer.sql).
  async createMaternity(maternity: { id: string; name: string; region: string; address?: string | null }) {
    const { data, error } = await supabase
      .from("maternity")
      .insert({ ...maternity, isDeleted: false });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // Soft-delete, same pattern as removeHospital. Admin-only, gated by the
  // "Admins can update maternities" RLS policy
  // (supabase/policies/2026-08-09_maternity_nurses_and_transfer.sql).
  async removeMaternity(maternityId: string) {
    const { data, error } = await supabase
      .from("maternity")
      .update({ isDeleted: true })
      .eq("id", maternityId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // The admin-managed hospital<->maternity relationship (see
  // MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §1) — replaces the old
  // region-text-match. No isDeleted on this table; a link is just
  // created/removed outright, hard delete.
  async fetchHospitalMaternityLinks() {
    const { data, error } = await supabase.from("hospitalMaternityLink").select("*");
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  /** Still-at-the-maternity patients (not yet transferred) from a given
   * set of maternities — the doctor's alert panel's source list (see
   * MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §3). RLS
   * (2026-08-13_doctor_maternity_alerts_and_requests.sql) only lets a
   * doctor's query actually return rows from maternities linked to his own
   * hospital, regardless of which maternityIds are passed in here. */
  async fetchMaternityAlertCandidates(maternityIds: string[]) {
    if (maternityIds.length === 0) return [];
    const { data, error } = await supabase
      .from("Partogramme")
      .select("id, patientFirstName, patientLastName, noFile, maternityId, workStartDateTime, transferRequestHospitalId")
      .in("maternityId", maternityIds)
      .in("state", ["ADMITTED", "IN_PROGRESS"])
      .eq("isDeleted", false);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  /** Hospital staff requesting a transfer for a maternity patient — sets
   * the request fields only; RLS (see 2026-08-19_hospital_staff_edit_and_request.sql)
   * restricts this to a linked maternity and won't let it touch anything
   * else on the row. */
  async requestMaternityTransfer(partogrammeId: string, hospitalId: string, doctorProfileId: string) {
    const { error } = await supabase
      .from("Partogramme")
      .update({ transferRequestHospitalId: hospitalId, transferRequestByDoctorId: doctorProfileId })
      .eq("id", partogrammeId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
  }

  // Admin-only, gated by the "Admins can create hospital-maternity links"
  // RLS policy (supabase/policies/2026-08-12_hospital_maternity_link.sql).
  async linkHospitalMaternity(link: { id: string; hospitalId: string; maternityId: string }) {
    const { data, error } = await supabase.from("hospitalMaternityLink").insert(link);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // Admin-only, gated by the "Admins can delete hospital-maternity links"
  // RLS policy (supabase/policies/2026-08-12_hospital_maternity_link.sql).
  async unlinkHospitalMaternity(linkId: string) {
    const { data, error } = await supabase.from("hospitalMaternityLink").delete().eq("id", linkId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async fetchAllDoctors() {
    const { data, error } = await supabase
      .from("userInfo")
      .select("*")
      .eq("role", "DOCTOR")
      .neq("isDeleted", true);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // Admin-only. Backed by the "Admins can view all userInfo rows" RLS
  // policy (supabase/policies/2026-07-27_admin_userinfo_select.sql). A
  // non-admin caller just gets back the same hospital-scoped rows they'd
  // see anyway, not an error.
  async fetchAllUserInfo() {
    const { data, error } = await supabase
      .from("userInfo")
      .select("*")
      .neq("isDeleted", true);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  // The two admin actions below run through Edge Functions, not plain
  // table calls. Creating/banning an auth.users row needs the
  // service_role key, which can only run server-side (see
  // supabase/functions/create-account, supabase/functions/remove-account).
  // Each function re-checks the caller is an ADMIN itself; RLS isn't what's
  // protecting these two operations.

  async adminCreateAccount(input: {
    email: string;
    firstName: string;
    lastName: string;
    role: "NURSE" | "DOCTOR" | "ADMIN";
    hospitalId: string | null;
    maternityId?: string | null;
    nurseType?: "HOSPITAL" | "MATERNITY" | null;
    phone?: string;
  }) {
    const { data, error } = await supabase.functions.invoke("create-account", {
      body: input,
    });
    if (error) { throw await unwrapFunctionError("create-account", error); }
    if (data?.error) { logger.error(data.error); throw new Error(data.error); }
    return data as { userId: string; tempPassword: string };
  }

  async adminRemoveAccount(userInfoId: string) {
    const { data, error } = await supabase.functions.invoke("remove-account", {
      body: { userInfoId },
    });
    if (error) { throw await unwrapFunctionError("remove-account", error); }
    if (data?.error) { logger.error(data.error); throw new Error(data.error); }
    return data;
  }

  /** Name/phone/hospital, and optionally role — deliberately can't touch
   * email (the Auth login identifier) from here, see update-account. */
  async adminUpdateAccount(input: {
    userInfoId: string;
    firstName: string;
    lastName: string;
    phone?: string;
    hospitalId: string | null;
    role?: "NURSE" | "DOCTOR" | "ADMIN";
  }) {
    const { data, error } = await supabase.functions.invoke("update-account", {
      body: input,
    });
    if (error) { throw await unwrapFunctionError("update-account", error); }
    if (data?.error) { logger.error(data.error); throw new Error(data.error); }
    return data;
  }

  /** profileId -> ISO timestamp of last login, or null if they've never
   * signed in. Needs the Admin API (service_role), so it's an Edge
   * Function — last_sign_in_at lives on auth.users, not a table RLS
   * can expose. */
  async adminListLogins() {
    const { data, error } = await supabase.functions.invoke("admin-list-logins");
    if (error) { throw await unwrapFunctionError("admin-list-logins", error); }
    if (data?.error) { logger.error(data.error); throw new Error(data.error); }
    return data.lastSignInByProfileId as Record<string, string | null>;
  }

  /** Latest dilation + BPM reading per partogramme — used by the doctor's
   * linked-maternity alert panel
   * (2026-08-13_doctor_maternity_alerts_and_requests.sql). Fetches every
   * reading for the given ids and lets the caller reduce to "latest per
   * id" — same client-side pattern the rest of the app already uses for a
   * single patient's history. Relies entirely on RLS to scope which rows
   * actually come back for a given caller. */
  async fetchLatestVitals(partogrammeIds: string[]) {
    if (partogrammeIds.length === 0) return { dilations: [], bpms: [] };
    const [dilationRes, bpmRes] = await Promise.all([
      supabase
        .from("Dilation")
        .select("partogrammeId, value, created_at")
        .in("partogrammeId", partogrammeIds)
        .eq("isDeleted", false),
      supabase
        .from("BabyHeartFrequency")
        .select("partogrammeId, value, created_at")
        .in("partogrammeId", partogrammeIds)
        .eq("isDeleted", false),
    ]);
    if (dilationRes.error) { logger.error(dilationRes.error.message, { code: dilationRes.error.code }); throw dilationRes.error; }
    if (bpmRes.error) { logger.error(bpmRes.error.message, { code: bpmRes.error.code }); throw bpmRes.error; }
    return { dilations: dilationRes.data, bpms: bpmRes.data };
  }

  /** Every currently-active manual alert (isDeleted = false) for the given
   * patients — a patient can have more than one at once, so this returns
   * one row per alert, not per patient. Shared by HospitalDashboardStore
   * and MaternityAlertsStore so both flag off the exact same rows. */
  async fetchManualAlerts(partogrammeIds: string[]) {
    if (partogrammeIds.length === 0) return [];
    const { data, error } = await supabase
      .from("ManualAlert")
      .select("id, partogrammeId, comment, createdAt")
      .in("partogrammeId", partogrammeIds)
      .eq("isDeleted", false)
      .order("createdAt", { ascending: false });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
    return data;
  }

  async createManualAlert(partogrammeId: string, comment: string) {
    const { error } = await supabase.from("ManualAlert").insert({ partogrammeId, comment });
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
  }

  // Soft delete, matching every other table's isDeleted convention —
  // RLS only grants update, not delete, on this table.
  async deleteManualAlert(alertId: string) {
    const { error } = await supabase.from("ManualAlert").update({ isDeleted: true }).eq("id", alertId);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
  }

  /** Close every open manual alert on a patient — hospital staff after
   * transfer/claim (see 2026-08-19_hospital_staff_clear_manual_alerts.sql).
   * A patient can have several at once; this is "we've got her" not
   * dismissing one note at a time. */
  async deleteManualAlertsForPartogramme(partogrammeId: string) {
    const { error } = await supabase
      .from("ManualAlert")
      .update({ isDeleted: true })
      .eq("partogrammeId", partogrammeId)
      .eq("isDeleted", false);
    if (error) { logger.error(error.message, { code: error.code }); throw error; }
  }
}
