/**
 * "Your transfer request was accepted/rejected" popup — mounted once at
 * the app root (App.js, alongside AlertBanner) so it can surface the
 * moment TransferOutcomeStore.outcome is set, whether that's from the
 * boot-time check (they were offline when the midwife decided) or the
 * realtime subscription (they were already in the app). Same shape for
 * every hospital-staff requester, doctor or nurse. Matches
 * DialogRaiseAlert's card shape deliberately — same card shell, header,
 * and footer button pattern as every other dialog in the app.
 */
import { observer } from "mobx-react";
import { Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { rootStore } from "../../store/rootStore";
import { navigate } from "../../navigationRef";
import { colors, radius, spacing } from "../../theme";
import { IconCheck } from "../Icons";

export const DialogTransferOutcome = observer(() => {
  const { width } = useWindowDimensions();
  const store = rootStore.transferOutcomeStore;
  const outcome = store.outcome;

  if (!outcome) return null;

  const accepted = outcome.status === "accepted";

  const handlePrimary = () => {
    if (accepted) {
      rootStore.partogrammeStore.updateSelectedPartogramme(outcome.partogrammeId);
      navigate("Screen_Graph");
    }
    store.acknowledge();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => store.acknowledge()}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.92, 420) }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {accepted ? (
                <View style={[styles.iconWrap, styles.iconWrapAccepted]}>
                  <IconCheck size={13} color={colors.success} />
                </View>
              ) : (
                <View style={styles.dotWrap}>
                  <View style={styles.dot} />
                </View>
              )}
              <Text style={styles.title}>{accepted ? "Demande acceptée" : "Demande refusée"}</Text>
            </View>
            <Text style={styles.subtitle}>
              {accepted
                ? `Le dossier #${outcome.noFile} vous a été transféré.`
                : `Le dossier #${outcome.noFile} n'a pas été transféré.`}
            </Text>
          </View>

          {!accepted && !!outcome.comment && (
            <View style={styles.body}>
              <Text style={styles.commentLabel}>Motif</Text>
              <View style={styles.quote}>
                <Text style={styles.quoteText}>{outcome.comment}</Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            {accepted && (
              <TouchableOpacity style={styles.cancelButton} onPress={() => store.acknowledge()}>
                <Text style={styles.cancelButtonText}>Fermer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.submitButton} onPress={handlePrimary}>
              <Text style={styles.submitButtonText}>{accepted ? "Voir la patiente" : "OK"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapAccepted: {
    backgroundColor: colors.successSoft,
  },
  dotWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
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
    marginLeft: 22 + spacing.xs + 2,
    lineHeight: 18,
  },
  body: {
    marginBottom: spacing.lg,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  quote: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    padding: spacing.sm + 2,
  },
  quoteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onAccent,
  },
});
