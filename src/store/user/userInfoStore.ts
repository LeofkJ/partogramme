import { makeAutoObservable, reaction, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { Database } from "../../../types/supabase";
import { supabase } from "../../initSupabase";
import { RootStore } from "../rootStore";
import { Alert, Platform} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Profile, ProfileStore } from "./profileStore";
import { TransportLayer } from "../../transport/transportLayer";
import { PostgrestError } from "@supabase/supabase-js";
import uuid from "react-native-uuid";

export type UserInfo = Database["public"]["Tables"]["userInfo"];
export type Role = Database["public"]["Enums"]["Role"];
export type Hospital = Database["public"]["Tables"]["hospital"];
/**
 * userInfoStore is a MobX store that contains the user's userInfo information.
 * It is used to store the user's userInfo information and to fetch it from the database.
 */
export class UserInfoStore {
  // Declare data of the store and their initial values
  userInfo: UserInfo["Row"] = {
    firstName: "",
    id: "",
    isDeleted: false,
    lastName: "",
    profileId: "",
    refDoctorId: "",
    role: "NURSE",
    hospitalId: "",
  };

  doctorIds: string[] = [];
  hospitals: Hospital["Row"][] = [];
  doctorInfos: UserInfo["Row"][] = [];

  state = "pending"; // "pending", "done" or "error"
  rootStore: RootStore;
  transportLayer: TransportLayer;
  ProfileStore: ProfileStore;
  in_sync = false;
  saveHandler: any;

  /**
   * This is the constructor of the UserStore class, it make it observable.
   * this is used to make the store reactive.
   */
  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    this.ProfileStore = rootStore.profileStore;
    this.transportLayer = rootStore.transportLayer;

    // this.saveHandler = reaction(
    //   () => this.asJson, // Observe everything that is used in the JSON.
    //   (json) => {
    //     this.transportLayer.saveUserInfo(json);
    //   }
    // );

    makePersistable(this, {
      name: "UserStore",
      properties: ["userInfo"],
      storage: AsyncStorage,
      expireIn: 86400000, // 1 day in ms
      removeOnExpiration: true,
    });
  }

  get hospitalName() {
    if (this.userInfo.hospitalId) {
      const hospital = this.hospitals.find(
        (hospital) => hospital.id === this.userInfo.hospitalId
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

  setDoctorIds(doctorIds: string[]) {
    this.doctorIds = doctorIds;
  }

  setHospitals(hospitals: Hospital["Row"][]) {
    this.hospitals = hospitals;
  }

  /**
   * This method is used to fetch the user's userInfo information from the database.
   * It is called when the user logs in.
   */
  async fetchUserInfo() {
    let isLoggedIn = false;
    await this.transportLayer
      .fetchUserInfo(this.ProfileStore.profile.id)
      .then((data) => {
        isLoggedIn = true;
        runInAction(() => {
          this.userInfo = data;
        });
        this.state = "done";
      })
      .catch((error: PostgrestError) => {
        this.state = "error";
        if (Platform.OS === "android") {
          if (error.code !== "PGRST116") {
            Alert.alert(error.code, error.message);
          }
        }
        return Promise.reject(error);
      });
  }

  /**
   * This method is used to create the user's userInfo information in the database.
   * It is called when the user signs up.
   */
  async createUserInfo() {
    this.in_sync = false;
    await this.transportLayer
      .createUserInfo(this.userInfo)
      .then((data) => {
        runInAction(() => {
          this.in_sync = true;
        });
        this.state = "done";
      })
      .catch((error) => {
        this.state = "error";
        Alert.alert(error.message);
      });
  }

  /**
   * This method is used to save the user's userInfo information in the database.
   * It is called when the user updates his profile.
   */
  async saveUserInfo() {
    this.in_sync = false;
    this.userInfo.profileId = this.ProfileStore.profile.id;
    this.userInfo.id = uuid.v4().toString();
    await this.transportLayer
      .saveUserInfo(this.userInfo)
      .then((data) => {
        runInAction(() => {
          this.in_sync = true;
        });
        this.state = "done";
        return Promise.resolve(data);
      })
      .catch((error) => {
        this.state = "error";
        if (Platform.OS === "android") {
          Alert.alert(error.message);
        }
        return Promise.reject(error);
      });
  }

  get asJson() {
    return this.userInfo;
  }

  /**
   * This function Clean Up every partogramme.
   */
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
    };
  }
}
