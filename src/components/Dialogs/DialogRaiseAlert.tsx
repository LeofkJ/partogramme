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
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { colors, radius, spacing } from "../../theme";
import { IconAlertTriangle } from "../Icons";

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
        setErrorMessage(error?.message || "Erreur inconnue");
      });
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>
          {/* Danger header strip */}
          <View style={styles.dangerHeader}>
            <View style={styles.iconWrap}>
              <IconAlertTriangle size={22} color={colors.danger} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Déclencher une alerte</Text>
              <Text style={styles.subtitle}>
                Signale cette patiente à l'hôpital, indépendamment des seuils automatiques.
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>Motif de l'alerte</Text>
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
                <>
                  <IconAlertTriangle size={15} color={colors.onAccent} />
                  <Text style={styles.submitButtonText}>Déclencher</Text>
                </>
              )}
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderBottomWidth: 1,
    borderBottomColor: "#F5C6C6",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  iconWrap: {
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.danger,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: "#9B1C1C",
    marginTop: 3,
    lineHeight: 17,
    opacity: 0.8,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 14,
    padding: spacing.sm + 2,
    minHeight: 90,
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: "#FFF8F8",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 11,
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
    fontWeight: "700",
    color: colors.onAccent,
  },
});
