import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  InteractionManager,
  TouchableOpacity,
} from "react-native";
import { observer } from "mobx-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DialogDataInputGraph from "../../components/Dialogs/DialogDataInputGraph";
import { useEffect, useState } from "react";
import BabyGraph from "../../components/Graphs/BabyGraph";
import { rootStore } from "../../store/rootStore";
import DilationGraph from "../../components/Graphs/DilationGraph";
import { ScrollView } from "react-native-gesture-handler";
import DataTable from "../../components/Tables/DataTable";
import DialogDataInputTable, {
  DataInputTable_t,
} from "../../components/Dialogs/DialogDataInputTable";
import { AmnioticLiquidStore } from "../../store/TableData/AmnioticLiquid/amnioticLiquidStore";
import { Database } from "../../../types/supabase";
import { MotherSystolicBloodPressureStore } from "../../store/TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore";
import { MotherContractionsFrequencyStore } from "../../store/TableData/MotherContractionsFrequency/motherContractionsFrequencyStore";
import { MotherHeartFrequencyStore } from "../../store/TableData/MotherHeartFrequency/motherHeartFrequencyStore";
import { MotherTemperatureStore } from "../../store/TableData/MotherTemperature/motherTemperatureStore";
import ErrorDialog from "../../components/Dialogs/ErrorDialog";
import { IconPencil } from "../../components/Icons";
import CustomButton from "../../components/CustomButton";
import DataModifierDialog from "../../components/DataModifierDialog";
import { MotherDiastolicBloodPressureStore } from "../../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { MotherContractionDurationStore } from "../../store/TableData/MotherContractionDuration/MotherContractionDurationStore";
import { CommentsSlider } from "../../components/CommentsSlider";
import { DialogEditText } from "../../components/Dialogs/DialogEditText";
import { formatDateString } from "../../tools/StringUtilitary";
import { getStatusBackgroundColor } from "../../store/partogramme/partogrammeStore";
import { getStringByEnum, partogrammeStates } from "../../../types/constants";
import { DialogConfirm } from "../../components/Dialogs/DialogConfirm";
import { logger } from "../../lib/logger";

export type Props = {
  navigation: any;
};

export const ScreenGraph: React.FC<Props> = observer(({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const [isFcDialogVisible, setFcDialogVisible] = useState(false);
  const [isDilationDialogVisible, setDilationDialogVisible] = useState(false);
  const [isDescentBabyDialogVisible, setDescentBabyDialogVisible] =
    useState(false);
  const [isAddTableDataDialogVisible, setAddTableDataDialogVisible] =
    useState(false);
  const [isDataModifierDialogVisible, setDataModifierDialogVisible] =
    useState(false);
  const [isAddCommentDialogVisible, setAddCommentDialogVisible] =
    useState(false);
  const [isChangeStateDialogVisible, setChangeStateDialogVisible] =
    useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newState, setNewState] = useState("");

  const partogramme = rootStore.partogrammeStore.selectedPartogramme;

  useEffect(() => {
    if (partogramme === undefined) {
      navigation.goBack();
    }
  }, [partogramme, navigation]);

  // Role and status helpers
  const userRole = rootStore.userInfoStore.userInfo.role;
  const status = partogramme?.partogramme.state;
  const isNurse = userRole === "NURSE";
  const isDoctor = userRole === "DOCTOR";

  // Nurse can edit when EN COURS, doctor can edit when TRANSFERÉ
  const canEdit =
    (isNurse && status === "IN_PROGRESS") ||
    (isDoctor && status === "TRANSFERRED");

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      fetchData();
      setTimeout(() => setIsReady(true), 1);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {});
    const cleanup = () => {};
    return () => {
      cleanup();
      unsubscribe();
    };
  }, [navigation]);

  const onDialogCloseAddFcBaby = (data: string) => {
    if (partogramme === null) return;
    partogramme?.babyHeartFrequencyStore
      .createBabyHeartFrequency(
        Number(data),
        new Date().toISOString(),
        0,
      )
      .then(() => {});
    setFcDialogVisible(false);
  };

  const onDialogCloseAddDilation = (data: string) => {
    if (partogramme === null) return;
    partogramme?.dilationStore.createDilation(
      new Date().toISOString(),
      Number(data),
      0,
    );
    setDilationDialogVisible(false);
  };

  const onDialogCloseAddDescentBaby = (data: string) => {
    if (partogramme === null) return;
    partogramme?.babyDescentStore.createBabyDescent(
      Number(data),
      new Date().toISOString(),
      0,
    );
    setDescentBabyDialogVisible(false);
  };

  const onDialogCloseAddDataTable = (
    dataStore?: DataInputTable_t,
    data?: string,
  ) => {
    if (partogramme === null || dataStore === undefined || data === undefined) {
      Alert.alert(
        "Code Error : Unknown data store type. \n contact the administrator",
      );
      return;
    }
    if (dataStore instanceof AmnioticLiquidStore) {
      dataStore
        .createAmnioticLiquid(
          new Date().toISOString(),
          Number(dataStore.highestRank) + 1,
          data as Database["public"]["Enums"]["LiquidState"],
        )
        .catch((error) => {
          logger.warn("Graph: createAmnioticLiquid failed", { error: error?.message });
          Platform.OS === "web" ? null : Alert.alert(error.message);
        });
    } else if (dataStore instanceof MotherSystolicBloodPressureStore) {
      dataStore.createNew(
        Number(data),
        new Date().toISOString(),
        Number(dataStore.highestRank) + 1,
      );
    } else if (dataStore instanceof MotherDiastolicBloodPressureStore) {
      dataStore.createNew(
        Number(data),
        new Date().toISOString(),
        Number(dataStore.highestRank) + 1,
      );
    } else if (dataStore instanceof MotherContractionsFrequencyStore) {
      dataStore.createMotherContractionsFrequency(
        Number(data),
        new Date().toISOString(),
        Number(dataStore.highestRank) + 1,
      );
    } else if (dataStore instanceof MotherContractionDurationStore) {
      dataStore.createData({
        value: Number(data),
        created_at: new Date().toISOString(),
        Rank: Number(dataStore.highestRank) + 1,
      });
    } else if (dataStore instanceof MotherHeartFrequencyStore) {
      dataStore.createMotherHeartFrequency(
        Number(data),
        new Date().toISOString(),
        Number(dataStore.highestRank) + 1,
      );
    } else if (dataStore instanceof MotherTemperatureStore) {
      dataStore.createMotherTemperature(
        Number(data),
        new Date().toISOString(),
        Number(dataStore.highestRank) + 1,
      );
    } else {
      Alert.alert(
        "Code Error : Unknown data store type. \n contact the administrator",
      );
      setAddTableDataDialogVisible(false);
      return;
    }
    setAddTableDataDialogVisible(false);
  };

  const onDialogCloseAddComment = (comment: string) => {
    if (partogramme === null) return;
    partogramme?.commentStore
      .createData({
        value: comment,
        created_at: new Date().toISOString(),
      })
      .catch((error) => {
        logger.warn("Graph: createData (comment) failed", { error: error?.message });
        setErrorMsg(error.message);
        setErrorCode(error.code);
        setIsErrorDialogVisible(true);
      });
    setAddCommentDialogVisible(false);
  };

  const openAddCommentDialog = () => setAddCommentDialogVisible(true);
  const openFcDialog = () => setFcDialogVisible(true);
  const openDilationDialog = () => setDilationDialogVisible(true);
  const openDescentBabyDialog = () => setDescentBabyDialogVisible(true);
  const openAddDataTable = () => setAddTableDataDialogVisible(true);

  const fetchData = () => {
    if (partogramme === null) return;
    partogramme?.babyHeartFrequencyStore.loadBabyHeartFrequencies();
    partogramme?.babyDescentStore.loadBabyDescents();
    partogramme?.dilationStore.loadDilations();
    partogramme?.motherSystolicBloodPressureStore.loadData();
    partogramme?.motherDiastolicBloodPressureStore.loadData();
    partogramme?.motherContractionFrequencyStore.loadMotherContractionsFrequencies();
    partogramme?.motherContractionDurationStore.load();
    partogramme?.motherTemperatureStore.loadMotherTemperatures();
    partogramme?.motherHeartRateFrequencyStore.loadMotherHeartFrequencies();
    partogramme?.amnioticLiquidStore.loadAmnioticLiquids();
    partogramme?.commentStore.load();
  };

  if (partogramme === undefined) {
    return null;
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#403572" />
      </View>
    );
  } else {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollViewContentStyle}
        >
          <Text style={styles.titleText}>
            Partogramme de {partogramme?.asJson.patientFirstName}{" "}
            {partogramme?.asJson.patientLastName}
          </Text>
          <Text style={[styles.sectionTitleText, { marginTop: 10 }]}>
            Informations générales
          </Text>
          <View style={{ flex: 1, marginTop: 5, width: "95%" }}>
            <View
              style={[
                { paddingTop: 5, paddingBottom: 5, alignContent: "center" },
                styles.backGroundInfo,
              ]}
            >
              <View style={{ flexDirection: "row" }}>
                <Text style={[styles.infoTitleText, { padding: 2 }]}>
                  Statut :{" "}
                </Text>
                <Text
                  style={[
                    styles.infoText,
                    {
                      backgroundColor: getStatusBackgroundColor(
                        partogramme!.asJson.state,
                      ),
                      borderRadius: 5,
                      padding: 2,
                    },
                  ]}
                >
                  {getStringByEnum(
                    partogrammeStates,
                    partogramme?.asJson.state,
                  )}
                </Text>
              </View>
              <Text style={[styles.infoTitleText, { padding: 2 }]}>
                Mise à jour du statut :{" "}
              </Text>
              <View style={{ flex: 1, flexDirection: "row", width: "100%" }}>
                {/* EN COURS — nurse only, when ADMITTED */}
                {isNurse && (
                  <TouchableOpacity
                    disabled={partogramme!.asJson.state !== "ADMITTED"}
                    onPress={() => {
                      setNewState("IN_PROGRESS");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#403572",
                      borderRadius: 5,
                      padding: 2,
                      alignItems: "center",
                      opacity:
                        partogramme!.asJson.state === "ADMITTED" ? 1 : 0.4,
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                    >
                      {"EN COURS"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* TRANSFERÉ — nurse only, when IN_PROGRESS */}
                {isNurse && (
                  <TouchableOpacity
                    disabled={partogramme!.asJson.state !== "IN_PROGRESS"}
                    activeOpacity={0.2}
                    onPress={() => {
                      setNewState("TRANSFERRED");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#403572",
                      borderRadius: 5,
                      padding: 2,
                      marginLeft: 5,
                      alignItems: "center",
                      opacity:
                        partogramme!.asJson.state === "IN_PROGRESS" ? 1 : 0.4,
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                    >
                      {"TRANSFERÉ"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* TERMINÉ — nurse when IN_PROGRESS, doctor when TRANSFERRED */}
                {((isNurse && status === "IN_PROGRESS") ||
                  (isDoctor && status === "TRANSFERRED")) && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => {
                      setNewState("WORK_FINISHED");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#403572",
                      borderRadius: 5,
                      padding: 2,
                      marginLeft: 5,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                    >
                      {"TERMINÉ"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={[styles.infoTitleText, styles.backGroundInfo]}>
              Date et heure d'admission :{"\n"}
              {formatDateString(partogramme!.asJson.admissionDateTime)}
            </Text>
            <Text style={[styles.infoTitleText, styles.backGroundInfo]}>
              Date et heure de début du travail :{"\n"}
              {formatDateString(partogramme!.asJson.workStartDateTime)}
            </Text>
            <Text style={[styles.infoTitleText, styles.backGroundInfo]}>
              Nom de l'hôpital :{" "}
              {
                rootStore.userInfoStore.hospitals.filter(
                  (h) => h.id === rootStore.userInfoStore.userInfo?.hospitalId,
                )[0]?.name
              }
            </Text>
            <Text style={[styles.infoTitleText, styles.backGroundInfo]}>
              Numéro de dossier : {partogramme?.asJson.noFile}
            </Text>
          </View>

          <DialogConfirm
            Title="Confirmation du changement d'état"
            isVisible={isChangeStateDialogVisible}
            setIsVisible={setChangeStateDialogVisible}
            onValidate={() => {
              partogramme!
                .changeState(
                  newState as Database["public"]["Enums"]["PartogrammeState"],
                )
                .catch((error) => {
                  logger.warn("Graph: changeState failed", { newState, error: error?.message });
                  setErrorMsg(error.message);
                  setErrorCode(error.code);
                  setIsErrorDialogVisible(true);
                });
              setChangeStateDialogVisible(false);
            }}
            InfoText={`Voulez-vous vraiment changer l'état du partogramme vers ${partogrammeStates[newState as keyof typeof partogrammeStates]} ?`}
          />

          <Text style={styles.textTitle}>Fréquence Cardiaque du bébé</Text>
          <BabyGraph
            data={
              rootStore.partogrammeStore.selectedPartogramme
                ?.babyHeartFrequencyStore.babyHeartFrequencyGraphData
            }
          />
          <DialogDataInputGraph
            visible={isFcDialogVisible}
            onClose={onDialogCloseAddFcBaby}
            onCancel={() => setFcDialogVisible(false)}
            startValue={120}
            endValue={180}
            step={10}
            dataName={"Fréquence cardiaque du bébé"}
          />
          {canEdit && (
            <CustomButton
              title="+ Ajouter FC bébé"
              color="#403572"
              disabled={false}
              style={styles.buttonStyle}
              onPressFunction={openFcDialog}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}

          <Text style={styles.textTitle}>Graphique de dilatation</Text>
          <DilationGraph
            dilationStore={partogramme?.dilationStore}
            babyDescentStore={partogramme?.babyDescentStore}
          />
          <DialogDataInputGraph
            visible={isDilationDialogVisible}
            onClose={onDialogCloseAddDilation}
            onCancel={() => setDilationDialogVisible(false)}
            startValue={4}
            endValue={10}
            step={1}
            dataName={"Dilatation du col de l'utérus"}
          />
          {canEdit && (
            <View style={styles.buttonRow}>
              <CustomButton
                title="+ Dilatation"
                color="#403572"
                disabled={false}
                style={styles.buttonStyle2}
                onPressFunction={openDilationDialog}
                styleText={{ fontSize: 14, fontWeight: "bold" }}
              />
              <CustomButton
                title="+ Descente bébé"
                color="#9F90D4"
                disabled={false}
                style={styles.buttonStyle2}
                onPressFunction={openDescentBabyDialog}
                styleText={{ fontSize: 14, fontWeight: "bold" }}
              />
            </View>
          )}
          <DialogDataInputGraph
            visible={isDescentBabyDialogVisible}
            onClose={onDialogCloseAddDescentBaby}
            onCancel={() => setDescentBabyDialogVisible(false)}
            startValue={0}
            endValue={10}
            step={1}
            dataName={"Descente du bébé"}
          />

          <DataTable
            maxHours={12}
            tableData={[
              partogramme!.motherTemperatureStore.motherTemperatureListAsString,
              partogramme!.motherSystolicBloodPressureStore
                .motherBloodPressureListAsString,
              partogramme!.motherDiastolicBloodPressureStore
                .motherBloodPressureListAsString,
              partogramme!.motherHeartRateFrequencyStore
                .motherHeartRateFrequencyListAsString,
              partogramme!.motherContractionFrequencyStore
                .motherContractionFrequencyListAsString,
              partogramme!.motherContractionDurationStore.DataListAsString,
              partogramme!.amnioticLiquidStore.amnioticLiquidAsTableString,
            ]}
          />
          {canEdit && (
            <CustomButton
              title="+ Ajouter des données au tableau"
              color="#403572"
              disabled={false}
              style={styles.buttonStyle}
              onPressFunction={openAddDataTable}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}

          <CommentsSlider
            data={partogramme!.commentStore.DataListAsJson}
            title="Liste des Commentaires"
          />
          <DialogEditText
            visible={isAddCommentDialogVisible}
            onClose={onDialogCloseAddComment}
            onCancel={() => setAddCommentDialogVisible(false)}
            data_name={"Ajouter un commentaire"}
          />
          {canEdit && (
            <CustomButton
              title="+ Ajouter un commentaire"
              color="#403572"
              disabled={false}
              style={styles.buttonAddCommentary}
              onPressFunction={openAddCommentDialog}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}
        </ScrollView>

        {canEdit && (
          <TouchableOpacity
            style={[styles.overlayPenButton, styles.fabButton, { bottom: 20 + insets.bottom, right: 20 + insets.right }]}
            onPress={() => setDataModifierDialogVisible(true)}
          >
            <IconPencil size={24} color="white" />
          </TouchableOpacity>
        )}

        {partogramme && (
          <DialogDataInputTable
            visible={isAddTableDataDialogVisible}
            onClose={onDialogCloseAddDataTable}
            onCancel={() => setAddTableDataDialogVisible(false)}
            data={[
              partogramme.amnioticLiquidStore,
              partogramme.motherSystolicBloodPressureStore,
              partogramme.motherDiastolicBloodPressureStore,
              partogramme.motherHeartRateFrequencyStore,
              partogramme.motherTemperatureStore,
              partogramme.motherContractionFrequencyStore,
              partogramme.motherContractionDurationStore,
            ]}
          />
        )}

        <ErrorDialog
          isVisible={isErrorDialogVisible}
          errorCode={errorCode}
          errorMsg={errorMsg}
          toggleDialog={() => setIsErrorDialogVisible(!isErrorDialogVisible)}
        />
        <DataModifierDialog
          visible={isDataModifierDialogVisible}
          partogramme={partogramme!}
          onCancel={() => setDataModifierDialogVisible(false)}
        />
      </View>
    );
  }
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#ffffff",
    width: "100%",
  },
  scrollViewContentStyle: {
    alignItems: "center",
    paddingBottom: 100,
  },
  textTitle: {
    marginTop: 50,
    fontSize: 20,
    fontWeight: "bold",
    color: "#403572",
  },
  infoTitleText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#403572",
  },
  backGroundInfo: {
    backgroundColor: "#d5d0e9",
    paddingLeft: 5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomWidth: 1,
    marginTop: 5,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 15,
    color: "#403572",
  },
  buttonStyle: {
    width: "90%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    width: "90%",
    gap: 10,
    marginTop: 8,
  },
  buttonStyle2: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
  },
  buttonAddCommentary: {
    width: "90%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  overlayPenButton: {
    position: "absolute",
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#9F90D4",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  titleText: {
    textAlign: "left",
    color: "#403572",
    fontSize: 20,
    paddingStart: 20,
    alignSelf: "flex-start",
  },
  sectionTitleText: {
    textAlign: "left",
    color: "#403572",
    fontSize: 20,
    margin: 2,
    fontWeight: "bold",
  },
});
