/**
 * Popup listing every currently-active alert at the midwife's own
 * maternity (MaternityAlertsStore) — opened from Graph.tsx's ALERTE
 * button. One row per alert, not per patient — a patient can have
 * several manual alerts at once. Lets her jump to whichever patient a
 * row belongs to, delete a manual one, or add another for whichever
 * patient's chart she's currently on.
 */
import { observer } from "mobx-react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { rootStore } from "../../store/rootStore";
import { IconTrash, IconX } from "../Icons";
import { colors, radius, spacing } from "../../theme";
import { formatElapsed } from "../../lib/formatElapsed";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onAdd: () => void;
  onSelectPatient: (id: string) => void;
}

function alertTypeLabel(reason: "dilation" | "bpm" | "manual", value: number): string {
  if (reason === "manual") return "Alerte manuelle";
  if (reason === "bpm") return `${value} bpm · ${value < 110 ? "bradycardie" : "tachycardie"}`;
  return `${value} cm · dilatation bande rouge`;
}

export const DialogMaternityAlerts = observer(
  ({ isVisible, onClose, onAdd, onSelectPatient }: Props) => {
    const { width, height } = useWindowDimensions();
    const store = rootStore.maternityAlertsStore;
    const count = store.alerts.length;

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

            {store.state === "pending" ? (
              <ActivityIndicator
                size="small"
                color={colors.textMuted}
                style={{ marginVertical: spacing.xl }}
              />
            ) : count === 0 ? (
              <Text style={styles.empty}>Aucune alerte active à la maternité.</Text>
            ) : (
              <ScrollView
                style={{ maxHeight: height * 0.4 }}
                contentContainerStyle={styles.list}
                bounces={false}
              >
                {store.alerts.map((a) => {
                  const isManual = a.reason === "manual";
                  return (
                    <TouchableOpacity
                      key={a.key}
                      style={styles.row}
                      activeOpacity={0.7}
                      onPress={() => onSelectPatient(a.partogrammeId)}
                    >
                      <View style={styles.rowMain}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          Dossier #{a.noFile}
                        </Text>
                        <Text style={styles.rowType} numberOfLines={1}>
                          {alertTypeLabel(a.reason, a.value)}
                          {isManual && a.raisedAt ? ` · depuis ${formatElapsed(a.raisedAt)}` : ""}
                        </Text>
                        {isManual && a.comment ? (
                          <Text style={styles.rowComment} numberOfLines={2}>
                            {a.comment}
                          </Text>
                        ) : null}
                      </View>
                      {a.alertId ? (
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            store.deleteAlert(a.alertId as string);
                          }}
                        >
                          <IconTrash size={16} color={colors.danger} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
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
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  rowType: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
    marginTop: 4,
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
