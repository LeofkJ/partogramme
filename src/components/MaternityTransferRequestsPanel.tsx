/**
 * Midwife-facing: pending transfer requests from hospital staff at linked
 * hospitals (see MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §5) — accept moves
 * the patient to that hospital's unclaimed pool (RÉCLAMER handles the
 * rest); reject just clears the request, with an optional comment.
 */
import { useState } from "react";
import { observer } from "mobx-react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { rootStore } from "../store/rootStore";
import { notify } from "../lib/notify";
import { logger } from "../lib/logger";
import { colors, spacing, radius, layout } from "../theme";

export const MaternityTransferRequestsPanel = observer(() => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = rootStore.partogrammeStore.partogrammeList.filter(
    (p) => !!p.asJson.transferRequestHospitalId,
  );

  if (requests.length === 0) return null;

  const hospitalName = (id: string | null) =>
    rootStore.userInfoStore.hospitals.find((h) => h.id === id)?.name ?? "un hôpital";

  const handleAccept = async (partogramme: (typeof requests)[number]) => {
    setBusyId(partogramme.asJson.id);
    try {
      await partogramme.acceptTransferRequest();
      notify.success("Patiente transférée");
    } catch (error: any) {
      logger.warn("MaternityTransferRequestsPanel: accept failed", { error: error?.message });
      notify.error("Erreur", "Impossible d'accepter la demande");
    } finally {
      setBusyId(null);
    }
  };

  const startReject = (id: string) => {
    setRejectingId(id);
    setComment("");
  };

  const confirmReject = async (partogramme: (typeof requests)[number]) => {
    setBusyId(partogramme.asJson.id);
    try {
      await partogramme.rejectTransferRequest(comment.trim() || null);
      notify.success("Demande refusée");
      setRejectingId(null);
    } catch (error: any) {
      logger.warn("MaternityTransferRequestsPanel: reject failed", { error: error?.message });
      notify.error("Erreur", "Impossible de refuser la demande");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Demandes de transfert</Text>
          <Text style={styles.count}>
            {requests.length} demande{requests.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {requests.map((p) => {
          const isRejecting = rejectingId === p.asJson.id;
          const isBusy = busyId === p.asJson.id;
          return (
            <View key={p.asJson.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.name} numberOfLines={1}>
                    Dossier #{p.asJson.noFile}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {hospitalName(p.asJson.transferRequestHospitalId)}
                  </Text>
                </View>
                {!isRejecting && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => startReject(p.asJson.id)}
                      disabled={isBusy}
                    >
                      <Text style={styles.rejectButtonText}>Rejeter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAccept(p)}
                      disabled={isBusy}
                    >
                      <Text style={styles.acceptButtonText}>
                        {isBusy ? "…" : "Accepter"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isRejecting && (
                <View style={styles.rejectBox}>
                  <Text style={styles.rejectLabel}>Commentaire (optionnel)</Text>
                  <TextInput
                    style={styles.rejectInput}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Raison du refus…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                  <View style={styles.rejectBoxActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setRejectingId(null)}>
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmRejectButton}
                      onPress={() => confirmReject(p)}
                      disabled={isBusy}
                    >
                      <Text style={styles.confirmRejectButtonText}>
                        {isBusy ? "…" : "Confirmer le refus"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  inner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  count: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexShrink: 0,
    marginTop: 1,
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  rejectButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  acceptButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
  rejectBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  rejectLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 13,
    padding: spacing.sm,
    minHeight: 64,
    textAlignVertical: "top",
  },
  rejectBoxActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
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
  confirmRejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    alignItems: "center",
  },
  confirmRejectButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
});
