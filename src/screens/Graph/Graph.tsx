import {
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
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
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
import EditDataDialog from "../../components/Dialogs/EditDataDialog";
import { MotherDiastolicBloodPressureStore } from "../../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { MotherContractionDurationStore } from "../../store/TableData/MotherContractionDuration/MotherContractionDurationStore";
import { dataStore_t } from "../../store/partogramme/partogrammeStore";
import { CommentsSlider } from "../../components/CommentsSlider";
import { DialogEditText } from "../../components/Dialogs/DialogEditText";
import { formatDateOnly, formatTimeOnly } from "../../tools/StringUtilitary";
import { getStringByEnum, partogrammeStates } from "../../../types/constants";
import { DialogConfirm } from "../../components/Dialogs/DialogConfirm";
import { logger } from "../../lib/logger";
import { notify } from "../../lib/notify";
import { colors, spacing, radius, layout, statusColors } from "../../theme";

export type Props = {
  navigation: any;
};

export const ScreenGraph: React.FC<Props> = observer(({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFcDialogVisible, setFcDialogVisible] = useState(false);
  const [isDilationDialogVisible, setDilationDialogVisible] = useState(false);
  const [isDescentBabyDialogVisible, setDescentBabyDialogVisible] =
    useState(false);
  const [isAddTableDataDialogVisible, setAddTableDataDialogVisible] =
    useState(false);
  const [isDataModifierDialogVisible, setDataModifierDialogVisible] =
    useState(false);
  const [dataModifierStores, setDataModifierStores] = useState<dataStore_t[]>([]);
  const [isAddCommentDialogVisible, setAddCommentDialogVisible] =
    useState(false);
  const [isChangeStateDialogVisible, setChangeStateDialogVisible] =
    useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newState, setNewState] = useState("");
  const [editingTableItem, setEditingTableItem] = useState<any>(null);
  const [addTableDataPreselected, setAddTableDataPreselected] = useState<DataInputTable_t | undefined>(undefined);
  const [addTableDataTargetHour, setAddTableDataTargetHour] = useState<number | null>(null);

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
      notify.error(
        "Code Error : Unknown data store type. \n contact the administrator",
      );
      return;
    }
    const rank = addTableDataTargetHour ?? Number(dataStore.highestRank) + 1;
    if (dataStore instanceof AmnioticLiquidStore) {
      dataStore
        .createAmnioticLiquid(
          new Date().toISOString(),
          rank,
          data as Database["public"]["Enums"]["LiquidState"],
        )
        .catch((error) => {
          logger.warn("Graph: createAmnioticLiquid failed", { error: error?.message });
          notify.error("Erreur", error.message);
        });
    } else if (dataStore instanceof MotherSystolicBloodPressureStore) {
      dataStore.createNew(
        Number(data),
        new Date().toISOString(),
        rank,
      );
    } else if (dataStore instanceof MotherDiastolicBloodPressureStore) {
      dataStore.createNew(
        Number(data),
        new Date().toISOString(),
        rank,
      );
    } else if (dataStore instanceof MotherContractionsFrequencyStore) {
      dataStore.createMotherContractionsFrequency(
        Number(data),
        new Date().toISOString(),
        rank,
      );
    } else if (dataStore instanceof MotherContractionDurationStore) {
      dataStore.createData({
        value: Number(data),
        created_at: new Date().toISOString(),
        Rank: rank,
      });
    } else if (dataStore instanceof MotherHeartFrequencyStore) {
      dataStore.createMotherHeartFrequency(
        Number(data),
        new Date().toISOString(),
        rank,
      );
    } else if (dataStore instanceof MotherTemperatureStore) {
      dataStore.createMotherTemperature(
        Number(data),
        new Date().toISOString(),
        rank,
      );
    } else {
      notify.error(
        "Code Error : Unknown data store type. \n contact the administrator",
      );
      setAddTableDataDialogVisible(false);
      return;
    }
    setAddTableDataDialogVisible(false);
    setAddTableDataPreselected(undefined);
    setAddTableDataTargetHour(null);
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
  const openAddDataTable = () => {
    setAddTableDataPreselected(undefined);
    setAddTableDataTargetHour(null);
    setAddTableDataDialogVisible(true);
  };
  const openAddDataTableForCell = (store: DataInputTable_t, hour: number) => {
    setAddTableDataPreselected(store);
    setAddTableDataTargetHour(hour);
    setAddTableDataDialogVisible(true);
  };

  const fetchData = () => {
    if (partogramme === null) return Promise.resolve();
    return Promise.allSettled([
      partogramme?.babyHeartFrequencyStore.loadBabyHeartFrequencies(),
      partogramme?.babyDescentStore.loadBabyDescents(),
      partogramme?.dilationStore.loadDilations(),
      partogramme?.motherSystolicBloodPressureStore.loadData(),
      partogramme?.motherDiastolicBloodPressureStore.loadData(),
      partogramme?.motherContractionFrequencyStore.loadMotherContractionsFrequencies(),
      partogramme?.motherContractionDurationStore.load(),
      partogramme?.motherTemperatureStore.loadMotherTemperatures(),
      partogramme?.motherHeartRateFrequencyStore.loadMotherHeartFrequencies(),
      partogramme?.amnioticLiquidStore.loadAmnioticLiquids(),
      partogramme?.commentStore.load(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  if (partogramme === undefined) {
    return null;
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  } else {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollViewContentStyle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          <Text style={styles.patientTitleLabel}>Partogramme de</Text>
          <Text style={styles.patientTitle}>
            {partogramme?.asJson.patientFirstName}{" "}
            {partogramme?.asJson.patientLastName}
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
                      backgroundColor: statusColors(partogramme!.asJson.state).bg,
                      color: statusColors(partogramme!.asJson.state).fg,
                      fontWeight: "600",
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                      overflow: "hidden",
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
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
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
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
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
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Admission</Text>
              <Text style={styles.infoValue}>
                {formatDateOnly(partogramme!.asJson.admissionDateTime)}
              </Text>
              <Text style={styles.infoTime}>
                {formatTimeOnly(partogramme!.asJson.admissionDateTime)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Début du travail</Text>
              <Text style={styles.infoValue}>
                {formatDateOnly(partogramme!.asJson.workStartDateTime)}
              </Text>
              <Text style={styles.infoTime}>
                {formatTimeOnly(partogramme!.asJson.workStartDateTime)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hôpital</Text>
              <Text style={styles.infoValue}>
                {
                  rootStore.userInfoStore.hospitals.filter(
                    (h) => h.id === rootStore.userInfoStore.userInfo?.hospitalId,
                  )[0]?.name
                }
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dossier</Text>
              <Text style={styles.infoValue}>#{partogramme?.asJson.noFile}</Text>
            </View>
            {!!partogramme?.asJson.commentary && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Commentaire</Text>
                <Text style={styles.infoValue}>
                  {partogramme.asJson.commentary}
                </Text>
              </View>
            )}
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

          <View style={styles.sectionTitleRow}>
            <Text style={styles.textTitle}>Fréquence Cardiaque du bébé</Text>
            {canEdit && partogramme!.babyHeartFrequencyStore.dataList.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setDataModifierStores([partogramme!.babyHeartFrequencyStore]);
                  setDataModifierDialogVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modifyLink}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>
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
              color={colors.accent}
              disabled={false}
              style={styles.buttonStyle}
              onPressFunction={openFcDialog}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}

          <View style={styles.sectionTitleRow}>
            <Text style={styles.textTitle}>Graphique de dilatation</Text>
            {canEdit &&
              (partogramme!.dilationStore.dataList.length > 0 ||
                partogramme!.babyDescentStore.dataList.length > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setDataModifierStores([partogramme!.dilationStore, partogramme!.babyDescentStore]);
                  setDataModifierDialogVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modifyLink}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>
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
                color={colors.accent}
                disabled={false}
                style={styles.buttonStyle2}
                onPressFunction={openDilationDialog}
                styleText={{ fontSize: 14, fontWeight: "bold" }}
              />
              <CustomButton
                title="+ Descente bébé"
                color={colors.accentPressed}
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
            editable={canEdit}
            columns={[
              {
                label: "Temp",
                fullName: "Température de la mère",
                items: partogramme!.motherTemperatureStore.sortedMotherTemperatureList,
                formattedValues: partogramme!.motherTemperatureStore.motherTemperatureListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherTemperatureStore, hour),
              },
              {
                label: "PA Sys",
                fullName: "Tension artérielle Systolique de la mère",
                items: partogramme!.motherSystolicBloodPressureStore.sortedMotherBloodPressureList,
                formattedValues: partogramme!.motherSystolicBloodPressureStore.motherBloodPressureListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherSystolicBloodPressureStore, hour),
              },
              {
                label: "PA Dia",
                fullName: "Tension artérielle Diastolique de la mère",
                items: partogramme!.motherDiastolicBloodPressureStore.sortedMotherBloodPressureList,
                formattedValues: partogramme!.motherDiastolicBloodPressureStore.motherBloodPressureListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherDiastolicBloodPressureStore, hour),
              },
              {
                label: "Pouls",
                fullName: "Pouls de la mère",
                items: partogramme!.motherHeartRateFrequencyStore.sortedMotherHeartFrequencyList,
                formattedValues: partogramme!.motherHeartRateFrequencyStore.motherHeartRateFrequencyListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherHeartRateFrequencyStore, hour),
              },
              {
                label: "Fréq. contr.",
                fullName: "Fréquence des contractions",
                items: partogramme!.motherContractionFrequencyStore.sortedMotherContractionsFrequencyList,
                formattedValues: partogramme!.motherContractionFrequencyStore.motherContractionFrequencyListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherContractionFrequencyStore, hour),
              },
              {
                label: "Durée contr.",
                fullName: "Durée des contractions de la mère",
                items: partogramme!.motherContractionDurationStore.sortedMotherContractionDurationList,
                formattedValues: partogramme!.motherContractionDurationStore.DataListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherContractionDurationStore, hour),
              },
              {
                label: "Liquide",
                fullName: "Liquide Amniotique",
                items: partogramme!.amnioticLiquidStore.sortedAmnioticLiquidList,
                formattedValues: partogramme!.amnioticLiquidStore.amnioticLiquidAsTableString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.amnioticLiquidStore, hour),
              },
            ]}
          />
          {editingTableItem && (
            <EditDataDialog
              visible={!!editingTableItem}
              data={editingTableItem}
              onCancel={() => setEditingTableItem(null)}
              onDelete={() => {
                editingTableItem.delete();
                setEditingTableItem(null);
              }}
              onValidate={(data) => {
                editingTableItem
                  ?.update(data.toString())
                  .then(() => setEditingTableItem(null))
                  .catch((error: any) => {
                    logger.warn("Graph: table cell edit failed", { error: error?.message });
                    setErrorMsg(error.message);
                    setErrorCode(error.code);
                    setIsErrorDialogVisible(true);
                    setEditingTableItem(null);
                  });
              }}
            />
          )}
          {canEdit && (
            <CustomButton
              title="+ Ajouter des données au tableau"
              color={colors.accent}
              disabled={false}
              style={styles.buttonStyle}
              onPressFunction={openAddDataTable}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}

          <CommentsSlider
            data={partogramme!.commentStore.sortedCommentList}
            title="Liste des Commentaires"
            onEditPress={canEdit ? (item) => setEditingTableItem(item) : undefined}
            onDeletePress={canEdit ? (item) => item.delete() : undefined}
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
              color={colors.accent}
              disabled={false}
              style={styles.buttonAddCommentary}
              onPressFunction={openAddCommentDialog}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}
        </ScrollView>


        {partogramme && (
          <DialogDataInputTable
            visible={isAddTableDataDialogVisible}
            onClose={onDialogCloseAddDataTable}
            onCancel={() => {
              setAddTableDataDialogVisible(false);
              setAddTableDataPreselected(undefined);
              setAddTableDataTargetHour(null);
            }}
            preSelectedDataChoice={addTableDataPreselected}
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
          dataStores={dataModifierStores}
          onCancel={() => setDataModifierDialogVisible(false)}
        />
      </View>
    );
  }
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
    width: "100%",
  },
  // Single content lane: every section (info, buttons, graphs, table,
  // comments) sizes against this capped column, not the raw window.
  scrollViewContentStyle: {
    alignItems: "center",
    paddingBottom: 100,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  sectionTitleRow: {
    width: "95%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.xxl + spacing.lg,
  },
  textTitle: {
    fontSize: 19,
    fontWeight: "600",
    color: colors.text,
  },
  modifyLink: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.accent,
    paddingBottom: 2,
  },
  infoTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  backGroundInfo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  infoRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  infoTime: {
    fontSize: 13,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  buttonStyle: {
    width: "90%",
    height: layout.touchTarget,
    borderRadius: radius.sm,
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
    height: layout.touchTarget,
    borderRadius: radius.sm,
    justifyContent: "center",
  },
  buttonAddCommentary: {
    width: "90%",
    height: layout.touchTarget,
    borderRadius: radius.sm,
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  patientTitleLabel: {
    width: "95%",
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.lg,
  },
  patientTitle: {
    width: "95%",
    color: colors.text,
    fontSize: 22,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  sectionTitleText: {
    textAlign: "left",
    color: colors.textSecondary,
    fontSize: 15,
    margin: 2,
    fontWeight: "600",
  },
});
