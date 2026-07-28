import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
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
import { IconTrash, IconHeart, IconPhone } from "./Icons";
import { rootStore } from "../store/rootStore";
import {
  Partogramme,
  Partogramme_t,
} from "../store/partogramme/partogrammeStore";
import { getStringByEnum, partogrammeStates } from "../../types/constants";
import { logger } from "../lib/logger";
import { notify } from "../lib/notify";
import { colors, spacing, radius, layout, statusColors } from "../theme";

// Same green/yellow/red WHO banding logic as the dilation graph, condensed
// to a single point-in-time classification for the latest reading — no
// color until the patient has actually reached active phase (>=4cm).
type DilationBand = "green" | "yellow" | "red";

function getDilationBand(
  dilationStore: Partogramme["dilationStore"],
  workStartDateTime: string | null,
): DilationBand | null {
  const sorted = dilationStore.sortedDilationList;
  if (sorted.length === 0 || !workStartDateTime) return null;
  const anchor = sorted.find((p) => p.data.value >= 4);
  if (!anchor) return null;

  const startMs = new Date(workStartDateTime).getTime();
  const latest = sorted[sorted.length - 1];
  const bandOffset = (new Date(anchor.data.created_at).getTime() - startMs) / (1000 * 60 * 60);
  const x = (new Date(latest.data.created_at).getTime() - startMs) / (1000 * 60 * 60);
  const h = x - bandOffset;
  const y = latest.data.value;

  const alertLine = Math.min(10, 4 + h);
  if (y > alertLine) return "green";
  if (h >= 4 && y < h) return "red";
  return "yellow";
}

const BAND_COLORS: Record<DilationBand, string> = {
  green: colors.success,
  yellow: colors.warning,
  red: colors.danger,
};

export interface PartogrammeListProps {
  title?: string;
  navigation: any;
}

export interface ItemProps {
  item: Partogramme;
  onPress: () => void;
  onDeleteButtonPress: () => void;
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

// At-a-glance vitals for an "en cours" row — latest BPM, latest dilation
// (colored like the graph), and the assigned nurse's phone number, so a
// doctor can scan the whole list without opening every patient.
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
  const band = getDilationBand(item.dilationStore, item.asJson.workStartDateTime);

  if (latestBpm == null && latestDilation == null && !nursePhone) return null;

  const stats = [
    latestBpm != null && {
      key: "bpm",
      icon: <IconHeart size={15} color={colors.textSecondary} />,
      value: `${latestBpm} bpm`,
      label: "Fréq. cardiaque",
    },
    latestDilation != null && {
      key: "dilation",
      icon: <View style={[styles.bandDot, { backgroundColor: band ? BAND_COLORS[band] : colors.borderStrong }]} />,
      value: `${latestDilation} cm`,
      label: "Dilatation",
    },
    !!nursePhone && {
      key: "nurse",
      icon: <IconPhone size={15} color={colors.textSecondary} />,
      value: nursePhone,
      label: "Infirmière",
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; value: string; label: string }[];

  return (
    <View style={styles.summaryRow}>
      {stats.map((stat, i) => (
        <View key={stat.key} style={[styles.summaryStat, i > 0 && styles.summaryStatBorder]}>
          <View style={styles.summaryStatLeft}>
            {stat.icon}
            <Text style={styles.summaryStatLabel}>{stat.label}</Text>
          </View>
          <Text style={styles.summaryStatValue} numberOfLines={1}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
});

const Item = observer(({ item, onPress, onDeleteButtonPress }: ItemProps) => {
  const status = statusColors(item.partogramme.state);
  const isEnCours = item.partogramme.state === "IN_PROGRESS" || item.partogramme.state === "TRANSFERRED";
  const isDoctor = rootStore.userInfoStore.userInfo.role === "DOCTOR";

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.6}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <FontAwesomeIcon
            icon={faUser}
            size={14}
            color={colors.textSecondary}
            style={{}}
          />
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.patientName} numberOfLines={1}>
            {renderPatientTextElement(item.partogramme)}
          </Text>
          <Text style={styles.fileNumber}>
            Dossier #{Number(item.partogramme.noFile)}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusChipText, { color: status.fg }]}>
            {getStringByEnum(partogrammeStates, item.partogramme.state)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDeleteButtonPress}
          style={styles.deleteButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconTrash size={18} color={colors.danger} />
        </TouchableOpacity>
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

    const handleDeletePress = async (item: Partogramme) => {
      const confirmed = await notify.confirm({
        message: "Êtes-vous sûre de vouloir supprimer ce partogramme?",
        confirmText: "Supprimer",
        cancelText: "Annuler",
        destructive: true,
      });
      if (confirmed) {
        rootStore.partogrammeStore.removePartogramme(item);
      }
    };

    const renderItem = ({ item }: { item: Partogramme }) => (
      <Item
        item={item}
        onPress={() => partogrammeSelected(item.partogramme.id)}
        onDeleteButtonPress={() => handleDeletePress(item)}
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  nameBlock: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  fileNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  commentLine: {
    marginTop: spacing.md,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "600",
    color: colors.text,
  },
  summaryRow: {
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  summaryStat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  summaryStatBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  summaryStatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  bandDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  emptyText: {
    marginTop: spacing.xxxl,
    textAlign: "center",
    fontSize: 13,
    color: colors.textMuted,
  },
});
