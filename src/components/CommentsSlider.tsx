import { observer } from "mobx-react";
import { colors } from "../theme";
import React from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { IconPencil, IconTrash } from "./Icons";

export interface Props {
  data: any;
  title?: string;
  onEditPress?: (item: any) => void;
  onDeletePress?: (item: any) => void;
}

export const CommentsSlider: React.FC<Props> = ({
  data,
  title = "Comments",
  onEditPress,
  onDeletePress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>{title}</Text>
      <View style={styles.list}>
        {data && data.length > 0
          ? data.map((item: any, index: number) => (
              <Item key={index} data={item} onEditPress={onEditPress} onDeletePress={onDeletePress} />
            ))
          : <EmptyListMessage />}
      </View>
    </View>
  );
};

const EmptyListMessage = () => {
  return (
    <View style={styles.emptyListContainer}>
      <Text style={styles.emptyListStyle}>Aucun commentaire pour le moment.</Text>
    </View>
  );
};

export interface ItemProps {
  data: any;
  onEditPress?: (item: any) => void;
  onDeletePress?: (item: any) => void;
}

const Item: React.FC<ItemProps> = observer(({ data, onEditPress, onDeletePress }: ItemProps) => {
  const d = new Date(data.data.created_at);
  const date = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.itemView}>
      <View style={styles.itemTop}>
        <Text style={styles.itemDate}>
          {date} · {time}
        </Text>
        <View style={styles.itemActions}>
          {onEditPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEditPress(data)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconPencil size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onDeletePress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDeletePress(data)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconTrash size={18} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.itemText}>{data.data.value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "95%",
    alignSelf: "center",
    marginTop: 10,
  },
  list: {
    marginTop: 8,
    width: "100%",
  },
  emptyListContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  emptyListStyle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  itemView: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    padding: 6,
  },
  itemDate: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  itemText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 2,
  },
});
