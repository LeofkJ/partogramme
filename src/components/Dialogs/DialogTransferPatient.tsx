/**
 * Maternity nurse -> hospital referral (see MATERNITY_TRANSFER_PLAN.md).
 * Hospital choices are pre-filtered to the nurse's own region by the
 * caller (Graph.tsx) — this dialog just renders whatever list it's given.
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
import { Database } from "../../../types/supabase";
import { colors, radius, spacing } from "../../theme";

type UrgencyLevel = Database["public"]["Enums"]["UrgencyLevel"];

// Escalating severity, not decoration — reuses the same clinical
// bg/fg tokens as statusColors (theme.ts) rather than inventing new hues.
// All four are a plain colored outline at rest — so nothing looks
// pre-selected — and fill in once picked; EMERGENCY fills solid instead of
// soft so choosing it specifically still reads as the most severe pick.
const URGENCY_STYLES: Record<UrgencyLevel, { label: string; softBg: string; strongBg: string; fg: string }> = {
  LOW: { label: "Faible", softBg: colors.successSoft, strongBg: colors.success, fg: colors.success },
  MEDIUM: { label: "Moyenne", softBg: colors.warningSoft, strongBg: colors.warning, fg: colors.warning },
  HIGH: { label: "Élevée", softBg: colors.dangerSoft, strongBg: colors.danger, fg: colors.danger },
  EMERGENCY: { label: "Urgence", softBg: colors.dangerSoft, strongBg: colors.danger, fg: colors.danger },
};
const URGENCY_ORDER: UrgencyLevel[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

interface DropdownItem {
  label: string;
  value: string;
}

interface Props {
  isVisible: boolean;
  hospitalItems: DropdownItem[];
  onClose: () => void;
  onSubmit: (input: { hospitalId: string; reason: string; urgencyLevel: UrgencyLevel }) => Promise<void>;
}

export const DialogTransferPatient = ({ isVisible, hospitalItems, onClose, onSubmit }: Props) => {
  const { width } = useWindowDimensions();
  const [hospitalId, setHospitalId] = useState("");
  const [reason, setReason] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    setHospitalId("");
    setReason("");
    setUrgencyLevel("MEDIUM");
    setErrorMessage(null);
  }, [isVisible]);

  const handleSubmit = () => {
    if (!hospitalId) {
      setErrorMessage("Veuillez sélectionner un hôpital");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Veuillez indiquer un motif de transfert");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    onSubmit({ hospitalId, reason: reason.trim(), urgencyLevel })
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
          <Text style={styles.title}>Transférer vers un hôpital</Text>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <Text style={styles.label}>Hôpital</Text>
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
          {hospitalItems.length === 0 && (
            <Text style={styles.hint}>
              Aucun hôpital n'est rattaché à votre région pour le moment.
            </Text>
          )}

          <Text style={styles.label}>Urgence</Text>
          <View style={styles.urgencyRow}>
            {URGENCY_ORDER.map((level) => {
              const { label, softBg, strongBg, fg } = URGENCY_STYLES[level];
              const selected = urgencyLevel === level;
              const isEmergency = level === "EMERGENCY";
              const backgroundColor = !selected ? colors.surface : isEmergency ? strongBg : softBg;
              const textColor = selected && isEmergency ? colors.onAccent : fg;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyChip,
                    { backgroundColor, borderColor: fg },
                    selected && styles.urgencyChipSelected,
                  ]}
                  onPress={() => setUrgencyLevel(level)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.urgencyChipText, { color: textColor }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Motif du transfert</Text>
          <TextInput
            style={[styles.input, styles.reasonInput]}
            value={reason}
            onChangeText={setReason}
            placeholder="Ex : dystocie, besoin d'un plateau technique…"
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
                <Text style={styles.submitButtonText}>Transférer</Text>
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
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
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
  urgencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  urgencyChip: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  urgencyChipSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  urgencyChipText: {
    fontSize: 12,
    fontWeight: "700",
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
