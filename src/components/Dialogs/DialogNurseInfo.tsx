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
import { CheckBox } from "@rneui/themed";
import ErrorDialog from "./ErrorDialog";

let ToastAndroid: typeof RNToastAndroid;
if (Platform.OS === "android") {
  ToastAndroid = require("react-native").ToastAndroid;
}

interface IProps {
  isVisible: boolean;
  userInfo: UserInfoStore;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
}

class UiState {
  pickerDataNameOnFocus: boolean = false;
  userInfoStore: UserInfoStore;
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
    items.push(
      <Picker.Item
        key={0}
        label={"Sélectionnez un docteur"}
        value={""}
        style={[styles.pickerItems]}
      />,
    );
    let i = 1;
    doctorInfos.forEach((doctor) => {
      items.push(
        <Picker.Item
          key={i}
          label={doctor.firstName + " " + doctor.lastName}
          value={doctor.profileId}
          style={[styles.pickerItems]}
        />,
      );
      i++;
    });
    return items;
  }

  generateHospitalNameItem(hospitalInfos: Hospital["Row"][]) {
    const items: any[] = [];
    items.push(
      <Picker.Item
        key={0}
        label={"Sélectionnez un hôpital"}
        value={""}
        style={[styles.pickerItems]}
      />,
    );
    let i = 1;
    hospitalInfos.forEach((hospital) => {
      items.push(
        <Picker.Item
          key={i}
          label={hospital.name + ", " + hospital.city}
          value={hospital.id}
          style={[styles.pickerItems]}
        />,
      );
      i++;
    });
    return items;
  }

  async fetchHospitalNames(userInfoStore: UserInfoStore) {
    await userInfoStore.transportLayer.fetchAllHospitals().then((data) => {
      if (data) {
        runInAction(() => {
          userInfoStore.setHospitals(data);
        });
      }
    });
  }

  async fetchDoctorProfiles(userInfoStore: UserInfoStore) {
    await userInfoStore.transportLayer
      .fetchAllDoctors()
      .then((data) => {
        runInAction(() => {
          this.userInfoStore.doctorInfos = data;
        });
      })
      .catch((error) => {});
  }

  checkInputs(isDoctor: boolean) {
    if (
      this.userInfoStore.userInfo.firstName === "" ||
      this.userInfoStore.userInfo.lastName === ""
    ) {
      this.setErrorMessage = "Veuillez entrer votre nom et prénom";
      this.toggleErrorDialog();
      return false;
    }
    if (!isDoctor && this.userInfoStore.userInfo.refDoctorId === "") {
      this.setErrorMessage = "Veuillez sélectionner un docteur";
      this.toggleErrorDialog();
      return false;
    }
    if (this.userInfoStore.userInfo.hospitalId === "") {
      this.setErrorMessage = "Veuillez sélectionner un hôpital";
      this.toggleErrorDialog();
      return false;
    }
    return true;
  }
}

export const DialogNurseInfo = observer(
  ({ isVisible, userInfo, setIsVisible }: IProps) => {
    const [uiState] = useState(() => new UiState(userInfo));

    useEffect(() => {
      uiState.fetchDoctorProfiles(userInfo).catch((error) => {});
      uiState.fetchHospitalNames(userInfo).catch((error) => {});
    }, []);

    const isDoctor = userInfo.userInfo.role === "DOCTOR";

    const toggleErrorDialog = () => {
      uiState.toggleErrorDialog();
    };

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
      if (!uiState.checkInputs(isDoctor)) {
        return;
      }

      if (!isDoctor) {
        userInfo.userInfoRole = "NURSE";
      } else {
        userInfo.userInfoRole = "DOCTOR";
        userInfo.userInfoRefDoctorId = rootStore.profileStore.profile.id;
      }

      userInfo
        .saveUserInfo()
        .then(() => {
          if (Platform.OS === "android") {
            ToastAndroid.show("Informations mises à jour", ToastAndroid.SHORT);
          }
          setIsVisible(false);
        })
        .catch((error) => {
          if (Platform.OS === "android") {
            ToastAndroid.show(
              "Erreur lors de la mise à jour des informations",
              ToastAndroid.SHORT,
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
          value={userInfo.userInfo.firstName}
          placeholderTextColor={"#939F99"}
          onChangeText={(text) => (userInfo.userInfoFirstName = text)}
        />
        <CheckBox
          center
          title="Êtes-vous un docteur ?"
          iconRight
          checked={isDoctor}
          onPress={() => {
            const nowDoctor = !isDoctor;
            userInfo.userInfoRole = nowDoctor ? "DOCTOR" : "NURSE";
            userInfo.userInfoRefDoctorId = nowDoctor
              ? rootStore.profileStore.profile.id
              : "";
          }}
        />
        {!isDoctor && (
          <Text>Sélectionnez votre docteur de référence</Text>
        )}
        {!isDoctor && (
          <Picker
            selectedValue={userInfo.userInfo.refDoctorId}
            style={styles.input}
            onValueChange={(itemValue) => {
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
          selectedValue={userInfo.userInfo.hospitalId}
          style={styles.input}
          onValueChange={(itemValue: string) => {
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
  },
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
