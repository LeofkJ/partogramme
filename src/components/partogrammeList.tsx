import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IconHeart, IconPhone } from "./Icons";
import { rootStore } from "../store/rootStore";
import {
  Partogramme,
  Partogramme_t,
} from "../store/partogramme/partogrammeStore";
import { getStringByEnum, partogrammeStates } from "../../types/constants";
import { logger } from "../lib/logger";
import { getDilationBand, isBpmAlert } from "../lib/clinicalAlerts";
import { colors, spacing, radius, layout, monoFontFamily } from "../theme";

// Status dot color follows the same three buckets as the section grouping
// (Admis / En cours / Terminée) rather than the finer-grained partogramme
// state, so the dot always agrees with the section the card sits in.
function statusDotColor(state: Partogramme_t["Row"]["state"]): string {
  if (state === "WORK_FINISHED") return colors.success;
  if (state === "IN_PROGRESS" || state === "TRANSFERRED") return colors.warning;
  return colors.textMuted;
}

export interface PartogrammeListProps {
  title?: string;
  navigation: any;
}

export interface ItemProps {
  item: Partogramme;
  onPress: () => void;
}

const renderPatientTextElement = (item: Partogramme_t["Row"]) => {
  let patientName = "";
  if (item.patientFirstName !== null) {
    patientName =
      item.patientFirstName.charAt(0).toUpperCase() +
      item.patientFirstName.slice(1);
  } else {
    patientName = "Aucun prénom";
  }
  if (item.patientLastName !== null) {
    patientName +=
      " " +
      item.patientLastName.charAt(0).toUpperCase() +
      item.patientLastName.slice(1);
  } else {
    patientName += " Aucun nom";
  }
  return patientName;
};

// A miniature version of the partograph's own alert/action line, standing
// in for the plain number: dilation is the one reading that's already a
// plot on the real chart, not just a value.
const DilationGauge = ({ valueCm, alert }: { valueCm: number; alert: boolean }) => {
  const pct = Math.min(100, Math.max(0, (valueCm / 10) * 100));
  return (
    <View style={styles.gaugeWrap}>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeZone, { flex: 55, backgroundColor: colors.success }]} />
        <View style={[styles.gaugeZone, { flex: 23, backgroundColor: colors.warning }]} />
        <View style={[styles.gaugeZone, { flex: 22, backgroundColor: colors.danger }]} />
      </View>
      <View
        style={[
          styles.gaugeMarker,
          { left: `${pct}%`, backgroundColor: alert ? colors.danger : colors.text },
        ]}
      />
    </View>
  );
};

// At-a-glance vitals for an "en cours" row — latest BPM, latest dilation
// (with its alert/action gauge), and the assigned nurse's phone number, so
// a doctor can scan the whole list without opening every patient.
const EnCoursSummary = observer(({ item }: { item: Partogramme }) => {
  const [nursePhone, setNursePhone] = useState<string | null>(null);

  useEffect(() => {
    item.babyHeartFrequencyStore.loadBabyHeartFrequencies();
    item.dilationStore.loadDilations();
    const nurseId = item.asJson.nurseId;
    if (nurseId) {
      rootStore.userInfoStore
        .fetchOtherUserInfo(nurseId)
        .then((nurse) => setNursePhone(nurse?.phone || null))
        .catch((error: any) => {
          logger.warn("PartogrammeList: nurse lookup failed", { nurseId, error: error?.message });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.asJson.id]);

  const bpmList = item.babyHeartFrequencyStore.sortedBabyHeartFrequencyList;
  const latestBpm = bpmList.length > 0 ? bpmList[bpmList.length - 1].data.value : null;

  const dilationList = item.dilationStore.sortedDilationList;
  const latestDilation = dilationList.length > 0 ? dilationList[dilationList.length - 1].data.value : null;
  const band = getDilationBand(
    dilationList.map((d) => d.data),
    item.asJson.workStartDateTime,
  );
  const dilationAlert = band === "red";
  const bpmAlert = latestBpm != null && isBpmAlert(latestBpm);

  if (latestBpm == null && latestDilation == null && !nursePhone) return null;

  return (
    <View style={styles.vitals}>
      {latestBpm != null && (
        <View style={[styles.vital, bpmAlert && styles.vitalAlert]}>
          <View style={styles.vitalLabelRow}>
            <IconHeart size={10} color={bpmAlert ? colors.danger : colors.textMuted} />
            <Text style={[styles.vitalLabel, bpmAlert && styles.vitalLabelAlert]}>BPM</Text>
          </View>
          <Text style={[styles.vitalValue, bpmAlert && styles.vitalValueAlert]}>
            {latestBpm}
          </Text>
        </View>
      )}
      {latestDilation != null && (
        <View style={[styles.vital, dilationAlert && styles.vitalAlert]}>
          <Text style={[styles.vitalLabel, dilationAlert && styles.vitalLabelAlert]}>
            Dilatation
          </Text>
          <Text style={[styles.vitalValue, dilationAlert && styles.vitalValueAlert]}>
            {latestDilation} cm
          </Text>
          <DilationGauge valueCm={latestDilation} alert={dilationAlert} />
        </View>
      )}
      {!!nursePhone && (
        <View style={styles.vital}>
          <View style={styles.vitalLabelRow}>
            <IconPhone size={10} color={colors.textMuted} />
            <Text style={styles.vitalLabel}>Infirmière</Text>
          </View>
          <Text style={[styles.vitalValue, styles.vitalValueSub]}>{nursePhone}</Text>
        </View>
      )}
    </View>
  );
});

const Item = observer(({ item, onPress }: ItemProps) => {
  const isEnCours = item.partogramme.state === "IN_PROGRESS" || item.partogramme.state === "TRANSFERRED";
  const isDoctor = rootStore.userInfoStore.userInfo.role === "DOCTOR";

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.6}>
      <View style={styles.cardTop}>
        <View style={styles.idBlock}>
          <Text style={styles.patientName} numberOfLines={1}>
            {renderPatientTextElement(item.partogramme)}
          </Text>
          <Text style={styles.fileNumber}>
            Dossier #{Number(item.partogramme.noFile)}
          </Text>
        </View>
        <View style={styles.statusTag}>
          <View style={[styles.statusDot, { backgroundColor: statusDotColor(item.partogramme.state) }]} />
          <Text style={styles.statusTagText}>
            {getStringByEnum(partogrammeStates, item.partogramme.state)}
          </Text>
        </View>
      </View>

      {!!item.partogramme.commentary && (
        <Text style={styles.commentLine} numberOfLines={2}>
          « {item.partogramme.commentary} »
        </Text>
      )}

      {isDoctor && isEnCours && <EnCoursSummary item={item} />}
    </TouchableOpacity>
  );
});

const EmptyListMessage = () => (
  <Text style={styles.emptyText}>Aucun partogramme disponible.</Text>
);

// Admis → En cours → Terminée. TRANSFERRED (transféré au médecin) is grouped
// under "En cours" since labor is still actively ongoing, just now under
// doctor supervision, not a separate top-level bucket.
const SECTION_DEFS: { title: string; states: Partogramme_t["Row"]["state"][] }[] = [
  { title: "Admis", states: ["ADMITTED"] },
  { title: "En cours", states: ["IN_PROGRESS", "TRANSFERRED"] },
  { title: "Terminée", states: ["WORK_FINISHED"] },
];

export const PartogrammeList = observer(
  ({ title, navigation }: PartogrammeListProps) => {
    const [refreshing, setRefreshing] = useState(false);

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
        onPress={() => partogrammeSelected(item.partogramme.id)}
      />
    );

    const allPartogrammes = rootStore.partogrammeStore.partogrammeList.slice();
    const sections = SECTION_DEFS
      .map((def) => ({
        title: def.title,
        data: allPartogrammes.filter((p) => def.states.includes(p.partogramme.state)),
      }))
      .filter((section) => section.data.length > 0);

    return (
      <SectionList
        style={styles.list}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <Text style={styles.sectionHeaderCount}>{section.data.length}</Text>
          </View>
        )}
        keyExtractor={(item) => item.partogramme.id}
        ListEmptyComponent={EmptyListMessage}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: spacing.sm }}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  idBlock: {
    flex: 1,
    minWidth: 0,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  fileNumber: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: monoFontFamily,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  commentLine: {
    marginTop: spacing.md,
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
    color: colors.textSecondary,
  },
  vitals: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    flexDirection: "row",
  },
  vital: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.hairline,
  },
  vitalAlert: {
    backgroundColor: colors.dangerSoft,
    borderLeftColor: "transparent",
    borderRadius: radius.sm,
    marginVertical: -4,
    paddingVertical: 6,
  },
  vitalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  vitalLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  vitalLabelAlert: {
    color: colors.danger,
  },
  vitalValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    fontFamily: monoFontFamily,
  },
  vitalValueSub: {
    fontSize: 12,
  },
  vitalValueAlert: {
    color: colors.danger,
  },
  gaugeWrap: {
    height: 11,
    justifyContent: "center",
    marginTop: 5,
  },
  gaugeTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
  },
  gaugeZone: {
    opacity: 0.35,
  },
  gaugeMarker: {
    position: "absolute",
    top: 0,
    width: 3,
    height: 11,
    marginLeft: -1.5,
    borderRadius: 1,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  emptyText: {
    marginTop: spacing.xxxl,
    textAlign: "center",
    fontSize: 13,
    color: colors.textMuted,
  },
});
