/**
 * This components render a dialog allowing the user to enter his nurse info
 */
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid as RNToastAndroid,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
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

  constructor(userInfo: UserInfoStore) {
    makeAutoObservable(this, {
      doctorNamesPickerItems: computed,
    });
    this.userInfoStore = userInfo;
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
        style={styles.pickerItems}
      />,
    );
    let i = 1;
    doctorInfos.forEach((doctor) => {
      items.push(
        <Picker.Item
          key={i}
          label={doctor.firstName + " " + doctor.lastName}
          value={doctor.profileId}
          style={styles.pickerItems}
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
        style={styles.pickerItems}
      />,
    );
    let i = 1;
    hospitalInfos.forEach((hospital) => {
      items.push(
        <Picker.Item
          key={i}
          label={hospital.name + ", " + hospital.city}
          value={hospital.id}
          style={styles.pickerItems}
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

  checkInputs(isDoctor: boolean): string | null {
    if (
      this.userInfoStore.userInfo.firstName === "" ||
      this.userInfoStore.userInfo.lastName === ""
    ) {
      return "Veuillez entrer votre nom et prénom";
    }
    if (!isDoctor && this.userInfoStore.userInfo.refDoctorId === "") {
      return "Veuillez sélectionner un docteur";
    }
    if (this.userInfoStore.userInfo.hospitalId === "") {
      return "Veuillez sélectionner un hôpital";
    }
    return null;
  }
}

export const DialogNurseInfo = observer(
  ({ isVisible, userInfo, setIsVisible }: IProps) => {
    const [uiState] = useState(() => new UiState(userInfo));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { width } = useWindowDimensions();

    useEffect(() => {
      uiState.fetchDoctorProfiles(userInfo).catch((error) => {});
      uiState.fetchHospitalNames(userInfo).catch((error) => {});
    }, []);

    const isDoctor = userInfo.userInfo.role === "DOCTOR";

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
      const error = uiState.checkInputs(isDoctor);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setErrorMessage(null);

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
          setErrorMessage("Erreur lors de la mise à jour des informations. Veuillez réessayer.");
          if (Platform.OS === "android") {
            ToastAndroid.show("Erreur lors de la mise à jour des informations. Veuillez réessayer.", ToastAndroid.SHORT);
          }
        });
    };

    return (
      <Modal
        visible={isVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.overlay}>
          <View style={[styles.card, { width: Math.min(width * 0.92, 440) }]}>

            <Text style={styles.title}>Entrez vos informations</Text>
            <Text style={styles.subtitle}>
              Veuillez entrer votre nom et prénom
            </Text>

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Nom de famille"
              value={userInfo.userInfo.lastName}
              placeholderTextColor="#9F90D4"
              onChangeText={(text) => (userInfo.userInfoLastName = text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={userInfo.userInfo.firstName}
              placeholderTextColor="#9F90D4"
              onChangeText={(text) => (userInfo.userInfoFirstName = text)}
            />

            <CheckBox
              center
              title="Êtes-vous un docteur ?"
              iconRight
              checked={isDoctor}
              containerStyle={styles.checkboxContainer}
              textStyle={styles.checkboxText}
              checkedIcon={
                <View style={[styles.checkboxBox, styles.checkboxBoxChecked]}>
                  <Text style={styles.checkboxTick}>✓</Text>
                </View>
              }
              uncheckedIcon={
                <View style={styles.checkboxBox} />
              }
              onPress={() => {
                const nowDoctor = !isDoctor;
                userInfo.userInfoRole = nowDoctor ? "DOCTOR" : "NURSE";
                userInfo.userInfoRefDoctorId = nowDoctor
                  ? rootStore.profileStore.profile.id
                  : "";
              }}
            />

            {!isDoctor && (
              <Text style={styles.label}>
                Sélectionnez votre docteur de référence
              </Text>
            )}
            {!isDoctor && (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={userInfo.userInfo.refDoctorId}
                  style={styles.picker}
                  dropdownIconColor="#403572"
                  onValueChange={(itemValue) => {
                    runInAction(() => {
                      userInfo.userInfo.refDoctorId = itemValue;
                    });
                  }}
                >
                  {uiState.doctorNamesPickerItems}
                </Picker>
              </View>
            )}

            <Text style={styles.label}>
              Sélectionnez votre hôpital de référence
            </Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={userInfo.userInfo.hospitalId}
                style={styles.picker}
                dropdownIconColor="#403572"
                onValueChange={(itemValue: string) => {
                  userInfo.setUserInfoHospitalId(itemValue);
                }}
              >
                {uiState.hospitalNamesPickerItems}
              </Picker>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonValidate]}
                onPress={handleValidate}
              >
                <Text style={styles.buttonText}>Valider</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#403572",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#403572",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#9F90D4",
    borderRadius: 10,
    backgroundColor: "#f5f3fc",
    color: "#403572",
    fontSize: 15,
    padding: 12,
    marginBottom: 10,
  },
  checkboxContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 4,
    marginBottom: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#9F90D4",
    borderRadius: 10,
    backgroundColor: "#f5f3fc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  checkboxText: {
    color: "#403572",
    fontWeight: "600",
    fontSize: 15,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#403572",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxChecked: {
    backgroundColor: "#403572",
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  pickerWrapper: {
    borderWidth: 2,
    borderColor: "#403572",
    borderRadius: 12,
    backgroundColor: "#f5f3fc",
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    color: "#403572",
    height: 38,
  },
  pickerItems: {
    fontSize: 16,
    color: "#403572",
    backgroundColor: "#f5f3fc",
  },
  errorText: {
    color: "#DE2C1D",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 2,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonValidate: {
    backgroundColor: "#403572",
  },
  buttonCancel: {
    backgroundColor: "#DE2C1D",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
});
