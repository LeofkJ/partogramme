import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { Database } from '../../../types/supabase';
import { supabase } from '../../initSupabase';
import { RootStore } from '../rootStore';
import { Alert, Platform, ToastAndroid as RNToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


let ToastAndroid: typeof RNToastAndroid;;
if (Platform.OS === "android") {
  // Lazy import only on Android
  ToastAndroid = require("react-native").ToastAndroid;
}

export type Profile = Database['public']['Tables']['Profile'];
export type Role = Database['public']['Enums']['Role']

/**
 * profileStore is a MobX store that contains the user's profile information.
 * It is used to store the user's profile information and to fetch it from the database.
 */
export class ProfileStore {
  // Declare data of the store and their initial values
  profile: Profile['Row'] = {
    email: "",
    id: "",
    isDeleted: false,
  };
  password: string = "";
  state = "pending" // "pending", "done" or "error"
  rootStore: RootStore;

  /**
   * This is the constructor of the UserStore class, it make it observable.
   * this is used to make the store reactive.
   */
  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    makePersistable(this, {
      name: "UserStore",
      properties: ["profile"],
      storage: AsyncStorage,
      expireIn: 86400000, // 1 day in ms
      removeOnExpiration: true,
     });
  }

  setProfileId(profileId: string) {
    this.profile.id = profileId;
  }

  setProfileEmail(profileEmail: string) {
    this.profile.email = profileEmail;
  }

  setPassword(profilePassword: string) {
    this.password = profilePassword;
  }

  async signInWithEmail(email: string, password: string) {
    let isLoggedIn = false;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) {
      this.state = "error";
      return Promise.reject(error);
    }
    if (data) {
      isLoggedIn = true;
      runInAction(() => {
        this.state = "done";
        this.profile.email = data.user.email!;
        this.profile.id = data.user.id!;
      });
      if (Platform.OS === "android") {
        ToastAndroid.showWithGravity(
          "Connecté avec " + data.user.email + " !",
          ToastAndroid.LONG,
          ToastAndroid.CENTER
        );
      }
    }
    return isLoggedIn;
  }

  /**
   * This function is used get name of the user.
   * @returns the user's profile information
   */
  getProfileName() {
    return this.profile.firstName + " " + this.profile.lastName;
  }

  /**
   * This function clear the user's profile information.
   * It is used when the user logs out.
   */
  cleanUp() {
    this.profile = {
      email: null,
      id: "",
      isDeleted: false,
    };
  }

  set email(email:string) {
    this.profile.email = email;
  }

  get email() {
    return this.profile.email;
  }

  set firstName(firstName:string) {
    this.profile.firstName = firstName;
  }

  set lastName(lastName:string) {
    this.profile.lastName = lastName;
  }

  get lastName() {
    return this.profile.lastName;
  }

  get firstName() {
    return this.profile.firstName;
  }
}