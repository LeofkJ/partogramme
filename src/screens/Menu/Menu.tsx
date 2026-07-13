import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { IconUserCog, IconPlus } from "../../components/Icons";
import { PartogrammeList } from "../../components/partogrammeList";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { DialogNurseInfo } from "../../components/Dialogs/DialogNurseInfo";
import { useState, useEffect } from "react";
import { rootStore } from "../../store/rootStore";
import { logger } from "../../lib/logger";

export type Props = {
  navigation: any;
};

export const ScreenMenu: React.FC<Props> = observer(({ navigation }) => {
  const [isNurseInfoDialogVisible, setNurseInfoDialogVisible] = useState(false);

  const isNurse = rootStore.userInfoStore.userInfo.role === "NURSE";
  const firstName = rootStore.userInfoStore.userInfo.firstName;
  const lastName = rootStore.userInfoStore.userInfo.lastName;

  useEffect(() => {
    rootStore.userInfoStore
      .fetchUserInfo()
      .then(() => {
        if (
          rootStore.userInfoStore.userInfo.firstName === "" ||
          rootStore.userInfoStore.userInfo.lastName === "" ||
          rootStore.userInfoStore.userInfo.refDoctorId === "" ||
          rootStore.userInfoStore.userInfo.hospitalId === ""
        ) {
          setNurseInfoDialogVisible(true);
        } else {
          if (rootStore.userInfoStore.userInfo.role === "NURSE") {
            rootStore.partogrammeStore.fetchFromServer(
              rootStore.profileStore.profile.id,
            );
          } else if (rootStore.userInfoStore.userInfo.role === "DOCTOR") {
            rootStore.partogrammeStore.fetchFromServer();
          }
        }
      })
      .catch((error) => {
        if (error.code === "PGRST116") {
          setNurseInfoDialogVisible(true);
        } else {
          logger.warn("Menu: fetchUserInfo failed", { code: error?.code, message: error?.message });
        }
      });
  }, []);

  return (
    <SafeAreaView style={styles.body}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerName} numberOfLines={1}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.headerRole}>
            {rootStore.userInfoStore.userInfo.role === "NURSE" ? "Infirmière" : "Médecin"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setNurseInfoDialogVisible(true)}
        >
          <IconUserCog size={22} color={"#403572"} />
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <PartogrammeList title={"Partogrammes"} navigation={navigation} />
      </View>

      {isNurse && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate("Screen_AddPartogramme")}
          >
            <IconPlus size={22} color={"#ffffff"} />
          </TouchableOpacity>
        </View>
      )}

      <DialogNurseInfo
        isVisible={isNurseInfoDialogVisible}
        userInfo={rootStore.userInfoStore}
        setIsVisible={setNurseInfoDialogVisible}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#F4F3FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    marginTop: -8,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#E8E6F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E6F0",
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9F90D4",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#403572",
    letterSpacing: 0.2,
  },
  headerRole: {
    fontSize: 13,
    color: "#9F90D4",
    fontWeight: "600",
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEECf8",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  fabContainer: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#9F90D4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#403572",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
