import React, { useState } from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { CustomDropdown } from "./CustomDropdown";

interface Props {
  visible: boolean;
  dataName: string;
  startValue: number;
  endValue: number;
  step: number;
  onClose: (data: string) => void;
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

  const dropdownItems = () => {
    const items = [];
    for (let i = startValue; i <= endValue; i += step) {
      items.push({ label: i.toString(), value: i.toString() });
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

          {Platform.OS === "web" ? (
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
          ) : (
            <CustomDropdown
              items={dropdownItems()}
              selectedValue={selectedValue}
              onValueChange={setSelectedValue}
              buttonStyle={styles.dropdownButton}
              textStyle={styles.dropdownButtonText}
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonValidate]}
              onPress={() => onClose(selectedValue)}
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
