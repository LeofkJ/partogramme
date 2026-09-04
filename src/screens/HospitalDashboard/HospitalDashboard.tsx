/**
 * A hospital's "Tableau de bord" — shared by every doctor and hospital
 * nurse at that hospital (see task.md's "Dashboard scope"), not just
 * doctors. Three sections: alerts, the hospital's own patients, and every
 * linked maternity's patients — matching task.md explicitly ("shows all
 * maternity centers linked to it and their actual patients", "shows which
 * patients are currently admitted", "non-flagged patients are shown too,
 * just not highlighted"). An alerts-only version was tried and reverted —
 * it contradicted those lines directly. Admin has no dashboard access at
 * all — this is the only dashboard in the app. Maternity nurses don't get
 * a separate one; her patient list already shows every patient at her
 * maternity permanently.
 */
import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { rootStore } from "../../store/rootStore";
import { notify } from "../../lib/notify";
import { logger } from "../../lib/logger";
import { getStringByEnum, partogrammeStates } from "../../../types/constants";
import { AlertPatient } from "../../store/hospitalDashboard/hospitalDashboardStore";
import { DilationBand } from "../../lib/clinicalAlerts";
import { IconAlertTriangle, IconMaternity } from "../../components/Icons";
import { colors, spacing, radius, layout, monoFontFamily } from "../../theme";
import { formatElapsed } from "../../lib/formatElapsed";
import { SkeletonPulse, SkeletonBlock } from "../../components/Skeleton/Skeleton";

export type Props = {
  navigation: any;
};

// Same three-bucket color coding as the main patient list (partogrammeList.tsx)
// — reused here so state reads the same way across the whole app, not a
// one-off scheme just for this screen.
function statusDotColor(state: string): string {
  if (state === "WORK_FINISHED") return colors.success;
  if (state === "IN_PROGRESS" || state === "TRANSFERRED") return colors.warning;
  return colors.textMuted;
}

// Same green/yellow/red the dilation graph draws (getDilationBand) and the
// same graded bpm banding (getBpmBand) — a patient's most recent dilation
// or bpm reading dictates her styling here, so staff can see her trending
// toward the alert line before she actually crosses it (red-banded
// patients are already pulled into the "À surveiller" section above with
// their own danger styling, so this only ever renders green/yellow/neutral
// in practice). Deliberately confined to this Dashboard screen — never
// feeds isPatientFlagged/AlertBanner/the "À surveiller" list, so a caution
// never escalates into a popup.
//
// A caution is its own visual thing, not just a tinted line of text next
// to a plain danger-red one — colors.warning ("#B45309", a dark amber) and
// colors.danger ("#C62828", a dark red) read too close to each other as
// plain text at 12px. Badged with its own soft background the same way
// every other clinical-meaning value in this app is (statusPill,
// alertTileSummaryBox), a caution is unmistakably "worth a look, not an
// emergency" — green/no-band values stay plain text, same as before this
// feature existed.
function bandBadge(band: DilationBand | null): { bg: string; border: string; fg: string } | null {
  if (band === "red") return { bg: colors.dangerSoft, border: colors.danger, fg: colors.danger };
  if (band === "yellow") return { bg: colors.warningSoft, border: colors.warning, fg: colors.warning };
  return null;
}

const VitalValue = ({ text, band }: { text: string; band: DilationBand | null }) => {
  const badge = bandBadge(band);
  if (!badge) return <Text style={styles.patientRowVitalText}>{text}</Text>;
  return (
    <View style={[styles.vitalBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
      <IconAlertTriangle size={11} color={badge.fg} />
      <Text style={[styles.vitalBadgeText, { color: badge.fg }]}>{text}</Text>
    </View>
  );
};

function alertSummary(p: AlertPatient): string {
  if (p.reason === "manual") {
    const label = p.manualAlertCount > 1 ? `Alerte manuelle (${p.manualAlertCount})` : "Alerte manuelle";
    return p.raisedAt ? `${label} · depuis ${formatElapsed(p.raisedAt)}` : label;
  }
  if (p.reason === "bpm") {
    return p.value < 100 ? `${p.value} bpm · bradycardie` : `${p.value} bpm · tachycardie`;
  }
  return `${p.value} cm · dilatation bande rouge`;
}

// One alert-tile-shaped bone + one patient-card-shaped bone, repeated —
// shown only on genuine first load (state === "pending" with every
// section still empty), never on the 18s background poll refresh once
// real data is already on screen.
const DashboardSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.section}>
      <SkeletonBlock width={90} height={12} style={{ marginBottom: spacing.md }} />
      {[0, 1].map((i) => (
        <View key={i} style={styles.alertTile}>
          <View>
            <SkeletonBlock width={140} height={14} style={{ marginBottom: spacing.sm }} />
            <SkeletonBlock width={90} height={12} />
          </View>
        </View>
      ))}
    </View>
    <View style={styles.section}>
      <SkeletonBlock width={90} height={12} style={{ marginBottom: spacing.md }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.patientCard}>
          <View style={styles.patientCardInfo}>
            <SkeletonBlock width={100} height={14} />
          </View>
          <SkeletonBlock width={40} height={12} />
        </View>
      ))}
    </View>
  </SkeletonPulse>
);

export const ScreenHospitalDashboard: React.FC<Props> = observer(({ navigation }) => {
  const store = rootStore.hospitalDashboardStore;

  useFocusEffect(
    useCallback(() => {
      store.fetchDashboard();
      const interval = setInterval(() => store.fetchDashboard(), 18000);
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleRequest = async (patientId: string) => {
    try {
      await store.requestTransfer(patientId);
      notify.success("Demande envoyée à la sage-femme");
    } catch (error: any) {
      logger.warn("HospitalDashboard: requestTransfer failed", { error: error?.message });
      notify.error("Erreur", "Impossible d'envoyer la demande");
    }
  };

  const handleClearAlerts = async (patientId: string) => {
    try {
      await store.clearManualAlerts(patientId);
      notify.success("Alerte fermée");
    } catch (error: any) {
      logger.warn("HospitalDashboard: clearManualAlerts failed", { error: error?.message });
      notify.error("Erreur", "Impossible de fermer l'alerte");
    }
  };

  // Clicking an alert goes directly to that patient (see task.md) — same
  // navigation the patient list itself uses. Graph.tsx already handles
  // read-only vs edit mode on its own based on transfer/ownership status,
  // so this doesn't need to know which case it is.
  const openPatient = (id: string) => {
    rootStore.partogrammeStore.updateSelectedPartogramme(id);
    navigation.navigate("Screen_Graph");
  };

  const totalLinkedActive = store.linkedMaternities.reduce((sum, m) => sum + m.patients.length, 0);

  const isInitialLoad =
    store.state === "pending" &&
    store.alertPatients.length === 0 &&
    store.ownHospitalPatients.length === 0 &&
    store.linkedMaternities.length === 0;

  return (
    <SafeAreaView style={styles.body} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Tableau de bord</Text>
            <Text style={styles.pageSubtitle}>
              Votre hôpital et les maternités qui lui sont liées.
            </Text>
          </View>

          {isInitialLoad ? (
            <DashboardSkeleton />
          ) : (
          <>
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, store.alertPatients.length > 0 && styles.sectionTitleUrgent]}>
                À surveiller
              </Text>
              {store.alertPatients.length > 0 && (
                <Text style={styles.sectionCountUrgent}>
                  {store.alertPatients.length} patiente{store.alertPatients.length !== 1 ? "s" : ""}
                </Text>
              )}
            </View>

            {store.alertPatients.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucune patiente en alerte actuellement.</Text>
              </View>
            ) : (
              store.alertPatients.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.alertTile}
                  activeOpacity={0.7}
                  onPress={() => openPatient(p.id)}
                >
                  <View style={styles.alertTileBody}>
                    <View style={styles.alertTileInfo}>
                      <Text style={styles.alertTileName} numberOfLines={1}>
                        Dossier #{p.noFile}
                      </Text>
                      <View style={styles.facilityName}>
                        {!!p.maternityName && (
                          <IconMaternity size={16} color={colors.text} />
                        )}
                        <Text style={styles.alertTileDesc} numberOfLines={1}>
                          {p.maternityName ?? "À l'hôpital"}
                        </Text>
                      </View>
                      <View style={styles.alertTileSummaryBox}>
                        <Text style={styles.alertTileSummary} numberOfLines={1}>
                          {alertSummary(p)}
                        </Text>
                      </View>
                      {p.reason === "manual" && !!p.comment && (
                        <View style={styles.alertTileCommentRow}>
                          <Text style={styles.alertTileCommentLabel}>Commentaire</Text>
                          <Text style={styles.alertTileComment} numberOfLines={2}>
                            {p.comment}
                          </Text>
                        </View>
                      )}
                    </View>
                    {!!p.maternityId && (
                      <TouchableOpacity
                        style={[styles.alertActionPill, p.requestedByMyHospital && styles.alertActionPillSent]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRequest(p.id);
                        }}
                        disabled={p.requestedByMyHospital}
                      >
                        <Text
                          style={[styles.alertActionPillText, p.requestedByMyHospital && styles.alertActionPillTextSent]}
                        >
                          {p.requestedByMyHospital ? "En attente" : "Demander"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!p.maternityId && p.reason === "manual" && (
                      <TouchableOpacity
                        style={styles.alertActionPill}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleClearAlerts(p.id);
                        }}
                      >
                        <Text style={styles.alertActionPillText}>Fermer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>À l'hôpital</Text>
              <Text style={styles.sectionCountNeutral}>
                {store.ownHospitalPatients.length} patiente{store.ownHospitalPatients.length !== 1 ? "s" : ""} active{store.ownHospitalPatients.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {store.ownHospitalPatients.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucune patiente actuellement.</Text>
              </View>
            ) : (
              store.ownHospitalPatients.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.patientCard}
                  activeOpacity={0.6}
                  onPress={() => openPatient(p.id)}
                >
                  <View style={styles.patientCardInfo}>
                    <View style={styles.patientCardNameRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusDotColor(p.state) }]} />
                      <Text style={styles.patientRowName} numberOfLines={1}>
                        Dossier #{p.noFile}
                      </Text>
                    </View>
                    <Text style={styles.patientRowMeta} numberOfLines={1}>
                      {getStringByEnum(partogrammeStates, p.state)}
                    </Text>
                  </View>
                  {(p.latestBpm != null || p.latestDilation != null) && (
                    <View style={styles.patientRowVitals}>
                      {p.latestBpm != null && (
                        <VitalValue text={`${p.latestBpm} bpm`} band={p.latestBpmBand} />
                      )}
                      {p.latestDilation != null && (
                        <VitalValue text={`${p.latestDilation} cm`} band={p.latestDilationBand} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>

          {store.linkedMaternities.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Maternités liées</Text>
                <Text style={styles.sectionCountNeutral}>
                  {totalLinkedActive} patiente{totalLinkedActive !== 1 ? "s" : ""} active{totalLinkedActive !== 1 ? "s" : ""}
                </Text>
              </View>
              {store.linkedMaternities.map((m) => (
                <View key={m.id} style={styles.maternityGroup}>
                  <View style={styles.maternityGroupHead}>
                    <View style={styles.facilityName}>
                      <IconMaternity size={16} color={colors.text} />
                      <Text style={styles.maternityName} numberOfLines={1}>
                        {m.name}
                      </Text>
                    </View>
                    <View style={styles.countPillNeutral}>
                      <Text style={styles.countPillNeutralText}>{m.patients.length}</Text>
                    </View>
                  </View>
                  {m.patients.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>Aucune patiente actuellement.</Text>
                    </View>
                  ) : (
                    m.patients.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.patientCard}
                          activeOpacity={0.6}
                          onPress={() => openPatient(p.id)}
                        >
                          <View style={styles.patientCardInfo}>
                            <Text style={styles.patientRowName} numberOfLines={1}>
                              Dossier #{p.noFile}
                            </Text>
                          </View>
                          {(p.latestBpm != null || p.latestDilation != null) && (
                            <View style={styles.patientRowVitals}>
                              {p.latestBpm != null && (
                                <VitalValue text={`${p.latestBpm} bpm`} band={p.latestBpmBand} />
                              )}
                              {p.latestDilation != null && (
                                <VitalValue text={`${p.latestDilation} cm`} band={p.latestDilationBand} />
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                    ))
                  )}
                </View>
              ))}
            </View>
          )}
          </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: spacing.xxl,
  },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionTitleUrgent: {
    color: colors.danger,
  },
  sectionCountUrgent: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  alertTile: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  alertTileBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  alertTileInfo: {
    flex: 1,
    minWidth: 0,
  },
  alertActionPill: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: 1,
  },
  alertActionPillSent: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  alertActionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  alertActionPillTextSent: {
    color: colors.textMuted,
  },
  alertTileName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  alertTileDesc: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  facilityName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  alertTileSummaryBox: {
    alignSelf: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginTop: 8,
    maxWidth: "100%",
  },
  alertTileSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  alertTileCommentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: 6,
  },
  alertTileCommentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 1,
  },
  alertTileComment: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  sectionCountNeutral: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  patientCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  patientCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  patientRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  patientRowMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  patientRowVitals: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 2,
  },
  patientRowVitalText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    fontFamily: monoFontFamily,
  },
  vitalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vitalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: monoFontFamily,
  },
  maternityGroup: {
    marginBottom: spacing.md,
  },
  maternityGroupHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  maternityName: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.text,
  },
  countPillNeutral: {
    minWidth: 26,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillNeutralText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.text,
    fontFamily: monoFontFamily,
  },
});
