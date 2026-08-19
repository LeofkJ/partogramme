/**
 * Midwife moving an already-transferred patient to a different hospital —
 * wrong claim, or a straight Hospital A → Hospital B change (see
 * MATERNITY_HOSPITAL_WORKFLOW_PLAN.md). No urgency picker here unlike
 * DialogTransferPatient — this is correcting where she already went, not a
 * fresh triage decision.
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
import { CustomDropdown } from "./CustomDropdown";
import { colors, radius, spacing } from "../../theme";

interface DropdownItem {
  label: string;
  value: string;
}

interface Props {
  isVisible: boolean;
  hospitalItems: DropdownItem[];
  currentHospitalName: string;
  onClose: () => void;
  onSubmit: (input: { hospitalId: string; reason: string }) => Promise<void>;
}

export const DialogReassignPatient = ({ isVisible, hospitalItems, currentHospitalName, onClose, onSubmit }: Props) => {
  const { width } = useWindowDimensions();
  const [hospitalId, setHospitalId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    setHospitalId("");
    setReason("");
    setErrorMessage(null);
  }, [isVisible]);

  const handleSubmit = () => {
    if (!hospitalId) {
      setErrorMessage("Veuillez sélectionner un hôpital");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Veuillez indiquer un motif");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    onSubmit({ hospitalId, reason: reason.trim() })
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
          <Text style={styles.title}>Réassigner à un autre hôpital</Text>
          <Text style={styles.subtitle}>Actuellement : {currentHospitalName}</Text>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <Text style={styles.label}>Nouvel hôpital</Text>
          <CustomDropdown
            items={hospitalItems}
            selectedValue={hospitalId}
            onValueChange={setHospitalId}
            placeholder="Sélectionnez un hôpital"
            buttonStyle={styles.dropdownButton}
            textStyle={styles.dropdownText}
            searchable
            searchPlaceholder="Rechercher un hôpital…"
            clearable
          />

          <Text style={styles.label}>Motif</Text>
          <TextInput
            style={[styles.input, styles.reasonInput]}
            value={reason}
            onChangeText={setReason}
            placeholder="Ex : mauvais hôpital, plus proche du domicile…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
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
                <Text style={styles.submitButtonText}>Réassigner</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
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
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 12,
    padding: 7,
  },
  reasonInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: "400",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
});
