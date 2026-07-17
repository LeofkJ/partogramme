import React, { useState } from "react";
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
  const [manualValue, setManualValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

          <Text style={styles.orLabel}>ou saisissez une valeur précise</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="Saisir une valeur"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={manualValue}
            onChangeText={(text) => {
              setManualValue(text);
              setErrorMessage(null);
            }}
          />

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={() => {
                setManualValue("");
                setErrorMessage(null);
                onCancel();
              }}
            >
              <Text style={[styles.buttonText, styles.buttonTextCancel]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonValidate]}
              onPress={() => {
                const trimmedManual = manualValue.trim();
                if (trimmedManual !== "") {
                  if (Number.isNaN(Number(trimmedManual))) {
                    setErrorMessage("Veuillez saisir un nombre valide.");
                    return;
                  }
                  setManualValue("");
                  onClose(trimmedManual);
                } else {
                  onClose(selectedValue);
                }
              }}
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
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
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
  },
  pickerItem: {
    color: colors.text,
    backgroundColor: colors.surface,
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
  },
  orLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlign: "center",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
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
});

export default DialogDataInputGraph;
