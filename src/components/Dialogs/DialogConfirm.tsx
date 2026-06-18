import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Dispatch, SetStateAction } from "react";
import { observer } from "mobx-react";

interface IProps {
  isVisible: boolean;
  Title: string;
  InfoText?: string;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
  onValidate: () => void;
}

export const DialogConfirm = observer(
  ({ isVisible, setIsVisible, onValidate, Title, InfoText }: IProps) => {
    const { width } = useWindowDimensions();

    const handleCancel = () => setIsVisible(false);
    const handleValidate = () => {
      onValidate();
      setIsVisible(false);
    };

    return (
      <Modal
        visible={isVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.overlay}>
          <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>

            <Text style={styles.title}>{Title}</Text>

            {InfoText && (
              <Text style={styles.infoText}>{InfoText}</Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>Annuler</Text>
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
  }
);

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
    fontSize: 17,
    fontWeight: "bold",
    color: "#403572",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 20,
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
