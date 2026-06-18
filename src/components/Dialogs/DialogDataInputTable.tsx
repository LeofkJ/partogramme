import React, { useEffect, useState } from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { AmnioticLiquidStore } from "../../store/TableData/AmnioticLiquid/amnioticLiquidStore";
import { MotherSystolicBloodPressureStore } from "../../store/TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore";
import { MotherContractionsFrequencyStore } from "../../store/TableData/MotherContractionsFrequency/motherContractionsFrequencyStore";
import { MotherHeartFrequencyStore } from "../../store/TableData/MotherHeartFrequency/motherHeartFrequencyStore";
import { MotherTemperatureStore } from "../../store/TableData/MotherTemperature/motherTemperatureStore";
import { getEnumByString, getValueByRank, liquidStates } from "../../../types/constants";
import { rootStore } from "../../store/rootStore";
import { observer } from "mobx-react";
import { MotherDiastolicBloodPressureStore } from "../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { MotherContractionDurationStore } from "../../store/TableData/MotherContractionDuration/MotherContractionDurationStore";

export type DataInputTable_t =
  | AmnioticLiquidStore
  | MotherSystolicBloodPressureStore
  | MotherDiastolicBloodPressureStore
  | MotherContractionsFrequencyStore
  | MotherContractionDurationStore
  | MotherHeartFrequencyStore
  | MotherTemperatureStore;

export interface Props {
  visible: boolean;
  data: DataInputTable_t[];
  onClose: (dataStore: DataInputTable_t, data: string) => void;
  onCancel: () => void;
  preSelectedDataChoice?: DataInputTable_t;
}

const DialogDataInputTable: React.FC<Props> = observer(({
  visible,
  data,
  onClose,
  onCancel,
  preSelectedDataChoice,
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

  const generateDataNamesItem = () => {
    return data.map((item, i) => (
      <Picker.Item
        key={i}
        label={item.name}
        value={item.name}
        style={styles.pickerItem}
      />
    ));
  };

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

  const renderDataPicker = () => {
    if (selectedDataName === data[0].partogrammeStore.amnioticLiquidStore.name) {
      return (
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
          <Text style={styles.unitText}>
            {data[selectedDataNameIndex].unit}
          </Text>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>

          <Text style={styles.sectionLabel}>
            Type de données à ajouter
          </Text>
          {preSelectedDataChoice ? (
            <View style={styles.preselectedBox}>
              <Text style={styles.preselectedText}>
                {preSelectedDataChoice.name}
              </Text>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                style={styles.picker}
                mode="dropdown"
                selectedValue={selectedDataName}
                onValueChange={(itemValue, itemIndex) => {
                  setSelectedDataName(itemValue);
                  setSelectedDataNameIndex(itemIndex);
                }}
              >
                {generateDataNamesItem()}
              </Picker>
            </View>
          )}

          <Text style={styles.sectionLabel}>
            Valeur à ajouter
          </Text>
          {renderDataPicker()}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonValidate]}
              onPress={() => {
                onClose(
                  rootStore.partogrammeStore.selectedPartogramme
                    ? rootStore.partogrammeStore.selectedPartogramme.getDataStore(selectedDataName)
                    : undefined,
                  selectedDataName === data[0].partogrammeStore.amnioticLiquidStore.name
                    ? getEnumByString(liquidStates, selectedAmnioticLiquidState)
                    : inputDataNumber
                );
              }}
            >
              <Text style={styles.buttonText}>Valider</Text>
            </TouchableOpacity>
          </View>

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
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#403572",
    marginBottom: 8,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#9F90D4",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f5f3fc",
    marginBottom: 4,
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#403572",
  },
  pickerItem: {
    color: "#403572",
    backgroundColor: "#ffffff",
  },
  preselectedBox: {
    borderWidth: 1,
    borderColor: "#9F90D4",
    borderRadius: 10,
    backgroundColor: "#f5f3fc",
    padding: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  preselectedText: {
    color: "#403572",
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
    borderColor: "#9F90D4",
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    padding: 10,
    fontSize: 18,
    color: "#403572",
    backgroundColor: "#f5f3fc",
  },
  unitText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#403572",
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

export default DialogDataInputTable;
