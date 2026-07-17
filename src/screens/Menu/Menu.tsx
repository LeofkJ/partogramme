import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { IconUserCog, IconPlus } from "../../components/Icons";
import { PartogrammeList } from "../../components/partogrammeList";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { DialogNurseInfo } from "../../components/Dialogs/DialogNurseInfo";
import { useState, useEffect } from "react";
import { rootStore } from "../../store/rootStore";
import { logger } from "../../lib/logger";
import { colors, spacing, layout } from "../../theme";

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
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerName} numberOfLines={1}>
              {firstName} {lastName}
            </Text>
            <Text style={styles.headerRole}>
              {rootStore.userInfoStore.userInfo.role === "NURSE"
                ? "Infirmière"
                : "Médecin"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setNurseInfoDialogVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconUserCog size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerHairline} />
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
            <IconPlus size={22} color={colors.onAccent} />
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    alignItems: "center",
  },
  headerInner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerHairline: {
    height: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    backgroundColor: colors.hairline,
    marginTop: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerName: {
    fontSize: 19,
    fontWeight: "600",
    color: colors.text,
  },
  headerRole: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  fabContainer: {
    position: "absolute",
    bottom: spacing.xl + spacing.xs,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },
});
