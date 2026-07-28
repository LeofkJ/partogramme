import React, { useEffect, useState } from "react";
import { colors } from "../../theme";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { CustomDropdown } from "./CustomDropdown";
import { AmnioticLiquidStore } from "../../store/TableData/AmnioticLiquid/amnioticLiquidStore";
import { MotherSystolicBloodPressureStore } from "../../store/TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore";
import { MotherContractionsFrequencyStore } from "../../store/TableData/MotherContractionsFrequency/motherContractionsFrequencyStore";
import { MotherHeartFrequencyStore } from "../../store/TableData/MotherHeartFrequency/motherHeartFrequencyStore";
import { MotherTemperatureStore } from "../../store/TableData/MotherTemperature/motherTemperatureStore";
import { getEnumByString, getValueByRank, liquidStates } from "../../../types/constants";
import { rootStore } from "../../store/rootStore";
import { observer } from "mobx-react";
import { MotherDiastolicBloodPressureStore } from "../../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { MotherContractionDurationStore } from "../../store/TableData/MotherContractionDuration/MotherContractionDurationStore";

export type DataInputTable_t =
  | AmnioticLiquidStore
  | MotherSystolicBloodPressureStore
  | MotherDiastolicBloodPressureStore
  | MotherContractionsFrequencyStore
  | MotherContractionDurationStore
  | MotherHeartFrequencyStore
  | MotherTemperatureStore;

export interface DataInputEntry {
  dataStore: DataInputTable_t;
  value: string;
}

export interface Props {
  visible: boolean;
  data: DataInputTable_t[];
  onClose: (entries: DataInputEntry[]) => void;
  onCancel: () => void;
  onDelete?: () => void;
  preSelectedDataChoice?: DataInputTable_t;
  /** When set (editing an existing entry), the ISO timestamp it was recorded at. */
  recordedAt?: string;
}

const DialogDataInputTable: React.FC<Props> = observer(({
  visible,
  data,
  onClose,
  onCancel,
  onDelete,
  preSelectedDataChoice,
  recordedAt,
}) => {
  const { width } = useWindowDimensions();

  const [selectedDataName, setSelectedDataName] = useState(
    preSelectedDataChoice
      ? preSelectedDataChoice.name
      : data
      ? data[0].name
      : ""
  );

  const [selectedDataNameIndex, setSelectedDataNameIndex] = useState(
    preSelectedDataChoice
      ? data.findIndex((element) => element.name === preSelectedDataChoice.name)
      : 0
  );

  useEffect(() => {
    if (preSelectedDataChoice) {
      setSelectedDataName(preSelectedDataChoice.name);
      setSelectedDataNameIndex(
        data.findIndex((element) => element.name === preSelectedDataChoice.name)
      );
    }
  }, [preSelectedDataChoice]);

  const [selectedAmnioticLiquidState, setSelectedAmnioticLiquidState] =
    useState(getValueByRank(liquidStates, 0) as string);
  const [inputDataNumber, setInputDataNumber] = useState("0");

  // Multi-field entry (no preselected type): one optional value per data
  // type, starts empty every time the dialog opens — pre-filling with the
  // last recorded value read as "did this not clear?" once someone had just
  // submitted that same value moments before.
  const [multiValues, setMultiValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (visible && !preSelectedDataChoice) {
      setMultiValues({});
    }
  }, [visible, preSelectedDataChoice]);

  // Brief confirmation flash so submitting always gives clear, immediate
  // proof it worked — a submission that updates an existing row instead of
  // creating a new one is otherwise invisible, which reads as "did nothing".
  const [justSaved, setJustSaved] = useState(false);
  const confirmSave = (entries: DataInputEntry[]) => {
    onClose(entries);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 900);
  };

  // Confirming a too-soon submission is a second screen inside this SAME
  // modal (not a separate sibling <Modal>) — two simultaneously-visible
  // React Native Modals don't reliably stack on top of each other on native,
  // so the confirm has to live inside this one to actually be seen.
  const [pendingEntries, setPendingEntries] = useState<DataInputEntry[] | null>(null);
  const [recentMinutesAgo, setRecentMinutesAgo] = useState(0);

  useEffect(() => {
    if (visible) setPendingEntries(null);
  }, [visible]);

  // MotherContractionsFrequencyStore's full unit ("contractions/10min") is
  // long enough to crush the numeric input next to it on narrow screens —
  // prefer its short form here, same as the compact table view already does.
  const displayUnit = (store: DataInputTable_t): string =>
    store instanceof MotherContractionsFrequencyStore ? store.unit_short : store.unit;

  const generateAmnioticLiquidItems = () => {
    return Array.from({ length: Object.keys(liquidStates).length }, (_, i) => (
      <Picker.Item
        key={i}
        label={getValueByRank(liquidStates, i) as string}
        value={getValueByRank(liquidStates, i) as string}
        style={styles.pickerItem}
      />
    ));
  };

  const amnioticLiquidDropdownItems = () => {
    return Array.from({ length: Object.keys(liquidStates).length }, (_, i) => {
      const value = getValueByRank(liquidStates, i) as string;
      return { label: value, value };
    });
  };

  const renderDataPicker = () => {
    if (selectedDataName === data[0].partogrammeStore.amnioticLiquidStore.name) {
      return Platform.OS === "web" ? (
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            mode="dropdown"
            selectedValue={selectedAmnioticLiquidState}
            onValueChange={(itemValue) => setSelectedAmnioticLiquidState(itemValue)}
          >
            {generateAmnioticLiquidItems()}
          </Picker>
        </View>
      ) : (
        <CustomDropdown
          items={amnioticLiquidDropdownItems()}
          selectedValue={selectedAmnioticLiquidState}
          onValueChange={setSelectedAmnioticLiquidState}
          buttonStyle={styles.dropdownButton}
          textStyle={styles.dropdownButtonText}
        />
      );
    } else {
      return (
        <View style={styles.numberInputRow}>
          <TextInput
            style={styles.inputTextNumber}
            keyboardType="numeric"
            onChangeText={(text) => setInputDataNumber(text)}
            value={inputDataNumber}
            maxLength={7}
          />
          <Text style={styles.unitText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {displayUnit(data[selectedDataNameIndex])}
          </Text>
        </View>
      );
    }
  };

  const renderMultiFieldRow = (store: DataInputTable_t, index: number) => {
    const value = multiValues[index] ?? "";
    const setValue = (v: string) => setMultiValues((prev) => ({ ...prev, [index]: v }));

    if (store instanceof AmnioticLiquidStore) {
      return (
        <View key={index} style={styles.multiFieldRow}>
          <Text style={styles.multiFieldLabel}>{store.name}</Text>
          {Platform.OS === "web" ? (
            <View style={styles.multiFieldPickerContainer}>
              <Picker
                style={styles.multiFieldPicker}
                mode="dropdown"
                selectedValue={value}
                onValueChange={setValue}
              >
                <Picker.Item label="—" value="" style={styles.pickerItem} />
                {generateAmnioticLiquidItems()}
              </Picker>
            </View>
          ) : (
            <CustomDropdown
              items={amnioticLiquidDropdownItems()}
              selectedValue={value}
              onValueChange={setValue}
              buttonStyle={styles.multiFieldDropdownButton}
              textStyle={styles.multiFieldDropdownButtonText}
            />
          )}
        </View>
      );
    }

    return (
      <View key={index} style={styles.multiFieldRow}>
        <Text style={styles.multiFieldLabel}>{store.name}</Text>
        <View style={styles.numberInputRow}>
          <TextInput
            style={styles.multiFieldNumberInput}
            keyboardType="numeric"
            onChangeText={setValue}
            value={value}
            placeholder="—"
            maxLength={7}
          />
          <Text style={styles.multiFieldUnitText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {displayUnit(store)}
          </Text>
        </View>
      </View>
    );
  };

  const hasAnyMultiValue = data.some((_, i) => (multiValues[i] ?? "").trim() !== "");

  return (
    <Modal
      visible={visible || justSaved}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>

          {justSaved ? (
            <View style={styles.savedState}>
              <Text style={styles.savedCheck}>✓</Text>
              <Text style={styles.savedText}>Ajouté</Text>
            </View>
          ) : pendingEntries !== null ? (
            <>
              <Text style={styles.sectionLabel}>Saisie récente</Text>
              <Text style={styles.confirmText}>
                Dernière saisie il y a {recentMinutesAgo} minute{recentMinutesAgo === 1 ? "" : "s"}. Ajouter quand même ?
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => setPendingEntries(null)}
                >
                  <Text style={[styles.buttonText, styles.buttonTextCancel]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonValidate]}
                  onPress={() => {
                    confirmSave(pendingEntries);
                    setPendingEntries(null);
                  }}
                >
                  <Text style={styles.buttonText}>Ajouter quand même</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {recordedAt && (
                <View style={styles.recordedAtRow}>
                  <Text style={styles.recordedAtLabel}>Enregistré le</Text>
                  <View style={styles.recordedAtBadge}>
                    <Text style={styles.recordedAtTime}>
                      {new Date(recordedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Text style={styles.recordedAtDate}>
                      {new Date(recordedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </Text>
                  </View>
                </View>
              )}

              {preSelectedDataChoice ? (
                <>
                  <Text style={styles.sectionLabel}>
                    Type de données à ajouter
                  </Text>
                  <View style={styles.preselectedBox}>
                    <Text style={styles.preselectedText}>
                      {preSelectedDataChoice.name}
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>
                    Valeur à ajouter
                  </Text>
                  {renderDataPicker()}
                </>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>
                    Valeurs à ajouter (au moins une)
                  </Text>
                  {data.map((store, i) => renderMultiFieldRow(store, i))}
                </>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={onCancel}
                >
                  <Text style={[styles.buttonText, styles.buttonTextCancel]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonValidate,
                    !preSelectedDataChoice && !hasAnyMultiValue && styles.buttonDisabled,
                  ]}
                  disabled={!preSelectedDataChoice && !hasAnyMultiValue}
                  onPress={() => {
                    if (!rootStore.partogrammeStore.selectedPartogramme) return;

                    if (preSelectedDataChoice) {
                      const dataStore = rootStore.partogrammeStore.selectedPartogramme.getDataStore(selectedDataName);
                      if (dataStore) {
                        confirmSave([{
                          dataStore,
                          value: selectedDataName === data[0].partogrammeStore.amnioticLiquidStore.name
                            ? (getEnumByString(liquidStates, selectedAmnioticLiquidState) || selectedAmnioticLiquidState)
                            : inputDataNumber,
                        }]);
                      }
                    } else {
                      const entries = data
                        .map((store, i) => ({ store, value: multiValues[i] ?? "" }))
                        .filter(({ value }) => value.trim() !== "")
                        .map(({ store, value }) => ({
                          dataStore: store,
                          value: store instanceof AmnioticLiquidStore
                            ? (getEnumByString(liquidStates, value) || value)
                            : value,
                        }));
                      if (entries.length === 0) return;

                      const lastEntryTime = data
                        .flatMap((store) => store.dataList as any[])
                        .map((item) => new Date(item.data.created_at).getTime())
                        .sort((a, b) => b - a)[0];
                      const minutesAgo = lastEntryTime ? (Date.now() - lastEntryTime) / 60000 : Infinity;

                      if (minutesAgo < 60) {
                        setRecentMinutesAgo(Math.round(minutesAgo));
                        setPendingEntries(entries);
                      } else {
                        confirmSave(entries);
                      }
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Valider</Text>
                </TouchableOpacity>
              </View>

              {onDelete && (
                <TouchableOpacity style={styles.deleteLink} onPress={onDelete}>
                  <Text style={styles.deleteLinkText}>Supprimer cette valeur</Text>
                </TouchableOpacity>
              )}
            </>
          )}

        </View>
      </View>
    </Modal>
  );
});

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
  savedState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  savedCheck: {
    fontSize: 40,
    color: colors.success,
    marginBottom: 8,
  },
  savedText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  confirmText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  recordedAtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  recordedAtLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  recordedAtBadge: {
    alignItems: "flex-end",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recordedAtTime: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  recordedAtDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: 4,
  },
  picker: {
    height: 50,
    width: "100%",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  pickerItem: {
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surface,
    height: 50,
    paddingHorizontal: 14,
    paddingVertical: 0,
    marginBottom: 4,
    shadowOpacity: 0,
    elevation: 0,
  },
  dropdownButtonText: {
    color: colors.text,
    fontWeight: "normal",
    fontSize: 16,
  },
  multiFieldRow: {
    marginBottom: 8,
  },
  multiFieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  multiFieldNumberInput: {
    flex: 1,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiFieldUnitText: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
  },
  multiFieldDropdownButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surface,
    height: 38,
    paddingHorizontal: 10,
    paddingVertical: 0,
    marginBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  multiFieldDropdownButtonText: {
    color: colors.text,
    fontWeight: "normal",
    fontSize: 13,
  },
  multiFieldPickerContainer: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: 0,
  },
  multiFieldPicker: {
    height: 38,
    width: "100%",
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 13,
  },
  preselectedBox: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  preselectedText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  numberInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  inputTextNumber: {
    flex: 1,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    padding: 10,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  unitText: {
    marginLeft: 10,
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
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
  buttonDisabled: {
    opacity: 0.5,
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
  deleteLink: {
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 4,
  },
  deleteLinkText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default DialogDataInputTable;
