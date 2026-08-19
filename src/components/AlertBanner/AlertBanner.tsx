import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { rootStore } from "../../store/rootStore";
import { navigate } from "../../navigationRef";
import { IconAlertTriangle, IconX } from "../Icons";
import { colors, spacing, radius } from "../../theme";
import { AlertBannerStore } from "../../store/alertBanner/alertBannerStore";

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
  useEffect(() => {
    store.checkSessionOnBoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A clinical alert clearing (or a new one firing) should reflect here
  // fast, not on the same lazy 18s cadence as a plain patient-list refresh —
  // this is the one thing on screen that's telling someone "go check on
  // this patient right now."
  useEffect(() => {
    const interval = setInterval(() => store.refresh(), 5000);
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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateX]);

  const openAlerts = () => navigate("Screen_HospitalDashboard");

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="box-none">
      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        <TouchableOpacity style={styles.banner} activeOpacity={0.85} onPress={openAlerts}>
          <IconAlertTriangle size={18} color={colors.danger} />
          <Text style={styles.text}>
            {store.alertCount} patiente{store.alertCount !== 1 ? "s" : ""} nécessite
            {store.alertCount !== 1 ? "nt" : ""} une attention immédiate
          </Text>
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
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  dismiss: {
    padding: 2,
  },
});
