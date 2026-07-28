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
import { colors } from "../../theme";

interface IProps {
  isVisible: boolean;
  Title: string;
  InfoText?: string;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
  onValidate: () => void;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button instead of the default accent — for actions that
   * remove access/data rather than just confirming a routine choice. */
  destructive?: boolean;
}

export const DialogConfirm = observer(
  ({
    isVisible,
    setIsVisible,
    onValidate,
    Title,
    InfoText,
    confirmText = "Valider",
    cancelText = "Annuler",
    destructive = false,
  }: IProps) => {
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
          <View style={[styles.card, { width: Math.min(width * 0.9, 320) }]}>

            <Text style={styles.title}>{Title}</Text>

            {InfoText && (
              <Text style={styles.infoText}>{InfoText}</Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, styles.buttonTextCancel]}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, destructive ? styles.buttonDestructive : styles.buttonValidate]}
                onPress={handleValidate}
              >
                <Text style={styles.buttonText}>{confirmText}</Text>
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  buttonValidate: {
    backgroundColor: colors.accent,
  },
  buttonDestructive: {
    backgroundColor: colors.danger,
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
    fontWeight: "600",
    fontSize: 13,
  },
});
