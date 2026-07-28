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
} from "react-native";

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
}) => {
  const { width } = useWindowDimensions();
  const [value, setValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCancel = () => {
    setValue("");
    setErrorMessage(null);
    onCancel();
  };

  const handleValidate = () => {
    const trimmed = value.trim();
    if (trimmed === "" || Number.isNaN(Number(trimmed))) {
      setErrorMessage("Veuillez saisir un nombre valide.");
      return;
    }
    setValue("");
    setErrorMessage(null);
    onClose(trimmed);
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
          <Text style={styles.hintText}>
            Entre {startValue} et {endValue}
          </Text>

          <TextInput
            style={styles.manualInput}
            placeholder="Saisir une valeur"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={value}
            autoFocus
            onChangeText={(text) => {
              setValue(text);
              setErrorMessage(null);
            }}
          />

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

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
    marginBottom: 4,
    marginTop: 12,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
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
