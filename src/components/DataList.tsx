import { observer } from "mobx-react";
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
  onEditButtonPress: (data: data_t) => void;
}

const Item: React.FC<ItemProps> = observer(({ item, onEditButtonPress }) => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemType}>{item.store.name}</Text>
        <Text style={styles.itemValue}>
          {item.data.value} {item.store.unit}
        </Text>
        <Text style={styles.itemDate}>
          {new Date(item.data.created_at).toLocaleDateString("fr-FR", options)}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEditButtonPress(item)}
        >
          <IconPencil size={16} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => item.delete()}
        >
          <IconTrash size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const EmptyListMessage = () => (
  <Text style={styles.emptyText}>
    Aucune donnée modifiée dans les 10 dernières minutes
  </Text>
);

export const DataList: React.FC<DataListProps> = observer(
  ({ title, dataList, onEditButtonPress }) => {
    const renderItem = ({ item }: { item: data_t }) => (
      <Item
        item={item}
        onEditButtonPress={onEditButtonPress}
      />
    );

    return (
      <View style={styles.container}>
        {title && <Text style={styles.titleText}>{title}</Text>}
        <FlatList
          style={styles.list}
          data={dataList}
          renderItem={renderItem}
          keyExtractor={(data) => data.data.id}
          ListEmptyComponent={EmptyListMessage}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  titleText: {
    color: "#403572",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 12,
  },
  list: {
    width: "100%",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#403572",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    width: "100%",
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 2,
  },
  itemValue: {
    color: "#d5d0e9",
    fontSize: 14,
    marginBottom: 2,
  },
  itemDate: {
    color: "#9F90D4",
    fontSize: 12,
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: "#9F90D4",
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#DE2C1D",
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#403572",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    fontStyle: "italic",
  },
});
