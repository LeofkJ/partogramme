/**
 * Blocking modal shown on first login for accounts an admin activated
 * directly with a temp password (see Admin.tsx / create-account edge
 * function). No cancel/dismiss — mustChangePassword stays true until the
 * user sets their own password here.
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { observer } from "mobx-react";
import { UserInfoStore } from "../../store/user/userInfoStore";
import { PasswordInput } from "../PasswordInput";
import { logger } from "../../lib/logger";
import { colors } from "../../theme";

interface IProps {
  isVisible: boolean;
  userInfo: UserInfoStore;
  onDone: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

export const DialogSetPassword = observer(({ isVisible, userInfo, onDone }: IProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const handleValidate = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas");
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    userInfo
      .completePasswordChange(password)
      .then(() => {
        setIsSaving(false);
        onDone();
      })
      .catch((error: any) => {
        setIsSaving(false);
        const msg = error?.message || "Erreur inconnue";
        logger.warn("DialogSetPassword: completePasswordChange failed", { error: msg });
        setErrorMessage(msg);
      });
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>
          <Text style={styles.title}>Choisissez votre mot de passe</Text>
          <Text style={styles.subtitle}>
            Votre compte a été activé par un administrateur. Choisissez votre propre mot de
            passe avant de continuer.
          </Text>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <PasswordInput
            inputStyle={styles.input}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Confirmez le mot de passe</Text>
          <PasswordInput
            inputStyle={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleValidate}
          />

          <TouchableOpacity
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleValidate}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Valider</Text>
            )}
          </TouchableOpacity>
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
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    padding: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
});
