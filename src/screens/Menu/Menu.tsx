import { Platform, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { IconPlus } from "../../components/Icons";
import { PartogrammeList } from "../../components/partogrammeList";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { DialogSetPassword } from "../../components/Dialogs/DialogSetPassword";
import { useEffect } from "react";
import { rootStore } from "../../store/rootStore";
import { logger } from "../../lib/logger";
import { colors, spacing, layout } from "../../theme";

export type Props = {
  navigation: any;
};

export const ScreenMenu: React.FC<Props> = observer(({ navigation }) => {
  const isNurse = rootStore.userInfoStore.userInfo.role === "NURSE";
  const firstName = rootStore.userInfoStore.userInfo.firstName;
  const lastName = rootStore.userInfoStore.userInfo.lastName;

  // firstName/lastName/hospitalId/refDoctorId are all set by the admin at
  // account creation now (see Admin.tsx) — nothing here fills them in
  // afterward, so this just waits out mustChangePassword (DialogSetPassword
  // below) and then loads the patient list.
  const checkOnboarding = () => {
    if (rootStore.userInfoStore.userInfo.mustChangePassword) {
      // Blocked by the DialogSetPassword modal below — it calls this again
      // via onDone once the password is set.
      return;
    }
    if (rootStore.userInfoStore.userInfo.role === "NURSE") {
      rootStore.partogrammeStore.fetchFromServer(
        rootStore.profileStore.profile.id,
      );
    } else if (rootStore.userInfoStore.userInfo.role === "DOCTOR") {
      rootStore.partogrammeStore.fetchFromServer();
    }
  };

  useEffect(() => {
    rootStore.userInfoStore
      .fetchUserInfo()
      .then(checkOnboarding)
      .catch((error) => {
        logger.warn("Menu: fetchUserInfo failed", { code: error?.code, message: error?.message });
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
        </View>
        <View style={styles.headerHairline} />
      </View>

      <View style={styles.listContainer}>
        <PartogrammeList title={"Partogrammes"} navigation={navigation} />
      </View>

      {/* Native: the bottom tab bar's "+" replaces this — see MainTabs.tsx. */}
      {isNurse && Platform.OS === "web" && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate("Screen_AddPartogramme")}
          >
            <IconPlus size={22} color={colors.onAccent} />
          </TouchableOpacity>
        </View>
      )}

      <DialogSetPassword
        isVisible={rootStore.userInfoStore.userInfo.mustChangePassword ?? false}
        userInfo={rootStore.userInfoStore}
        onDone={checkOnboarding}
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
