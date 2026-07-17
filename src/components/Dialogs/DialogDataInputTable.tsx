import React, { useEffect, useState } from "react";
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

export interface Props {
  visible: boolean;
  data: DataInputTable_t[];
  onClose: (dataStore: DataInputTable_t, data: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  preSelectedDataChoice?: DataInputTable_t;
}

const DialogDataInputTable: React.FC<Props> = observer(({
  visible,
  data,
  onClose,
  onCancel,
  onDelete,
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

  const dataNamesDropdownItems = () => {
    return data.map((item) => ({ label: item.name, value: item.name }));
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
          ) : Platform.OS === "web" ? (
            <View style={styles.pickerContainer} pointerEvents="auto">
              <Picker
                style={styles.picker}
                mode="dropdown"
                selectedValue={selectedDataName}
                onValueChange={(itemValue, itemIndex) => {
                  setSelectedDataName(itemValue);
                  setSelectedDataNameIndex(itemIndex);
                }}
                enabled={true}
                itemStyle={styles.pickerItem}
                prompt="Sélectionner un type de données"
              >
                {generateDataNamesItem()}
              </Picker>
            </View>
          ) : (
            <CustomDropdown
              items={dataNamesDropdownItems()}
              selectedValue={selectedDataName}
              onValueChange={(itemValue) => {
                setSelectedDataName(itemValue);
                setSelectedDataNameIndex(data.findIndex((item) => item.name === itemValue));
              }}
              buttonStyle={styles.dropdownButton}
              textStyle={styles.dropdownButtonText}
            />
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
                if (rootStore.partogrammeStore.selectedPartogramme) {
                  const dataStore = rootStore.partogrammeStore.selectedPartogramme.getDataStore(selectedDataName);
                  if (dataStore) {
                    onClose(
                      dataStore,
                      selectedDataName === data[0].partogrammeStore.amnioticLiquidStore.name
                        ? (getEnumByString(liquidStates, selectedAmnioticLiquidState) || selectedAmnioticLiquidState)
                        : inputDataNumber
                    );
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
    backgroundColor: "#f5f3fc",
  },
  pickerItem: {
    color: "#403572",
    backgroundColor: "#f5f3fc",
    fontSize: 16,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: "#9F90D4",
    borderRadius: 10,
    backgroundColor: "#f5f3fc",
    height: 50,
    paddingHorizontal: 14,
    paddingVertical: 0,
    marginBottom: 4,
    shadowOpacity: 0,
    elevation: 0,
  },
  dropdownButtonText: {
    color: "#403572",
    fontWeight: "normal",
    fontSize: 16,
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
  deleteLink: {
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 4,
  },
  deleteLinkText: {
    color: "#DE2C1D",
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default DialogDataInputTable;
