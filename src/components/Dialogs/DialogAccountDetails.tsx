/**
 * Read-only detail popup for the Admin accounts list — shows the fields the
 * row itself doesn't have room for (email, phone, address).
 */
import { Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { colors, radius, spacing } from "../../theme";

export interface AccountDetails {
  name: string;
  role: "NURSE" | "DOCTOR" | "ADMIN";
  email: string | null;
  phone: string | null;
  address: string | null;
  hospitalName: string;
}

const roleLabel = (role: AccountDetails["role"]) =>
  role === "DOCTOR" ? "Médecin" : role === "ADMIN" ? "Administrateur" : "Infirmière";

interface Props {
  isVisible: boolean;
  account: AccountDetails | null;
  onClose: () => void;
  onEdit: () => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
  </View>
);

export const DialogAccountDetails = ({ isVisible, account, onClose, onEdit }: Props) => {
  const { width } = useWindowDimensions();
  if (!account) return null;

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.9, 340) }]}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {roleLabel(account.role)}
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            <Row label="Email" value={account.email ?? "—"} />
            <Row label="Téléphone" value={account.phone || "—"} />
            <Row label="Adresse" value={account.address || "—"} />
            <Row label="Hôpital" value={account.hospitalName} />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Text style={styles.editButtonText}>Modifier</Text>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    margin: spacing.md,
    marginTop: spacing.sm,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
});
