import React from "react";
import { colors } from "../../theme";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { IconExclamation } from "../Icons";

export interface AppProps {
  isVisible: boolean;
  errorCode: string;
  errorMsg: string;
  toggleDialog: () => void;
}

export interface AppState {}

export default class AppComponent extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {};
  }

  public render() {
    return (
      <ErrorDialogInner
        isVisible={this.props.isVisible}
        errorCode={this.props.errorCode}
        errorMsg={this.props.errorMsg}
        toggleDialog={this.props.toggleDialog}
      />
    );
  }
}

const ErrorDialogInner: React.FC<AppProps> = ({
  isVisible,
  errorCode,
  errorMsg,
  toggleDialog,
}) => {
  const { width } = useWindowDimensions();

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={toggleDialog}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>

          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <IconExclamation size={22} color="white" />
            </View>
            <Text style={styles.title}>
              {errorCode ? `Erreur : ${errorCode}` : "Erreur"}
            </Text>
          </View>

          <Text style={styles.errorMsg}>{errorMsg}</Text>

          <TouchableOpacity style={styles.button} onPress={toggleDialog}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>

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
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.danger,
    flex: 1,
  },
  errorMsg: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
});
