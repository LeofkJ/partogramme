import React, { useState } from "react";
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
import { CheckBox } from "@rneui/themed";

interface Props {
  visible: boolean;
  dataName: string;
  startValue: number;
  endValue: number;
  step: number;
  onClose: (data: string, delta: string) => void;
  onCancel: () => void;
}

const DialogDataInputGraph: React.FC<Props> = ({
  visible,
  dataName,
  onClose,
  onCancel,
  startValue,
  endValue,
  step,
}) => {
  const { width } = useWindowDimensions();
  const [selectedValue, setSelectedValue] = useState(startValue.toString());
  const [delta, onChangeDelta] = useState("");
  const [isManualInputOn, setManuelInputOn] = useState(false);
  const toggleCheckboxManualInput = () => setManuelInputOn(!isManualInputOn);

  const generatePickerItems = () => {
    const items = [];
    for (let i = startValue; i <= endValue; i += step) {
      items.push(
        <Picker.Item
          key={i}
          label={i.toString()}
          value={i.toString()}
          style={styles.pickerItem}
        />
      );
    }
    return items;
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
            {dataName}
          </Text>

          <View style={styles.pickerContainer}>
            <Picker
              style={styles.picker}
              mode="dropdown"
              prompt="Sélectionnez un chiffre"
              selectedValue={selectedValue}
              onValueChange={(itemValue) => setSelectedValue(itemValue)}
            >
              {generatePickerItems()}
            </Picker>
          </View>

          {isManualInputOn && (
            <>
              <Text style={styles.sectionLabel}>
                Delta (facultatif / test)
              </Text>
              <TextInput
                style={styles.inputTextNumber}
                placeholder="Entrez un delta"
                placeholderTextColor={"#9F90D4"}
                onChangeText={(text) => onChangeDelta(text)}
                keyboardType="numeric"
                value={delta}
              />
            </>
          )}

          <CheckBox
            checked={isManualInputOn}
            onPress={toggleCheckboxManualInput}
            iconType="material-community"
            checkedIcon="checkbox-marked"
            uncheckedIcon="checkbox-blank-outline"
            checkedColor="#403572"
            checkedTitle="Saisie manuelle activée"
            title="Saisie manuelle désactivée"
            containerStyle={styles.checkboxContainer}
            textStyle={styles.checkboxText}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonValidate]}
              onPress={() => onClose(selectedValue, delta)}
            >
              <Text style={styles.buttonText}>Valider</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

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
  inputTextNumber: {
    borderColor: "#9F90D4",
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    padding: 10,
    fontSize: 18,
    color: "#403572",
    backgroundColor: "#f5f3fc",
    marginBottom: 4,
  },
  checkboxContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    marginLeft: 0,
    paddingLeft: 0,
    marginTop: 8,
  },
  checkboxText: {
    color: "#403572",
    fontWeight: "normal",
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

export default DialogDataInputGraph;
