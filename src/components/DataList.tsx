import { observer } from "mobx-react";
import { colors, radius, spacing } from "../theme";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { data_t } from "../store/partogramme/partogrammeStore";
import { IconPencil, IconTrash } from "./Icons";

export interface DataListProps {
  title?: string;
  dataList: data_t[];
  onEditButtonPress: (data: data_t) => void;
}

export interface ItemProps {
  item: data_t;
  showType: boolean;
  onEditButtonPress: (data: data_t) => void;
}

const Item: React.FC<ItemProps> = observer(({ item, showType, onEditButtonPress }) => {
  const d = new Date(item.data.created_at);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        {showType && (
          <Text style={styles.itemType} numberOfLines={1}>{item.store.name}</Text>
        )}
        <Text style={styles.itemValue}>
          {item.data.value}
          <Text style={styles.itemUnit}> {item.store.unit}</Text>
        </Text>
      </View>
      <View style={styles.timestamp}>
        <Text style={styles.timestampTime}>{time}</Text>
        <Text style={styles.timestampDate}>{date}</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEditButtonPress(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconPencil size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => item.delete()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconTrash size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const EmptyListMessage = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>🗒️</Text>
    <Text style={styles.emptyText}>
      Aucune donnée enregistrée pour le moment.
    </Text>
  </View>
);

export const DataList: React.FC<DataListProps> = observer(
  ({ title, dataList, onEditButtonPress }) => {
    const { height } = useWindowDimensions();
    const showType = new Set(dataList.map((item) => item.store.name)).size > 1;
    const renderItem = ({ item }: { item: data_t }) => (
      <Item
        item={item}
        showType={showType}
        onEditButtonPress={onEditButtonPress}
      />
    );

    return (
      <View style={styles.container}>
        {title && <Text style={styles.titleText}>{title}</Text>}
        <FlatList
          style={[styles.list, { maxHeight: height * 0.5 }]}
          data={dataList}
          renderItem={renderItem}
          keyExtractor={(data) => data.data.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={EmptyListMessage}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  titleText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  list: {
    width: "100%",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 1,
  },
  itemValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  itemUnit: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "400",
  },
  timestamp: {
    alignItems: "flex-end",
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timestampTime: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  timestampDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: spacing.md,
  },
  actionButton: {
    padding: 6,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 13,
  },
});
