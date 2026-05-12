/**
 * This components render a dialog allowing the user to enter his nurse info
 */
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid as RNToastAndroid,
} from "react-native";
import { Dialog } from "@rneui/themed";
import { Dispatch, SetStateAction } from "react";
import { observer } from "mobx-react";
import { rootStore } from "../../store/rootStore";
import {
  Hospital,
  UserInfo,
  UserInfoStore,
} from "../../store/user/userInfoStore";
import { Picker } from "@react-native-picker/picker";
import { computed, makeAutoObservable, runInAction } from "mobx";
import { userInfo } from "os";
import { CheckBox } from "@rneui/themed";
import ErrorDialog from "./ErrorDialog";

let ToastAndroid: typeof RNToastAndroid;;
if (Platform.OS === "android") {
  // Lazy import only on Android
  ToastAndroid = require("react-native").ToastAndroid;
}

interface IProps {
  isVisible: boolean;
  userInfo: UserInfoStore;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
}

class UiState {
  pickerDataNameOnFocus: boolean = false;
  isDoctorChecked: boolean = false;
  userInfoStore: UserInfoStore;
  hospitalSelectedValue: string = "";
  isErrorDialogVisible: boolean = false;
  errorMessage: string = "";
  constructor(userInfo: UserInfoStore) {
    makeAutoObservable(this, {
      doctorNamesPickerItems: computed,
    });
    this.userInfoStore = userInfo;
  }

  toggleErrorDialog() {
    this.isErrorDialogVisible = !this.isErrorDialogVisible;
  }

  set setErrorMessage(value: string) {
    this.errorMessage = value;
  }

  get doctorNamesPickerItems() {
    return this.generateDoctorNameItem(this.userInfoStore.doctorInfos);
  }

  get hospitalNamesPickerItems() {
    return this.generateHospitalNameItem(this.userInfoStore.hospitals);
  }

  generateDoctorNameItem(doctorInfos: UserInfo["Row"][]) {
    const items: any[] = [];
    // push the first item to the array to have a default value
    items.push(
      <Picker.Item
        key={0}
        label={"Sélectionnez un docteur"}
        value={""}
        style={[
          styles.pickerItems,
          // { color: pickerDataNameOnFocus ? "white" : "black" },
        ]}
      />
    );
    // iterate trough the data array to get the data names
    let i = 0;
    doctorInfos.forEach((doctorInfos) => {
      items.push(
        <Picker.Item
          key={i}
          label={doctorInfos.firstName + " " + doctorInfos.lastName}
          value={doctorInfos.id}
          style={[
            styles.pickerItems,
            // { color: pickerDataNameOnFocus ? "white" : "black" },
          ]}
        />
      );
      i++;
    });
    return items;
  }

  generateHospitalNameItem(hospitalInfos: Hospital["Row"][]) {
    const items: any[] = [];

    // push the first item of the picker (empty)
    items.push(
      <Picker.Item
        key={0}
        label={"Sélectionnez un hôpital"}
        value={""}
        style={[
          styles.pickerItems,
          // { color: pickerDataNameOnFocus ? "white" : "black" },
        ]}
      />
    );
    // iterate trough the data array to get the data names
    let i = 0;
    hospitalInfos.forEach((hospitalInfos) => {
      items.push(
        <Picker.Item
          key={i}
          label={hospitalInfos.name + ", " + hospitalInfos.city}
          value={hospitalInfos.id}
          style={[
            styles.pickerItems,
            // { color: pickerDataNameOnFocus ? "white" : "black" },
          ]}
        />
      );
      i++;
    });
    return items;
  }

  async fetchHospitalNames(userInfoStore: UserInfoStore) {
    await userInfoStore.transportLayer.fetchAllHospitals().then((data) => {
      userInfoStore.setHospitals(data);
    });
  }

  async fetchDoctorProfiles(userInfoStore: UserInfoStore) {
    this.userInfoStore.doctorInfos = [];
    await userInfoStore.transportLayer.fetchAllProfiles().then((data) => {
      const doctorIds: string[] = [];
      data.forEach((profile) => {
        doctorIds.push(profile.id);
      });
      doctorIds.forEach(async (doctorId) => {
        await this.fetchDoctorInfos(doctorId)
          .then((data) => {
          }
          )
          .catch((error) => {
          });
      });
    });
  }

  async fetchDoctorInfos(doctorId: string) {
    await this.userInfoStore.transportLayer
      .fetchUserInfo(doctorId)
      .then((data) => {
        runInAction(() => {
          this.userInfoStore.doctorInfos.push(data);
        });
        return Promise.resolve(this.userInfoStore.doctorInfos);
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  set setIsDoctorChecked(value: boolean) {
    this.isDoctorChecked = value;
  }

  set setHospitalSelectedValue(value: string) {
    this.hospitalSelectedValue = value;
  }

  checkInputs() {
    if (this.userInfoStore.userInfo.firstName === "" || this.userInfoStore.userInfo.lastName === "") {
      this.setErrorMessage = "Veuillez entrer votre nom et prénom";
      this.toggleErrorDialog();
      return false;
    }
    if (!this.isDoctorChecked && this.userInfoStore.userInfo.refDoctorId === "") {
      this.setErrorMessage = "Veuillez sélectionner un docteur";
      this.toggleErrorDialog();
      return false;
    }
    if (this.hospitalSelectedValue === "") {
      this.setErrorMessage = "Veuillez sélectionner un hôpital";
      this.toggleErrorDialog();
      return false;
    }
    return true;
  }
}

/**
 * This components render a dialog allowing the user to enter his nurse info
 * @param isVisible - boolean that indicates if the dialog is visible or not
 * @param setIsVisible - function that allows to change the visibility of the dialog
 */
export const DialogNurseInfo = observer(
  ({ isVisible, userInfo, setIsVisible }: IProps) => {
    const [uiState] = useState(() => new UiState(userInfo));

    useEffect(() => {
      uiState
        .fetchDoctorProfiles(userInfo)
        .then((data) => {
        })
        .catch((error) => {
        });
      uiState
        .fetchHospitalNames(userInfo)
        .then((data) => {
        })
        .catch((error) => {
        });
    }, []);

    const toggleErrorDialog = () => {
      uiState.toggleErrorDialog();
    }

    const toggleDialog = () => {
      setIsVisible(!isVisible);
    };

    const handleCancel = () => {
      if (
        !(
          userInfo.userInfo.firstName === "" ||
          userInfo.userInfo.lastName === "" ||
          userInfo.userInfo.refDoctorId === ""
        )
      ) {
        setIsVisible(false);
      }
    };

    const handleValidate = () => {
      if (!uiState.checkInputs()) {
        return;
      }
      userInfo
        .saveUserInfo()
        .then((data) => {
          if (Platform.OS === "android") {
            ToastAndroid.show("Informations mises à jour", ToastAndroid.SHORT);
          }
          setIsVisible(false);
        })
        .catch((error) => {
          if (Platform.OS === "android") {
            ToastAndroid.show(
              "Erreur lors de la mise à jour des informations",
              ToastAndroid.SHORT
            );
          }
        });
    };

    return (
      <Dialog
        isVisible={isVisible}
        onBackdropPress={toggleDialog}
        overlayStyle={styles.overlay}
      >
        <Dialog.Title title="Entrez vos informations" />
        <Text>S'il vous plaît entrez votre nom et prénom</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom de famille"
          value={userInfo.userInfo.lastName}
          placeholderTextColor={"#939F99"}
          onChangeText={(text) => (userInfo.userInfoLastName = text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          placeholderTextColor={"#939F99"}
          onChangeText={(text) => (userInfo.userInfoFirstName = text)}
        />
        <CheckBox
          center
          title="Êtes-vous un docteur ?"
          iconRight
          checked={uiState.isDoctorChecked}
          onPress={() => {
            uiState.setIsDoctorChecked = !uiState.isDoctorChecked;
            userInfo.userInfoRole = uiState.isDoctorChecked
              ? "DOCTOR"
              : "NURSE";
            userInfo.userInfoRefDoctorId = uiState.isDoctorChecked
              ? rootStore.profileStore.profile.id
              : "";
          }}
        />
        {!uiState.isDoctorChecked && (
          <Text>Sélectionnez votre docteur de référence</Text>
        )}
        {!uiState.isDoctorChecked && (
          <Picker
            selectedValue={userInfo.userInfo.refDoctorId}
            style={styles.input}
            onValueChange={(itemValue, itemIndex) => {
              runInAction(() => {
                userInfo.userInfo.refDoctorId = itemValue;
              });
            }}
          >
            {uiState.doctorNamesPickerItems}
          </Picker>
        )}
        <Text>Sélectionnez votre hôpital de référence</Text>
        <Picker
          selectedValue={uiState.hospitalSelectedValue}
          style={styles.input}
          onValueChange={(itemValue: string, itemIndex) => {
            uiState.setHospitalSelectedValue = itemValue;
            userInfo.setUserInfoHospitalId(itemValue);
          }}
        >
          {uiState.hospitalNamesPickerItems}
        </Picker>
        <Dialog.Actions>
          <Dialog.Button
            title="ANNULER"
            onPress={() => handleCancel()}
            buttonStyle={styles.cancelButton}
            type="solid"
          />
          <Dialog.Button
            title="VALIDER"
            onPress={() => handleValidate()}
            buttonStyle={styles.validateButton}
            type="solid"
          />
        </Dialog.Actions>
        <ErrorDialog
          isVisible={uiState.isErrorDialogVisible}
          toggleDialog={toggleErrorDialog}
          errorCode=""
          errorMsg={uiState.errorMessage}
        />
      </Dialog>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    width: "90%",
    margin: 5,
    padding: 10,
  },
  cancelButton: {
    width: 100,
    borderRadius: 10,
    backgroundColor: "red",
  },
  validateButton: {
    width: 100,
    borderRadius: 10,
    backgroundColor: "#403572",
    marginRight: 20,
  },
  input: {
    alignSelf: "center",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 5,
    fontSize: 20,
    marginRight: 50,
    marginLeft: 50,
    margin: 10,
    width: 300,
  },
  pickerItems: {
    textAlign: "center",
    textAlignVertical: "center",
  },
});
