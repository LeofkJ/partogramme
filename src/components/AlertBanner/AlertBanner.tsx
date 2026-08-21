import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { rootStore } from "../../store/rootStore";
import { navigate, navigationRef, reset } from "../../navigationRef";
import { IconAlertTriangle, IconX } from "../Icons";
import { colors, spacing, radius } from "../../theme";
import { AlertBannerStore } from "../../store/alertBanner/alertBannerStore";
import { AlertPatient } from "../../store/hospitalDashboard/hospitalDashboardStore";

function alertReasonLabel(p: AlertPatient): string {
  if (p.reason === "manual") return "alerte manuelle";
  if (p.reason === "bpm") return `${p.value} bpm`;
  return `${p.value} cm · bande rouge`;
}

/** Floating, dismissible "X patientes ont une alerte" banner, mounted once
 * at the app root (App.js) so it persists across every screen after login —
 * not scoped to a single navigator like HospitalDashboard's own alert list.
 * Reappears on every fresh login as long as AlertBannerStore.alertCount is
 * still > 0 (see resetForLogin), independent of whether it was dismissed
 * last session. Clicking it opens the screen where those alerts live;
 * the "x" only hides it for the rest of this session. */
export const AlertBanner: React.FC = observer(() => {
  const store = rootStore.alertBannerStore;

  // Runs once on mount — covers a web page refresh / app relaunch, where
  // the whole store tree (including userInfoStore's rehydrated-but-not-
  // reauthenticated snapshot) is rebuilt from scratch. Only a *live*
  // Supabase session is allowed to light the banner back up, never the
  // leftover profileId from AsyncStorage alone (that's still there even
  // sitting on the Login screen after a logout).
  // A still-valid session on cold boot (app force-quit and reopened, not a
  // real logout) should never leave the user parked on the Login screen —
  // Screen_Login is always the app's initial route regardless of session
  // state, so without this, an already-authenticated relaunch just sits
  // there showing the login form (with this banner floating on top of it,
  // since it's correctly detecting a real logged-in session). Only redirect
  // away from Login specifically, so a deep link into some other screen
  // isn't clobbered.
  useEffect(() => {
    store.checkSessionOnBoot().then(() => {
      if (!store.loggedIn) return;
      if (navigationRef.getCurrentRoute()?.name === "Screen_Login") {
        reset("Screen_Menu");
      }
      // Same boot moment covers the transfer-outcome popup too — catches a
      // decision the requester missed while logged out or the app was
      // closed, then stays subscribed for the rest of the session.
      const profileId = rootStore.profileStore.profile.id;
      if (profileId) {
        rootStore.transferOutcomeStore.checkOnBoot(profileId);
        rootStore.transferOutcomeStore.subscribe(profileId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A clinical alert clearing (or a new one firing) should reflect here
  // fast, not on the same lazy 18s cadence as a plain patient-list refresh —
  // this is the one thing on screen that's telling someone "go check on
  // this patient right now."
  //
  // Also polls TransferOutcomeStore on the same cadence — a deliberate
  // fallback alongside its realtime subscription, not a replacement for it.
  // Realtime needs the "Partogramme" table added to Supabase's
  // supabase_realtime publication (Database > Replication in the
  // dashboard, or `alter publication supabase_realtime add table
  // "Partogramme";`); the existing realtime usage in this app only ever
  // exercised the vitals tables (Dilation, BabyHeartFrequency, etc. — see
  // DataStore.ts), never Partogramme itself, so that's unconfirmed. Polling
  // means the outcome popup still shows up within a few seconds for
  // someone already in the app even if that publication step was missed.
  useEffect(() => {
    const interval = setInterval(() => {
      store.refresh();
      if (!rootStore.transferOutcomeStore.outcome) {
        const profileId = rootStore.profileStore.profile.id;
        if (profileId) rootStore.transferOutcomeStore.checkOnBoot(profileId);
      }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!store.visible) return null;
  return <AnimatedBanner store={store} />;
});

// A fresh instance of this mounts each time the banner goes from hidden to
// visible (AlertBanner above unmounts it entirely when store.visible is
// false), so the fade/slide-in below plays every time it reappears — on
// login, or any time alertCount ticks back up above zero.
const AnimatedBanner: React.FC<{ store: AlertBannerStore }> = observer(({ store }) => {
  const { width: screenWidth } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateX]);

  const openAlerts = () => navigate("Screen_HospitalDashboard");
  const { topAlert } = store;
  const extraCount = store.alertCount - 1;

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="box-none">
      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[styles.banner, { maxWidth: Math.min(screenWidth - spacing.xl * 2, 340) }]}
          activeOpacity={0.85}
          onPress={openAlerts}
        >
          <IconAlertTriangle size={18} color={colors.danger} />
          <View style={styles.textBlock}>
            {topAlert ? (
              <>
                <Text style={styles.text} numberOfLines={1}>
                  Dossier #{topAlert.noFile} · {alertReasonLabel(topAlert)}
                </Text>
                {extraCount > 0 && (
                  <Text style={styles.subtext}>
                    +{extraCount} autre{extraCount !== 1 ? "s" : ""} patiente{extraCount !== 1 ? "s" : ""}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.text} numberOfLines={1}>
                {store.alertCount} patiente{store.alertCount !== 1 ? "s" : ""} en alerte
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.dismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation();
              store.dismiss();
            }}
          >
            <IconX size={14} color={colors.danger} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    alignItems: "flex-end",
    zIndex: 1000,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xxxl + spacing.lg,
    marginRight: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  textBlock: {
    flexShrink: 1,
    minWidth: 0,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  subtext: {
    fontSize: 11.5,
    color: colors.danger,
    opacity: 0.75,
    marginTop: 1,
  },
  dismiss: {
    padding: 2,
  },
});
