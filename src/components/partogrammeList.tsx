import { observer } from "mobx-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IconEye, IconEyeOff, IconPhone } from "./Icons";
import { rootStore } from "../store/rootStore";
import {
  Partogramme,
  Partogramme_t,
} from "../store/partogramme/partogrammeStore";
import { isPatientFlagged, TimedReading } from "../lib/clinicalAlerts";
import { logger } from "../lib/logger";
import { callPhone } from "../lib/callPhone";
import { colors, spacing, radius, layout, statusColors } from "../theme";

// Quiet list labels — the ALL-CAPS constants on the chart page are too
// loud for a row of cards.
const LIST_STATUS_LABEL: Record<Partogramme_t["Row"]["state"], string> = {
  ADMITTED: "Admis",
  IN_PROGRESS: "En cours",
  TRANSFERRED: "Transféré",
  WORK_FINISHED: "Terminée",
};

export interface PartogrammeListProps {
  title?: string;
  navigation: any;
}

export interface ItemProps {
  item: Partogramme;
  onPress: () => void;
  isFlagged?: boolean;
}

// At-a-glance info for an "en cours" row — assigned nurse's phone, so
// hospital staff can reach her without opening the patient.
const EnCoursSummary = observer(({ item }: { item: Partogramme }) => {
  const [nurse, setNurse] = useState<{ phone: string | null; isMaternityNurse: boolean } | null>(null);

  useEffect(() => {
    const nurseId = item.asJson.nurseId;
    if (!nurseId) return;
    rootStore.userInfoStore
      .fetchOtherUserInfo(nurseId)
      .then((info) => {
        if (!info) return;
        setNurse({
          phone: info.phone || null,
          isMaternityNurse: info.nurseType === "MATERNITY",
        });
      })
      .catch((error: any) => {
        logger.warn("PartogrammeList: nurse lookup failed", { nurseId, error: error?.message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.asJson.id]);

  if (!nurse) return null;

  const roleLabel = nurse.isMaternityNurse ? "Sage-femme" : "Infirmière";
  const content = (
    <View style={styles.nurseRow}>
      <Text style={[styles.nurseRole, nurse.isMaternityNurse ? styles.nurseRoleMidwife : styles.nurseRoleHospital]}>
        {roleLabel}
      </Text>
      {!!nurse.phone && (
        <View style={styles.nursePhone}>
          <IconPhone size={13} color={colors.accent} />
          <Text style={styles.nursePhoneText}>{nurse.phone}</Text>
        </View>
      )}
    </View>
  );

  if (!nurse.phone) return content;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={(e) => {
        e.stopPropagation();
        callPhone(nurse.phone as string);
      }}
    >
      {content}
    </TouchableOpacity>
  );
});

const Item = observer(({ item, onPress, isFlagged }: ItemProps) => {
  const state = item.partogramme.state;
  const isEnCours = state === "IN_PROGRESS" || state === "TRANSFERRED";
  const role = rootStore.userInfoStore.userInfo.role;
  const isHospitalStaff =
    role === "DOCTOR" ||
    (role === "NURSE" && rootStore.userInfoStore.userInfo.nurseType !== "MATERNITY");
  const tone = isFlagged ? { bg: colors.dangerSoft, fg: colors.danger } : statusColors(state);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.card}
    >
      <View style={styles.cardMain}>
        <Text style={styles.dossier} numberOfLines={1}>
          Dossier #{Number(item.partogramme.noFile)}
        </Text>
        <View style={styles.cardRight}>
          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusPillText, { color: tone.fg }]}>
              {LIST_STATUS_LABEL[state]}
            </Text>
          </View>
        </View>
      </View>
      {isHospitalStaff && isEnCours && <EnCoursSummary item={item} />}
      {!!item.partogramme.commentary && (
        <Text style={styles.comment} numberOfLines={2}>
          <Text style={styles.commentLabel}>Commentaire : </Text>
          {item.partogramme.commentary}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const EmptyListMessage = () => (
  <Text style={styles.emptyText}>Aucun partogramme disponible.</Text>
);

// For a midwife, TRANSFERRED means the patient has left her maternity for
// a hospital entirely — its own section, not folded into "En cours".
const MATERNITY_SECTION_DEFS: { title: string; states: Partogramme_t["Row"]["state"][] }[] = [
  { title: "Admis", states: ["ADMITTED"] },
  { title: "En cours", states: ["IN_PROGRESS"] },
  { title: "Transféré", states: ["TRANSFERRED"] },
  { title: "Terminée", states: ["WORK_FINISHED"] },
];

type HospitalSectionKey = "flagged" | "inLabour" | "transferred" | "finished";

// Gv: hospital listing is flagged first, then in labour not transferred,
// then transferred; done below / hideable.
const HOSPITAL_SECTION_DEFS: { title: string; key: HospitalSectionKey; urgent?: boolean }[] = [
  { title: "À surveiller", key: "flagged", urgent: true },
  { title: "En cours", key: "inLabour" },
  { title: "Transféré", key: "transferred" },
  { title: "Terminée", key: "finished" },
];

function hospitalSectionData(
  key: HospitalSectionKey,
  list: Partogramme[],
  flaggedIds: Set<string>,
): Partogramme[] {
  if (key === "flagged") {
    return list.filter((p) => flaggedIds.has(p.partogramme.id) && p.partogramme.state !== "WORK_FINISHED");
  }
  if (key === "inLabour") {
    return list.filter(
      (p) =>
        (p.partogramme.state === "ADMITTED" || p.partogramme.state === "IN_PROGRESS") &&
        !flaggedIds.has(p.partogramme.id),
    );
  }
  if (key === "transferred") {
    return list.filter(
      (p) => p.partogramme.state === "TRANSFERRED" && !flaggedIds.has(p.partogramme.id),
    );
  }
  return list.filter((p) => p.partogramme.state === "WORK_FINISHED");
}

export const PartogrammeList = observer(
  ({ title, navigation }: PartogrammeListProps) => {
    const [refreshing, setRefreshing] = useState(false);
    // Hide/unhide the "Terminée" section on demand — a plain toggle, not a
    // persisted preference; flips back to visible next time this screen
    // mounts fresh.
    const [hideFinished, setHideFinished] = useState(false);
    const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

    const isMaternityNurse = rootStore.userInfoStore.userInfo.nurseType === "MATERNITY";
    const allPartogrammes = rootStore.partogrammeStore.partogrammeList.slice();
    const finishedCount = allPartogrammes.filter((p) => p.partogramme.state === "WORK_FINISHED").length;
    const partogrammeIdsKey = allPartogrammes.map((p) => p.partogramme.id).join(",");

    const loadFlags = useCallback(async () => {
      if (isMaternityNurse) {
        setFlaggedIds(new Set());
        return;
      }
      const active = rootStore.partogrammeStore.partogrammeList.filter(
        (p) => p.partogramme.state !== "WORK_FINISHED",
      );
      const ids = active.map((p) => p.partogramme.id);
      if (ids.length === 0) {
        setFlaggedIds(new Set());
        return;
      }
      try {
        const [vitals, alerts] = await Promise.all([
          rootStore.partogrammeStore.transportLayer.fetchLatestVitals(ids),
          rootStore.partogrammeStore.transportLayer.fetchManualAlerts(ids),
        ]);
        const dilationsById: Record<string, TimedReading[]> = {};
        for (const row of vitals.dilations) {
          (dilationsById[row.partogrammeId] ??= []).push({
            value: row.value,
            created_at: row.created_at,
          });
        }
        const bpmLatest: Record<string, { value: number; at: number }> = {};
        for (const row of vitals.bpms) {
          const at = new Date(row.created_at).getTime();
          const existing = bpmLatest[row.partogrammeId];
          if (!existing || at > existing.at) {
            bpmLatest[row.partogrammeId] = { value: row.value, at };
          }
        }
        const hasManual = new Set(alerts.map((a) => a.partogrammeId));
        const next = new Set<string>();
        for (const p of active) {
          const id = p.partogramme.id;
          if (
            isPatientFlagged(
              dilationsById[id] ?? [],
              p.partogramme.workStartDateTime,
              bpmLatest[id]?.value ?? null,
              hasManual.has(id),
            )
          ) {
            next.add(id);
          }
        }
        setFlaggedIds(next);
      } catch (error: any) {
        logger.warn("PartogrammeList: loadFlags failed", { error: error?.message });
      }
    }, [isMaternityNurse, partogrammeIdsKey]);

    useEffect(() => {
      loadFlags();
    }, [loadFlags]);

    const onRefresh = async () => {
      setRefreshing(true);
      try {
        // Also re-pulls the nurse/doctor's own userInfo (role, nurseType,
        // hospitalId/maternityId) — without this, an admin edit made while
        // this screen is open (e.g. reassigning a hospital) never shows up
        // until the app is force-quit and relaunched, since nothing else on
        // this screen re-fetches it.
        await rootStore.userInfoStore.fetchUserInfo();
        if (rootStore.userInfoStore.userInfo.role === "NURSE") {
          await rootStore.partogrammeStore.fetchFromServer(rootStore.profileStore.profile.id);
        } else {
          await rootStore.partogrammeStore.fetchFromServer();
        }
        await loadFlags();
      } catch (error: any) {
        logger.warn("PartogrammeList: refresh failed", { error: error?.message });
      } finally {
        setRefreshing(false);
      }
    };

    const partogrammeSelected = (id: string) => {
      rootStore.partogrammeStore.updateSelectedPartogramme(id);
      navigation.navigate("Screen_Graph");
    };

    const renderItem = ({ item }: { item: Partogramme }) => (
      <Item
        item={item}
        isFlagged={flaggedIds.has(item.partogramme.id)}
        onPress={() => partogrammeSelected(item.partogramme.id)}
      />
    );

    const sections = isMaternityNurse
      ? MATERNITY_SECTION_DEFS
          .map((def) => ({
            title: def.title,
            finished: def.states.includes("WORK_FINISHED"),
            urgent: false,
            data: allPartogrammes.filter((p) => def.states.includes(p.partogramme.state)),
          }))
          .filter((section) => section.data.length > 0)
          .filter((section) => !(hideFinished && section.finished))
      : HOSPITAL_SECTION_DEFS
          .map((def) => ({
            title: def.title,
            finished: def.key === "finished",
            urgent: !!def.urgent,
            data: hospitalSectionData(def.key, allPartogrammes, flaggedIds),
          }))
          .filter((section) => section.data.length > 0)
          .filter((section) => !(hideFinished && section.finished));

    return (
      <SectionList
        style={styles.list}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderText, section.urgent && styles.sectionHeaderTextUrgent]}>
              {section.title}
            </Text>
            <View style={styles.sectionHeaderRight}>
              {section.finished && (
                <TouchableOpacity
                  style={styles.hideFinishedButton}
                  activeOpacity={0.7}
                  onPress={() => setHideFinished(true)}
                >
                  <IconEyeOff size={14} color={colors.accent} />
                  <Text style={styles.hideFinishedButtonText}>Masquer</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.sectionHeaderCount, section.urgent && styles.sectionHeaderCountUrgent]}>
                {section.data.length} patiente{section.data.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.partogramme.id}
        ListEmptyComponent={EmptyListMessage}
        ListFooterComponent={
          hideFinished && finishedCount > 0 ? (
            <TouchableOpacity
              style={styles.showFinishedButton}
              activeOpacity={0.7}
              onPress={() => setHideFinished(false)}
            >
              <IconEye size={15} color={colors.accent} />
              <Text style={styles.showFinishedButtonText}>
                Afficher les terminées ({finishedCount})
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.listFooterSpacer} />
          )
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: spacing.sm, paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      />
    );
  },
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
  },
  hideFinishedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  hideFinishedButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  showFinishedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.lg,
  },
  showFinishedButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  listFooterSpacer: {
    height: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textMuted,
  },
  sectionHeaderTextUrgent: {
    color: colors.danger,
  },
  sectionHeaderCountUrgent: {
    color: colors.danger,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dossier: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  cardRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  comment: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: colors.text,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.textMuted,
  },
  nurseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: 8,
  },
  nurseRole: {
    fontSize: 13,
    fontWeight: "600",
  },
  nurseRoleMidwife: {
    color: colors.accent,
  },
  nurseRoleHospital: {
    color: colors.warning,
  },
  nursePhone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nursePhoneText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.accent,
    textDecorationLine: "underline",
  },
  emptyText: {
    marginTop: spacing.xxxl,
    textAlign: "center",
    fontSize: 13,
    color: colors.textMuted,
  },
});
