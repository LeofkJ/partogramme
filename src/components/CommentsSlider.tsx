import { observer } from "mobx-react";
import React from "react";
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from "react-native";

export interface Props {
  data: any;
  title?: string;
}

export const CommentsSlider: React.FC<Props> = ({
  data,
  title = "Comments",
}) => {
  const renderItem = ({ item }: { item: any }) => {
    return <Item data={item} />;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>{title}</Text>
      <FlatList
        style={styles.list}
        data={data}
        renderItem={renderItem}
        ListEmptyComponent={EmptyListMessage}
      />
    </View>
  );
};

const EmptyListMessage = () => {
  return (
    <Text style={styles.emptyListStyle}>
      Aucun Commentaire ...
    </Text>
  );
};

export interface ItemProps {
  data: any;
}

const Item: React.FC<ItemProps> = observer(({ data }: ItemProps) => {
  const { width } = useWindowDimensions();
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };

  return (
    <View style={[styles.itemView, { width: width * 0.9 }]}>
      <View style={{ flexDirection: "row" }}>
        <Text style={[styles.itemTextTitle, { marginBottom: 5, width: 80 }]}>
          Date :
        </Text>
        <Text style={[styles.itemText, { marginBottom: 5, flex: 1 }]}>
          {new Date(data.created_at).toLocaleDateString("fr-FR", options)}
        </Text>
      </View>
      <Text style={styles.itemTextTitle}>Commentaire :</Text>
      <Text style={styles.itemText}>{data.value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    paddingBottom: 10,
  },
  list: {
    marginTop: 5,
    width: "100%",
  },
  emptyListStyle: {
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 16,
    alignSelf: "center",
  },
  itemView: {
    padding: 10,
    marginBottom: 12,
    marginHorizontal: "5%",
    borderWidth: 5,
    borderColor: "#9F90D4",
    alignSelf: "center",
    borderRadius: 15,
    backgroundColor: "#403572",
  },
  itemTextTitle: {
    marginLeft: 0,
    marginTop: 0,
    borderRadius: 10,
    padding: 5,
    width: 105,
    color: "#ffffff",
  },
  itemText: {
    marginLeft: 0,
    marginTop: 0,
    borderRadius: 10,
    padding: 5,
    color: "#ffffff",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginLeft: 10,
    color: "#403572",
  },
});
