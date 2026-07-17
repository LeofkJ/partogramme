import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { observer } from "mobx-react";
import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IconTrash } from "./Icons";
import { rootStore } from "../store/rootStore";
import {
  Partogramme,
  Partogramme_t,
} from "../store/partogramme/partogrammeStore";
import { getStringByEnum, partogrammeStates } from "../../types/constants";
import { logger } from "../lib/logger";
import { notify } from "../lib/notify";
import { colors, spacing, radius, layout, statusColors } from "../theme";

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

const Item = observer(({ item, onPress, onDeleteButtonPress }: ItemProps) => {
  const status = statusColors(item.partogramme.state);
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
    </TouchableOpacity>
  );
});

const EmptyListMessage = () => (
  <Text style={styles.emptyText}>Aucun partogramme disponible.</Text>
);

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

    return (
      <FlatList
        style={styles.list}
        data={rootStore.partogrammeStore.partogrammeList.slice()}
        renderItem={renderItem}
        keyExtractor={(item) => item.partogramme.id}
        ListEmptyComponent={EmptyListMessage}
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
  emptyText: {
    marginTop: spacing.xxxl,
    textAlign: "center",
    fontSize: 13,
    color: colors.textMuted,
  },
});
