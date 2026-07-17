import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { observer } from "mobx-react";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
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
  getStatusBackgroundColor,
} from "../store/partogramme/partogrammeStore";
import { getStringByEnum, partogrammeStates } from "../../types/constants";
import { logger } from "../lib/logger";

declare const window: any;

export interface PartogrammeListProps {
  title?: string;
  navigation: any;
}

export interface ItemProps {
  item: Partogramme;
  onPress: () => void;
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

const pad = (n: number) => n.toString().padStart(2, "0");

const renderDateTextElement = (itemDate: string | null): string => {
  if (itemDate === null) return "Aucune date";
  const d = new Date(itemDate);
  return (
    pad(d.getDate()) + "/" +
    pad(d.getMonth() + 1) + "/" +
    d.getFullYear() + "-" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
};

const Item = observer(
  ({
    item,
    onPress,
    onDeleteButtonPress,
    backgroundColor,
    patientNameTextColor,
    infoTextColor,
  }: ItemProps) => (
    <View style={styles.itemView}>
      <TouchableOpacity
        onPress={onDeleteButtonPress}
        style={styles.deleteButton}
      >
        <IconTrash size={16} color="white" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPress}
        style={styles.itemTouchable}
      >
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <View style={styles.avatarCircle}>
              <FontAwesomeIcon icon={faUser} size={14} color="#ffffff" style={{}} />
            </View>
            <View style={styles.nameBlock}>
              <Text style={styles.patientNameFont} numberOfLines={1}>
                {renderPatientTextElement(item.partogramme)}
              </Text>
              <Text style={styles.fileNumber}>
                Dossier #{Number(item.partogramme.noFile)}
              </Text>
            </View>
          </View>
          <View style={styles.datesContainer}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Admission</Text>
              <Text style={styles.dateValue}>
                {renderDateTextElement(item.partogramme.admissionDateTime)}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Début travail</Text>
              <Text style={styles.dateValue}>
                {renderDateTextElement(item.partogramme.workStartDateTime)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.infoFont, { color: patientNameTextColor, opacity: 1 }]}>
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
                  backgroundColor: getStatusBackgroundColor(item.partogramme.state) ?? "#8c8c8c",
                  textAlign: "left",
                },
              ]}
            >
              {getStringByEnum(partogrammeStates, item.partogramme.state)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  ),
);

const EmptyListMessage = () => (
  <Text style={styles.emptyListStyle}>Aucun partogramme disponible !</Text>
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

    const handleDeletePress = (item: Partogramme) => {
      if (Platform.OS === "web") {
        if (window.confirm("Êtes-vous sûre de vouloir supprimer ce partogramme?")) {
          rootStore.partogrammeStore.removePartogramme(item);
        }
      } else {
        Alert.alert(
          "Confirmation",
          "Êtes-vous sûre de vouloir supprimer ce partogramme?",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Supprimer",
              style: "destructive",
              onPress: () => rootStore.partogrammeStore.removePartogramme(item),
            },
          ],
          { cancelable: true },
        );
      }
    };

    const renderItem = ({ item }: { item: Partogramme }) => (
      <Item
        item={item}
        onPress={() => partogrammeSelected(item.partogramme.id)}
        onDeleteButtonPress={() => handleDeletePress(item)}
        backgroundColor="#ffffff"
        patientNameTextColor="#403572"
        infoTextColor="#9090A0"
      />
    );

    return (
      <FlatList
        style={styles.list}
        data={rootStore.partogrammeStore.partogrammeList.slice()}
        renderItem={renderItem}
        keyExtractor={(item) => item.partogramme.id}
        ListEmptyComponent={EmptyListMessage}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#403572"]}
            tintColor="#403572"
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
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  itemView: {
    marginBottom: 10,
    width: "100%",
  },
  itemTouchable: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#9F90D4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#9F90D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  nameBlock: {
    flex: 1,
  },
  patientNameFont: {
    fontSize: 18,
    fontWeight: "800",
    color: "#403572",
    letterSpacing: 0.3,
  },
  fileNumber: {
    fontSize: 12,
    color: "#9F90D4",
    marginTop: 4,
    fontWeight: "500",
  },
  infoFont: {
    marginLeft: 0,
    marginTop: 5,
    color: "#403572",
    opacity: 0.5,
    fontSize: 13,
  },
  datesContainer: {
    marginTop: 8,
    gap: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: "#9F90D4",
    fontWeight: "600",
    width: 100,
  },
  dateValue: {
    fontSize: 12,
    color: "#403572",
    opacity: 0.7,
    flex: 1,
  },
  statusTextStyle: {
    opacity: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
  },
  emptyListStyle: {
    padding: 10,
    marginVertical: 8,
    alignSelf: "center",
    textAlign: "center",
    color: "#9F90D4",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 1,
  },
});
