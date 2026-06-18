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

export interface Props {
  visible: boolean;
  onClose: (data: string) => void;
  onCancel: () => void;
  data_name: string;
  data?: string;
}

export const DialogEditText: React.FC<Props> = ({
  visible,
  onClose,
  onCancel,
  data_name,
  data = "",
}) => {
  const { width } = useWindowDimensions();
  const [dataText, setDataText] = useState(data);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>

          <Text style={styles.title}>{data_name}</Text>

          <TextInput
            style={styles.textInput}
            onChangeText={(text) => setDataText(text)}
            value={dataText}
            multiline={true}
            placeholder="Écrivez votre commentaire ici..."
            placeholderTextColor="#9F90D4"
            textAlignVertical="top"
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
              onPress={() => onClose(dataText)}
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
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#403572",
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#9F90D4",
    borderRadius: 10,
    backgroundColor: "#f5f3fc",
    color: "#403572",
    fontSize: 15,
    padding: 12,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
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
