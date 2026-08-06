/**
 * Read-only drill-down popup for the Dashboard's stat counts — clicking a
 * number (e.g. "Admis: 6") opens this with the actual rows behind it,
 * instead of leaving the count as a dead end.
 */
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { colors, radius, spacing } from "../../theme";

export interface SimpleListRow {
  key: string;
  primary: string;
  /** e.g. hospital name — its own line, always neutral/muted. */
  secondary?: string;
  /** e.g. connection status — a separate line so it doesn't get crammed
   * onto the same truncated line as secondary. "success" tone gives an
   * at-a-glance active/recent signal vs the default muted tone. */
  status?: { text: string; tone?: "muted" | "success" };
  /** When set, the row is tappable (e.g. open that patient's full record)
   * instead of being purely informational. */
  onPress?: () => void;
}

interface Props {
  isVisible: boolean;
  title: string;
  rows: SimpleListRow[];
  emptyText: string;
  onClose: () => void;
}

export const DialogSimpleList = ({ isVisible, title, rows, emptyText, onClose }: Props) => {
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.9, 420), maxHeight: height * 0.7 }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{rows.length}</Text>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {rows.length === 0 ? (
              <Text style={styles.emptyText}>{emptyText}</Text>
            ) : (
              rows.map((row) => {
                const RowContainer = row.onPress ? TouchableOpacity : View;
                return (
                  <RowContainer
                    key={row.key}
                    style={styles.rowBox}
                    {...(row.onPress ? { onPress: row.onPress, activeOpacity: 0.6 } : {})}
                  >
                    <Text style={styles.rowPrimary} numberOfLines={1}>{row.primary}</Text>
                    {!!row.secondary && (
                      <Text style={styles.rowSecondary} numberOfLines={1}>{row.secondary}</Text>
                    )}
                    {!!row.status && (
                      <Text
                        style={[styles.rowSecondary, row.status.tone === "success" && styles.rowSecondarySuccess]}
                        numberOfLines={1}
                      >
                        {row.status.text}
                      </Text>
                    )}
                  </RowContainer>
                );
              })
            )}
          </ScrollView>

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
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  bodyContent: {
    paddingVertical: spacing.xs,
  },
  // Bordered box per row — same recipe as the Dashboard's own stat cards
  // (border/radius/background), so a row of results reads as a set of
  // distinct items instead of plain floating text.
  rowBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  rowSecondary: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowSecondarySuccess: {
    color: colors.success,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: "center",
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
