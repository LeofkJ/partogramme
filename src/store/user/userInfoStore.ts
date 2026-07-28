import { makeAutoObservable, reaction, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { Database } from "../../../types/supabase";
import { supabase } from "../../initSupabase";
import { RootStore } from "../rootStore";
import { notify } from "../../lib/notify";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Profile, ProfileStore } from "./profileStore";
import { TransportLayer } from "../../transport/transportLayer";
import { PostgrestError } from "@supabase/supabase-js";
import uuid from "react-native-uuid";
import { logger } from "../../lib/logger";

export type UserInfo = Database["public"]["Tables"]["userInfo"];
export type Role = Database["public"]["Enums"]["Role"];
export type Hospital = Database["public"]["Tables"]["hospital"];

export class UserInfoStore {
  userInfo: UserInfo["Row"] = {
    firstName: "",
    id: "",
    isDeleted: false,
    lastName: "",
    profileId: "",
    refDoctorId: "",
    role: "NURSE",
    hospitalId: "",
    phone: "",
    address: null,
    mustChangePassword: false,
  };

  doctorIds: string[] = [];
  hospitals: Hospital["Row"][] = [];
  doctorInfos: UserInfo["Row"][] = [];

  state = "pending";
  rootStore: RootStore;
  transportLayer: TransportLayer;
  ProfileStore: ProfileStore;
  in_sync = false;
  saveHandler: any;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    this.ProfileStore = rootStore.profileStore;
    this.transportLayer = rootStore.transportLayer;

    makePersistable(this, {
      name: "UserInfoStore",
      properties: ["userInfo"],
      storage: AsyncStorage,
      expireIn: 86400000,
      removeOnExpiration: true,
    });
  }

  get hospitalName() {
    if (this.userInfo.hospitalId) {
      const hospital = this.hospitals.find(
        (hospital) => hospital.id === this.userInfo.hospitalId,
      );
      if (hospital) {
        return hospital.name;
      }
    }
    return "";
  }

  set userInfoId(userInfoId: string) {
    this.userInfo.id = userInfoId;
  }

  set userInfoFirstName(userInfoFirstName: string) {
    this.userInfo.firstName = userInfoFirstName;
  }

  set userInfoLastName(userInfoLastName: string) {
    this.userInfo.lastName = userInfoLastName;
  }

  set userInfoProfileId(userInfoProfileId: string) {
    this.userInfo.profileId = userInfoProfileId;
  }

  set userInfoRefDoctorId(userInfoRefDoctor: string) {
    this.userInfo.refDoctorId = userInfoRefDoctor;
  }

  setUserInfoHospitalId(userInfoHospitalId: string) {
    this.userInfo.hospitalId = userInfoHospitalId;
  }

  set userInfoRole(userInfoRole: Role) {
    this.userInfo.role = userInfoRole;
  }

  set userInfoIsDeleted(userInfoIsDeleted: boolean) {
    this.userInfo.isDeleted = userInfoIsDeleted;
  }

  set userInfoPhone(userInfoPhone: string) {
    this.userInfo.phone = userInfoPhone;
  }

  set userInfoAddress(userInfoAddress: string) {
    this.userInfo.address = userInfoAddress;
  }

  setDoctorIds(doctorIds: string[]) {
    this.doctorIds = doctorIds;
  }

  setHospitals(hospitals: Hospital["Row"][]) {
    this.hospitals = hospitals;
  }

  async fetchUserInfo() {
    let isLoggedIn = false;
    const { data: sessionData } = await supabase.auth.getSession();
    const profileId =
      sessionData?.session?.user?.id || this.ProfileStore.profile.id;
    if (!profileId) {
      return Promise.reject({
        code: "PGRST116",
        message: "No profile ID found",
      });
    }
    await this.transportLayer
      .fetchUserInfo(profileId)
      .then((data) => {
        isLoggedIn = true;
        runInAction(() => {
          this.userInfo = data;
        });
        this.ProfileStore.setProfileId(profileId);
        this.state = "done";
      })
      .catch((error: PostgrestError) => {
        this.state = "error";
        logger.warn("fetchUserInfo failed", { profileId, code: error.code, message: error.message });
        if (error.code !== "PGRST116") {
          notify.error(error.code, error.message);
        }
        return Promise.reject(error);
      });
  }

  async saveUserInfo() {
    runInAction(() => {
      this.in_sync = false;
    });
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId =
      sessionData?.session?.user?.id || this.ProfileStore.profile.id;
    runInAction(() => {
      // If the persisted id belongs to a different user, discard it so we INSERT fresh
      if (this.userInfo.profileId && this.userInfo.profileId !== currentUserId) {
        this.userInfo.id = "";
      }
      this.userInfo.profileId = currentUserId;
      if (!this.userInfo.id) {
        this.userInfo.id = uuid.v4().toString();
      }
    });
    await this.transportLayer
      .saveUserInfo(this.userInfo)
      .then((data) => {
        runInAction(() => {
          this.in_sync = true;
          this.state = "done";
        });
        return Promise.resolve(data);
      })
      .catch((error) => {
        runInAction(() => {
          this.state = "error";
        });
        logger.warn("saveUserInfo failed", { id: this.userInfo.id, error: error?.message });
        notify.error("Erreur", error.message);
        return Promise.reject(error);
      });
  }

  get asJson() {
    return this.userInfo;
  }

  /** First-login flow for admin-activated accounts (see Admin.tsx): sets the
   * user's own password, replacing the temp one the admin relayed, then
   * clears mustChangePassword so the blocking dialog doesn't show again. */
  async completePasswordChange(newPassword: string) {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      logger.warn("completePasswordChange failed", { error: authError.message });
      throw authError;
    }
    runInAction(() => {
      this.userInfo.mustChangePassword = false;
    });
    await this.saveUserInfo();
  }

  /** Looks up another user's info by their profile id — e.g. a doctor
   * looking up the nurse assigned to a patient via the partogramme's
   * nurseId (which is the nurse's profileId). */
  async fetchOtherUserInfo(profileId: string) {
    return this.transportLayer.fetchUserInfo(profileId);
  }

  cleanUp() {
    this.userInfo = {
      firstName: "",
      id: "",
      isDeleted: false,
      lastName: "",
      profileId: "",
      refDoctorId: "",
      role: "NURSE",
      hospitalId: "",
      phone: "",
      address: null,
      mustChangePassword: false,
    };
  }
}
