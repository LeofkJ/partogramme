/**
 * Read-only detail popup for the Admin accounts list — shows the fields the
 * row itself doesn't have room for (email, phone, address, ref doctor).
 */
import { Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { colors, radius, spacing } from "../../theme";

export interface AccountDetails {
  name: string;
  role: "NURSE" | "DOCTOR";
  email: string | null;
  phone: string | null;
  address: string | null;
  hospitalName: string;
  refDoctorName: string | null;
}

interface Props {
  isVisible: boolean;
  account: AccountDetails | null;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
  </View>
);

export const DialogAccountDetails = ({ isVisible, account, onClose }: Props) => {
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
                {account.role === "DOCTOR" ? "Médecin" : "Infirmière"}
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            <Row label="Email" value={account.email ?? "—"} />
            <Row label="Téléphone" value={account.phone || "—"} />
            <Row label="Adresse" value={account.address || "—"} />
            <Row label="Hôpital" value={account.hospitalName} />
            {account.role === "NURSE" && (
              <Row label="Médecin de référence" value={account.refDoctorName ?? "—"} />
            )}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
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
  closeButton: {
    margin: spacing.md,
    marginTop: spacing.sm,
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
});
