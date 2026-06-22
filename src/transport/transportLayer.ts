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

export class TransportLayer {
  client = supabase;

  async fetchPartogrammes(hospitalId: string, nurseId?: string) {
    if (nurseId && hospitalId) {
      const { data, error } = await supabase
        .from("Partogramme")
        .select("*")
        .eq("nurseId", nurseId)
        .eq("hospitalId", hospitalId)
        .eq("isDeleted", false);
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("Partogramme")
        .select("*")
        .eq("hospitalId", hospitalId)
        .eq("isDeleted", false);
      if (error) throw error;
      return data;
    }
  }

  async deletePartogramme(id: string) {
    const { data, error } = await supabase
      .from("Partogramme")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async updatePartogramme(partogramme: Partogramme_t["Row"]) {
    const { data, error } = await supabase
      .from("Partogramme")
      .upsert({ ...partogramme })
      .eq("id", partogramme.id);
    if (error) throw error;
    return data;
  }

  async insertPartogramme(partogramme: Partogramme_t["Row"]) {
    const { data, error } = await supabase
      .from("Partogramme")
      .insert({ ...partogramme });
    if (error) throw error;
    return data;
  }

  async fetchBabyHeartFrequencies(partogrammeId: string) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async deleteBabyHeartFrequency(id: string) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async updateBabyHeartFrequency(frequency: BabyHeartFrequency_t["Row"]) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .upsert({ ...frequency })
      .eq("id", frequency.id);
    if (error) throw error;
    return data;
  }

  async insertBabyHeartFrequency(frequency: BabyHeartFrequency_t["Insert"]) {
    const { data, error } = await supabase
      .from("BabyHeartFrequency")
      .insert({ ...frequency });
    if (error) throw error;
    return data;
  }

  async fetchDilations(partogrammeId: string) {
    const { data, error } = await supabase
      .from("Dilation")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async updateDilation(dilation: Dilation_t["Row"]) {
    const { data, error } = await supabase
      .from("Dilation")
      .upsert({ ...dilation })
      .eq("id", dilation.id);
    if (error) throw error;
    return data;
  }

  async insertDilation(dilation: Dilation_t["Insert"]) {
    const { data, error } = await supabase
      .from("Dilation")
      .insert({ ...dilation });
    if (error) throw error;
    return data;
  }

  async deleteDilation(id: string) {
    const { data, error } = await supabase
      .from("Dilation")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async fetchBabyDescents(partogrammeId: string) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async updateBabyDescent(babyDescent: BabyDescent_t["Row"]) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .upsert({ ...babyDescent })
      .eq("id", babyDescent.id);
    if (error) throw error;
    return data;
  }

  async insertBabyDescent(babyDescent: BabyDescent_t["Insert"]) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .insert({ ...babyDescent });
    if (error) throw error;
    return data;
  }

  async deleteBabyDescent(id: string) {
    const { data, error } = await supabase
      .from("BabyDescent")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async fetchAmnioticLiquids(partogrammeId: string) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async updateAmnioticLiquid(amnioticLiquid: AmnioticLiquid_t["Row"]) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .upsert({ ...amnioticLiquid })
      .eq("id", amnioticLiquid.id);
    if (error) throw error;
    return data;
  }

  async insertAmnioticLiquid(amnioticLiquid: AmnioticLiquid_t["Insert"]) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .insert({ ...amnioticLiquid });
    if (error) throw error;
    return data;
  }

  async deleteAmnioticLiquid(amnioticLiquidId: string) {
    const { data, error } = await supabase
      .from("amnioticLiquid")
      .update({ isDeleted: true })
      .eq("id", amnioticLiquidId);
    if (error) throw error;
    return data;
  }

  async fetchSystolicMotherBloodPressures(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async createSystolicMotherBloodPressure(
    motherBloodPressure: MotherSystolicBloodPressure_t["Insert"],
  ) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .insert(motherBloodPressure);
    if (error) throw error;
    return data;
  }

  async updateSystolicMotherBloodPressure(
    motherBloodPressure: MotherSystolicBloodPressure_t["Update"],
  ) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .update(motherBloodPressure)
      .eq("id", motherBloodPressure.id);
    if (error) throw error;
    return data;
  }

  async deleteSystolicMotherBloodPressure(motherBloodPressureId: string) {
    const { data, error } = await supabase
      .from("MotherSystolicBloodPressure")
      .update({ isDeleted: true })
      .eq("id", motherBloodPressureId);
    if (error) throw error;
    return data;
  }

  async fetchDiastolicMotherBloodPressures(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async createDiastolicMotherBloodPressure(
    motherBloodPressure: MotherDiastolicBloodPressure_t["Insert"],
  ) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .insert(motherBloodPressure);
    if (error) throw error;
    return data;
  }

  async updateDiastolicMotherBloodPressure(
    motherBloodPressure: MotherDiastolicBloodPressure_t["Update"],
  ) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .update(motherBloodPressure)
      .eq("id", motherBloodPressure.id);
    if (error) throw error;
    return data;
  }

  async deleteDiastolicMotherBloodPressure(motherBloodPressureId: string) {
    const { data, error } = await supabase
      .from("MotherDiastolicBloodPressure")
      .update({ isDeleted: true })
      .eq("id", motherBloodPressureId);
    if (error) throw error;
    return data;
  }

  async fetchMotherContractionsFrequencies(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async deleteMotherContractionsFrequency(id: string) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async updateMotherContractionsFrequency(
    frequency: MotherContractionsFrequency_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .upsert({ ...frequency })
      .eq("id", frequency.id);
    if (error) throw error;
    return data;
  }

  async insertMotherContractionsFrequency(
    frequency: MotherContractionsFrequency_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionsFrequency")
      .insert({ ...frequency });
    if (error) throw error;
    return data;
  }

  async fetchMotherHeartFrequencies(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async deleteMotherHeartFrequency(id: string) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async updateMotherHeartFrequency(frequency: MotherHeartFrequency_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .upsert({ ...frequency })
      .eq("id", frequency.id);
    if (error) throw error;
    return data;
  }

  async insertMotherHeartFrequency(frequency: MotherHeartFrequency_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherHeartFrequency")
      .insert({ ...frequency });
    if (error) throw error;
    return data;
  }

  async fetchMotherTemperatures(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async deleteMotherTemperature(id: string) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async updateMotherTemperature(temperature: MotherTemperature_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .upsert({ ...temperature })
      .eq("id", temperature.id);
    if (error) throw error;
    return data;
  }

  async insertMotherTemperature(temperature: MotherTemperature_t["Row"]) {
    const { data, error } = await supabase
      .from("MotherTemperature")
      .insert({ ...temperature });
    if (error) throw error;
    return data;
  }

  async fetchMotherContractionDurations(partogrammeId: string) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async deleteMotherContractionDuration(
    motherContraction: MotherContractionDuration_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .update({ isDeleted: true })
      .eq("id", motherContraction.id);
    if (error) throw error;
    return data;
  }

  async updateMotherContractionDuration(
    duration: MotherContractionDuration_t["Row"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .upsert({ ...duration })
      .eq("id", duration.id);
    if (error) throw error;
    return data;
  }

  async insertMotherContractionDuration(
    duration: MotherContractionDuration_t["Insert"],
  ) {
    const { data, error } = await supabase
      .from("MotherContractionDuration")
      .insert({ ...duration });
    if (error) throw error;
    return data;
  }

  async fetchComments(partogrammeId: string) {
    const { data, error } = await supabase
      .from("Comment")
      .select("*")
      .eq("partogrammeId", partogrammeId);
    if (error) throw error;
    return data;
  }

  async deleteComment(id: string) {
    const { data, error } = await supabase
      .from("Comment")
      .update({ isDeleted: true })
      .eq("id", id);
    if (error) throw error;
    return data;
  }

  async updateComment(comment: Comment_t["Row"]) {
    const { data, error } = await supabase
      .from("Comment")
      .upsert({ ...comment })
      .eq("id", comment.id);
    if (error) throw error;
    return data;
  }

  async insertComment(comment: Comment_t["Insert"]) {
    const { data, error } = await supabase
      .from("Comment")
      .insert({ ...comment });
    if (error) throw error;
    return data;
  }

  async fetchUserInfo(profileId: String) {
    const { data, error } = await supabase
      .from("userInfo")
      .select("*")
      .eq("profileId", profileId)
      .single();
    if (error) throw error;
    return data;
  }

  async createUserInfo(userInfo: UserInfo["Row"]) {
    const { data, error } = await supabase.from("userInfo").insert(userInfo);
    if (error) throw error;
    return data;
  }

  async saveUserInfo(userInfo: UserInfo["Row"]) {
    const { data, error } = await supabase
      .from("userInfo")
      .upsert(userInfo, { onConflict: "id" });
    if (error) throw error;
    return data;
  }

  async fetchAllProfiles() {
    const { data, error } = await supabase.from("Profile").select("*");
    if (error) throw error;
    return data;
  }

  async fetchAllHospitals() {
    const { data, error } = await supabase
      .from("hospital")
      .select("*")
      .eq("isDeleted", false);
    if (error) throw error;
    return data;
  }

  async fetchAllDoctors() {
    const { data, error } = await supabase
      .from("userInfo")
      .select("*")
      .eq("role", "DOCTOR")
      .eq("isDeleted", false);
    if (error) throw error;
    return data;
  }
}
