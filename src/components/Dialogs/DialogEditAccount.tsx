/**
 * Admin-only edit form for an existing nurse/doctor account — name, phone,
 * and hospital. Deliberately does not include email or role; see
 * supabase/functions/update-account for why.
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
import { SegmentedControl } from "../SegmentedControl";
import { colors, radius, spacing } from "../../theme";

type RoleChoice = "NURSE" | "DOCTOR" | "ADMIN";

export interface EditableAccount {
  userInfoId: string;
  role: RoleChoice;
  firstName: string;
  lastName: string;
  phone: string;
  hospitalId: string;
  /** True when this is the signed-in admin's own row — the role selector
   * is hidden then, since self-demotion is rejected by the backend anyway
   * (see update-account) and could otherwise lock them out silently. */
  isSelf?: boolean;
}

interface DropdownItem {
  label: string;
  value: string;
}

interface Props {
  isVisible: boolean;
  account: EditableAccount | null;
  hospitalItems: DropdownItem[];
  onClose: () => void;
  onSave: (input: {
    userInfoId: string;
    firstName: string;
    lastName: string;
    phone: string;
    hospitalId: string | null;
    role?: RoleChoice;
  }) => Promise<void>;
}

export const DialogEditAccount = ({
  isVisible,
  account,
  hospitalItems,
  onClose,
  onSave,
}: Props) => {
  const { width } = useWindowDimensions();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [role, setRole] = useState<RoleChoice>("NURSE");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Re-seed the form whenever a (possibly different) account is opened.
  useEffect(() => {
    if (!account) return;
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setPhone(account.phone);
    setHospitalId(account.hospitalId);
    setRole(account.role);
    setErrorMessage(null);
  }, [account]);

  if (!account) return null;

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("Le nom et le prénom sont obligatoires");
      return;
    }
    if (role !== "ADMIN" && !hospitalId) {
      setErrorMessage("Veuillez sélectionner un hôpital");
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    onSave({
      userInfoId: account.userInfoId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      hospitalId: hospitalId || null,
      role: account.isSelf ? undefined : role,
    })
      .then(() => setIsSaving(false))
      .catch((error: any) => {
        setIsSaving(false);
        setErrorMessage(error?.message || "Erreur inconnue");
      });
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 380) }]}>
          <Text style={styles.title}>Modifier le compte</Text>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          {!account.isSelf && (
            <>
              <Text style={styles.label}>Rôle</Text>
              <SegmentedControl
                options={[
                  { key: "NURSE", label: "Infirmière" },
                  { key: "DOCTOR", label: "Médecin" },
                  { key: "ADMIN", label: "Admin" },
                ]}
                value={role}
                onChange={setRole}
                style={styles.roleControl}
              />
            </>
          )}

          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>
            Hôpital{role === "ADMIN" ? " (optionnel)" : ""}
          </Text>
          <CustomDropdown
            items={hospitalItems}
            selectedValue={hospitalId}
            onValueChange={setHospitalId}
            placeholder="Sélectionnez un hôpital"
            buttonStyle={styles.dropdownButton}
            textStyle={styles.dropdownText}
            searchable
            clearable
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
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
  roleControl: {
    marginBottom: 4,
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
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 12,
    padding: 7,
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
  saveButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
});
