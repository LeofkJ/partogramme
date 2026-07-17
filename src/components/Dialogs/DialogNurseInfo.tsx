/**
 * This components render a dialog allowing the user to enter his nurse info
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
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
import { computed, makeAutoObservable, runInAction } from "mobx";
import { CheckBox } from "@rneui/themed";
import { CustomDropdown } from "./CustomDropdown";
import { logger } from "../../lib/logger";
import { colors } from "../../theme";

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
  isLoading: boolean = false;
  fetchError: string | null = null;

  constructor(userInfo: UserInfoStore) {
    makeAutoObservable(this, {
      doctorNamesDropdownItems: computed,
      hospitalNamesDropdownItems: computed,
    });
    this.userInfoStore = userInfo;
  }

  get doctorNamesDropdownItems() {
    return this.generateDoctorNameItems(this.userInfoStore.doctorInfos);
  }

  get hospitalNamesDropdownItems() {
    return this.generateHospitalNameItems(this.userInfoStore.hospitals);
  }

  generateDoctorNameItems(doctorInfos: UserInfo["Row"][]) {
    if (doctorInfos.length === 0) {
      return [{ label: "Aucun docteur disponible", value: "" }];
    }
    return doctorInfos.map((doctor) => ({
      label: doctor.firstName + " " + doctor.lastName,
      value: doctor.profileId,
    }));
  }

  generateHospitalNameItems(hospitalInfos: Hospital["Row"][]) {
    if (hospitalInfos.length === 0) {
      return [{ label: "Aucun hôpital disponible", value: "" }];
    }
    return hospitalInfos.map((hospital) => ({
      label: hospital.name + ", " + hospital.city,
      value: hospital.id,
    }));
  }

  async fetchData(userInfoStore: UserInfoStore) {
    runInAction(() => {
      this.isLoading = true;
      this.fetchError = null;
    });
    try {
      const [doctors, hospitals] = await Promise.all([
        userInfoStore.transportLayer.fetchAllDoctors(),
        userInfoStore.transportLayer.fetchAllHospitals(),
      ]);
      runInAction(() => {
        this.userInfoStore.doctorInfos = doctors;
        userInfoStore.setHospitals(hospitals);
        this.isLoading = false;
      });
    } catch (error: any) {
      logger.warn("DialogNurseInfo: fetchData failed", { error: error?.message });
      runInAction(() => {
        this.isLoading = false;
        this.fetchError =
          error?.message || "Erreur lors du chargement des données";
      });
    }
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
    const { width, height } = useWindowDimensions();

    useEffect(() => {
      uiState.fetchData(userInfo);
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
        .catch((err: any) => {
          const msg = err?.message || JSON.stringify(err) || "Unknown error";
          logger.warn("DialogNurseInfo: saveUserInfo failed", { error: msg });
          setErrorMessage("Save failed: " + msg);
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
          <View style={[styles.card, { width: Math.min(width * 0.92, 440), maxHeight: height * 0.8 }]}>
            <ScrollView showsVerticalScrollIndicator={true}>

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
              placeholderTextColor={colors.textMuted}
              onChangeText={(text) => (userInfo.userInfoLastName = text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={userInfo.userInfo.firstName}
              placeholderTextColor={colors.textMuted}
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

            {uiState.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : uiState.fetchError ? (
              <View style={styles.fetchErrorContainer}>
                <Text style={styles.fetchErrorText}>
                  Impossible de charger les données : {uiState.fetchError}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => uiState.fetchData(userInfo)}
                >
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {!isDoctor && (
                  <Text style={styles.label}>
                    Sélectionnez votre docteur de référence
                  </Text>
                )}
                {!isDoctor && (
                  <CustomDropdown
                    items={uiState.doctorNamesDropdownItems}
                    selectedValue={userInfo.userInfo.refDoctorId}
                    onValueChange={(itemValue) => {
                      runInAction(() => {
                        userInfo.userInfo.refDoctorId = itemValue;
                      });
                    }}
                    placeholder="Sélectionnez un docteur"
                  />
                )}

                <Text style={styles.label}>
                  Sélectionnez votre hôpital de référence
                </Text>
                <CustomDropdown
                  items={uiState.hospitalNamesDropdownItems}
                  selectedValue={userInfo.userInfo.hospitalId}
                  onValueChange={(itemValue: string) => {
                    userInfo.setUserInfoHospitalId(itemValue);
                  }}
                  placeholder="Sélectionnez un hôpital"
                />
              </>
            )}
            </ScrollView>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, styles.buttonTextCancel]}>Annuler</Text>
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
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.text,
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
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  checkboxText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 15,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxChecked: {
    backgroundColor: colors.accent,
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  errorText: {
    color: colors.danger,
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
    backgroundColor: colors.accent,
  },
  buttonCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonTextCancel: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: colors.text,
    fontSize: 14,
  },
  fetchErrorContainer: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  fetchErrorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
