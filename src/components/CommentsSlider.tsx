import { observer } from "mobx-react";
import React from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { IconMessage, IconTrash } from "./Icons";

export interface Props {
  data: any;
  title?: string;
  onDeletePress?: (item: any) => void;
}

export const CommentsSlider: React.FC<Props> = ({
  data,
  title = "Comments",
  onDeletePress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>{title}</Text>
      <View style={styles.list}>
        {data && data.length > 0
          ? data.map((item: any, index: number) => (
              <Item key={index} data={item} onDeletePress={onDeletePress} />
            ))
          : <EmptyListMessage />}
      </View>
    </View>
  );
};

const EmptyListMessage = () => {
  return (
    <View style={styles.emptyListContainer}>
      <IconMessage size={18} color="#b0b0b8" />
      <Text style={styles.emptyListStyle}>Aucun commentaire pour le moment.</Text>
    </View>
  );
};

export interface ItemProps {
  data: any;
  onDeletePress?: (item: any) => void;
}

const Item: React.FC<ItemProps> = observer(({ data, onDeletePress }: ItemProps) => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };

  return (
    <View style={styles.itemView}>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <IconMessage size={14} color="#6b7280" />
          <Text style={styles.itemLabel}>Commentaire</Text>
        </View>
        <View style={styles.itemHeaderRight}>
          <Text style={styles.itemDate}>
            {new Date(data.data.created_at).toLocaleDateString("fr-FR", options)}
          </Text>
          {onDeletePress && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDeletePress(data)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconTrash size={13} color="#b0303a" />
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
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#ececec",
    borderRadius: 10,
  },
  emptyListStyle: {
    color: "#9a9a9a",
    fontSize: 14,
  },
  itemView: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e8e8ec",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 2,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemDate: {
    fontSize: 11,
    color: "#a0a0a8",
    textTransform: "capitalize",
  },
  itemText: {
    fontSize: 15,
    color: "#2d2d33",
    lineHeight: 20,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#403572",
    marginBottom: 2,
  },
});
