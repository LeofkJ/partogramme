/**
 * This components is responsible of displaying partogramme list
 */
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { observer } from "mobx-react";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TapGestureHandler } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/FontAwesome"; // Assuming you want to use the FontAwesome icon library
import { rootStore } from "../store/rootStore";
import {
  Partogramme,
  Partogramme_t,
  getStatusBackgroundColor,
} from "../store/partogramme/partogrammeStore";
import { getStringByEnum, partogrammeStates } from "../../types/constants";
import { Database } from "../../types/supabase";
export interface PartogrammeListProps {
  title?: string;
  navigation: any;
}

export interface ItemProps {
  item: Partogramme;
  onPress: () => void;
  onDoublePress: () => void;
  onDeleteButtonPress: () => void;
  backgroundColor: string;
  patientNameTextColor: string;
  infoTextColor: string;
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

const renderDateTextElement = (itemDate: string): string => {
  let retDate = "";
  if (itemDate !== null) {
    let dateFmt = new Date(itemDate);
    retDate = dateFmt.getDate().toString() + "/";
    retDate += (dateFmt.getMonth() + 1).toString() + "/";
    retDate +=
      dateFmt.getFullYear().toString() +
      "-" +
      dateFmt.getHours().toString() +
      ":" +
      dateFmt.getMinutes().toString();
  } else {
    retDate = "Aucune date";
  }
  return retDate;
};

/**
 *  This function render each item depending of item object
 * @param item Partogramme item of the partogramme list
 * @param onPress function that is called when the item is pressed
 * @param backgroundColor background color of the item
 * @param textColor text color of the item
 * @returns the rendered item
 */
const Item = observer(
  ({
    item,
    onPress,
    onDoublePress,
    onDeleteButtonPress,
    backgroundColor,
    patientNameTextColor: patientNameTextColor,
    infoTextColor: infoTextColor,
  }: ItemProps) => (
    <View style={styles.itemView}>
      <TouchableOpacity
        onPress={onDeleteButtonPress}
        style={styles.deleteButton}
      >
        <Icon name="trash-o" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.itemTouchable, { backgroundColor }]}
      >
        <TapGestureHandler numberOfTaps={2} onActivated={() => onDoublePress()}>
          <View style={{ flexDirection: "column", margin: 10 }}>
            <View style={{ flexDirection: "row" }}>
              <FontAwesomeIcon
                style={[styles.icon, { color: patientNameTextColor }]}
                icon={faUser}
              />
              <Text
                style={[
                  styles.patientNameFont,
                  { color: patientNameTextColor },
                ]}
              >
                {renderPatientTextElement(item.partogramme)}
              </Text>
            </View>
            <Text style={[styles.infoFont, { color: infoTextColor }]}>
              Date d'admission {"\t\t"}
              {renderDateTextElement(item.partogramme.admissionDateTime)}
              {"\n"}
              Date de début du travail {"\t"}
              {renderDateTextElement(item.partogramme.workStartDateTime)}
            </Text>
            <View style={{ flexDirection: "row" }}>
              <Text
                style={[
                  styles.infoFont,
                  { color: patientNameTextColor, opacity: 1 },
                ]}
              >
                Statut Patient :
              </Text>
              <Text
                style={[
                  styles.infoFont,
                  styles.statusTextStyle,
                  {
                    color: "#403572",
                    opacity: 1,
                    marginLeft: 10,
                    backgroundColor: getStatusBackgroundColor(
                      item.partogramme.state,
                    ),
                    textAlign: "left",
                  },
                ]}
              >
                {getStringByEnum(partogrammeStates, item.partogramme.state)}
              </Text>
            </View>
          </View>
        </TapGestureHandler>
      </TouchableOpacity>
    </View>
  ),
);

const EmptyListMessage = ({}) => {
  return (
    // Flat List Item
    <Text style={styles.emptyListStyle}>Aucun partogramme disponible !</Text>
  );
};

export const PartogrammeList = observer(
  ({ title, navigation }: PartogrammeListProps) => {
    const [selectedId, setSelectedId] = useState<string>();
    const [isDeleteConfirmDialogVisible, setDeleteConfirmDialogVisible] =
      useState(false);

    const partogrammeSelected = (id: string) => {
      console.log("Partogramme selected: " + id);
      rootStore.partogrammeStore.updateSelectedPartogramme(id);
      navigation.navigate("Screen_Graph");
    };

    const handleDeletePress = (item: Partogramme) => {
      Alert.alert(
        "Confirmation",
        "Êtes-vous sûre de vouloir supprimer ce partogramme?",
        [
          {
            text: "Annuler",
            style: "cancel",
          },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => rootStore.partogrammeStore.removePartogramme(item), // ← changed
          },
        ],
        { cancelable: true },
      );
    };

    /**
     * This function render each item depending of item object
     * @param item Partogramme item of the partogramme list
     * @returns the rendered item
     */
    const renderItem = ({ item }: { item: Partogramme }) => {
      const backgroundColor =
        item.partogramme.id === selectedId ? "#403572" : "#F6F5Ff";
      const patientNameColor =
        item.partogramme.id === selectedId ? "white" : "#403572";
      const infoTextColor =
        item.partogramme.id === selectedId ? "white" : "#403572";

      return (
        // Flat List Item
        <Item
          item={item}
          onPress={() => setSelectedId(item.partogramme.id)}
          onDoublePress={() => partogrammeSelected(item.partogramme.id)}
          onDeleteButtonPress={() => handleDeletePress(item)}
          backgroundColor={backgroundColor}
          patientNameTextColor={patientNameColor}
          infoTextColor={infoTextColor}
        />
      );
    };

    return (
      <FlatList
        style={styles.list}
        data={rootStore.partogrammeStore.partogrammeList.slice()} // Use .slice() to subscribe to the partogramme store
        renderItem={renderItem}
        keyExtractor={(item) => item.partogramme.id}
        ListEmptyComponent={EmptyListMessage}
        contentContainerStyle={{
          flexGrow: 1,
        }}
      />
    );
  },
);

const styles = StyleSheet.create({
  list: {
    marginTop: 20,
    alignContent: "center",
    width: 344,
    height: "100%",
  },
  container: {
    marginTop: "6%",
    alignItems: "center",
  },
  itemView: {
    marginVertical: 1,
    width: "100%",
    alignSelf: "center",
  },
  itemTouchable: {
    marginVertical: 8,
    marginHorizontal: 8,
    width: "100%",
    alignSelf: "center",
    borderRadius: 15,
  },
  patientNameFont: {
    marginLeft: 10,
    color: "#403572",
  },
  infoFont: {
    marginLeft: 0,
    marginTop: 5,
    color: "#403572",
    opacity: 0.5,
  },
  statusTextStyle: {
    opacity: 1,
    borderRadius: 5,
    paddingRight: 5,
    paddingLeft: 5,
  },
  emptyListStyle: {
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 16,
    width: 344,
    alignSelf: "center",
    borderRadius: 15,
  },
  icon: {
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: "red",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: "2%",
    top: "15%",
    zIndex: 1,
  },
});
