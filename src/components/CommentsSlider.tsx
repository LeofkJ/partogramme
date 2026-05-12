import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";

export interface Props {
  // Put props here
  data: any;
  title?: string;
}

/**
 * Component that displays comments in a lateral list slider
 */
export const CommentsSlider: React.FC<Props> = ({
  // Put props here
  data,
  title = "Comments",
}) => {
  // Put state variables here
  const renderItem = ({ item }: { item: any }) => {
    return (
      // Flat List Item
      <Item
        data={item}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>{title}</Text>
        <FlatList
          style={styles.list}
          horizontal={true}
          data={data} // Use .slice() to subscribe to the partogramme store
          renderItem={renderItem}
          ListEmptyComponent={EmptyListMessage}
        />
    </View>
  );
};

const EmptyListMessage = ({}) => {
  return (
    // Flat List Item
    <Text style={styles.emptyListStyle}>
      Aucun Commentaire ...
    </Text>
  );
};

export interface ItemProps {
  data: any;
}

/**
 *  This function render each item depending of item object
 * @param item Partogramme item of the partogramme list
 * @param onPress function that is called when the item is pressed
 * @param backgroundColor background color of the item
 * @param textColor text color of the item
 * @returns the rendered item
 */
const Item: React.FC<ItemProps> = observer( ({data}: ItemProps) => {
  var options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  return (
    <View style={styles.itemView}>
      <View style={{flexDirection: "row"}}>
        <Text style={[{...styles.itemTextTitle}, {marginBottom: 5, width: 50}]}>
          Date :
        </Text>
        <Text style={[{...styles.itemText}, {marginBottom: 5}]}>
          {new Date(data.created_at).toLocaleDateString(
                "fr-FR",
                options
              )
              }
        </Text>
      </View>
      <Text style={styles.itemTextTitle}>
        Commentaire :
      </Text>
      <Text style={styles.itemText}>
        {data.value}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  // Put styles here
  container: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 200,
  },
  list: {
    marginTop: 5,
    alignContent: "center",
    alignSelf: "center",
    width: "90%",
    height: 170,
  },
  emptyListStyle: {
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 16,
    width: 344,
    alignSelf: "center",
    borderRadius: 15,
  },
  itemView: {
    width: 300,
    padding: 10,
    marginBottom: 20,
    marginHorizontal: 16,
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
    // backgroundColor : "#9F90D4",
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

