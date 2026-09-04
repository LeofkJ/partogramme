/**
 * Midwife manually raising an alert on her own patient, independent of
 * BPM/dilation thresholds (task.md: "Midwife should also be able to
 * raise/flag an alert manually... Nicole really wants it"). Mirrors
 * DialogTransferPatient's shape — a reason is required so hospital staff
 * seeing this on the dashboard know what they're walking into.
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { colors, radius, spacing } from "../../theme";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
}

export const DialogRaiseAlert = ({ isVisible, onClose, onSubmit }: Props) => {
  const { width } = useWindowDimensions();
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    setComment("");
    setErrorMessage(null);
  }, [isVisible]);

  const handleSubmit = () => {
    if (!comment.trim()) {
      setErrorMessage("Veuillez indiquer le motif de l'alerte");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    onSubmit(comment.trim())
      .then(() => setIsSubmitting(false))
      .catch((error: any) => {
        setIsSubmitting(false);
        // 42501 = RLS rejected the insert — always means "you're not
        // currently responsible for her" (a maternity nurse after she's
        // been transferred, or hospital staff before she has). Same
        // message covers both directions since the cause is the same.
        if (error?.code === "42501") {
          setErrorMessage("Vous n'êtes pas responsable de cette patiente en ce moment, vous ne pouvez pas gérer ses alertes.");
        } else {
          setErrorMessage(error?.message || "Erreur inconnue");
        }
      });
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Déclencher une alerte</Text>
            <Text style={styles.subtitle}>
              Signale cette patiente à l'hôpital, indépendamment des seuils automatiques.
            </Text>
          </View>

          <View style={styles.body}>
            <TextInput
              style={[styles.input, !!errorMessage && styles.inputError]}
              value={comment}
              onChangeText={(t) => {
                setComment(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Ex : saignement inhabituel, détresse maternelle…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              autoFocus
              textAlignVertical="top"
            />
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Text style={styles.submitButtonText}>Déclencher</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  body: {
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 14,
    padding: spacing.sm + 2,
    minHeight: 84,
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onAccent,
  },
});
