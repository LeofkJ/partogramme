/**
 * Hospital-side twin of DialogMaternityAlerts, opened from Graph.tsx's
 * ALERTE button once a patient is at the viewer's own hospital — a real
 * add/remove capability where hospital staff previously only had a bulk
 * "clear all" action on the dashboard list. No cross-patient list here
 * (unlike the maternity version): she's already the chart he's on, so
 * there's nothing to jump to — HospitalDashboard's own list covers the
 * across-patients view.
 */
import { observer } from "mobx-react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { IconTrash, IconX } from "../Icons";
import { colors, radius, spacing } from "../../theme";
import { formatElapsed } from "../../lib/formatElapsed";
import { SkeletonPulse, SkeletonBlock } from "../Skeleton/Skeleton";

type HospitalAlertItem = { id: string; comment: string; createdAt: string };

interface Props {
  isVisible: boolean;
  state: "pending" | "done" | "error";
  alerts: HospitalAlertItem[];
  onClose: () => void;
  onRetry: () => void;
  onAdd: () => void;
  onDelete: (alertId: string) => void;
}

export const DialogHospitalAlerts = observer(
  ({ isVisible, state, alerts, onClose, onRetry, onAdd, onDelete }: Props) => {
    const { width, height } = useWindowDimensions();

    return (
      <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.card, { width: Math.min(width * 0.92, 400) }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Alertes</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <IconX size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {state === "pending" ? (
              <SkeletonPulse>
                {[0, 1].map((i) => (
                  <View key={i} style={[styles.row, i > 0 && { marginTop: spacing.sm }]}>
                    <View style={styles.rowMain}>
                      <SkeletonBlock width={100} height={14} style={{ marginBottom: 6 }} />
                      <SkeletonBlock width={140} height={12} />
                    </View>
                  </View>
                ))}
              </SkeletonPulse>
            ) : state === "error" ? (
              <View>
                <Text style={styles.error}>Impossible de charger les alertes. Vérifiez votre connexion.</Text>
                <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
                  <Text style={styles.retry}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : alerts.length === 0 ? (
              <Text style={styles.empty}>Aucune alerte active pour cette patiente.</Text>
            ) : (
              <ScrollView
                style={{ maxHeight: height * 0.4 }}
                contentContainerStyle={styles.list}
                bounces={false}
              >
                {alerts.map((a) => (
                  <View key={a.id} style={styles.row}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowType} numberOfLines={1}>
                        {`Alerte manuelle · depuis ${formatElapsed(a.createdAt)}`}
                      </Text>
                      <Text style={styles.rowComment} numberOfLines={2}>
                        {a.comment}
                      </Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => onDelete(a.id)}
                    >
                      <IconTrash size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.add} onPress={onAdd} activeOpacity={0.7}>
              <Text style={styles.addText}>+ Nouvelle alerte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  },
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
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    paddingTop: spacing.md,
  },
  retry: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowType: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  rowComment: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  add: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    alignItems: "center",
  },
  addText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
});
