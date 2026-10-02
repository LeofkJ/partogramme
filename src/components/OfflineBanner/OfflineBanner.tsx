import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { rootStore } from "../../store/rootStore";
import { IconAlertTriangle } from "../Icons";
import { colors, spacing, radius } from "../../theme";

/** Persistent "Hors ligne" bar, mounted once at the app root (App.js,
 * alongside AlertBanner) so it's visible on every screen — including
 * pre-login, since NetworkStore.start() is self-contained and doesn't wait
 * on a session. Unlike AlertBanner there's no dismiss button: connectivity
 * state should stay visible until it's actually back, not be hideable
 * while still offline. Anchored at the bottom (AlertBanner owns the
 * top-right corner) so the two never overlap if both are showing. */
export const OfflineBanner: React.FC = observer(() => {
  useEffect(() => {
    rootStore.networkStore.start();
  }, []);

  if (!rootStore.networkStore.isOffline) return null;
  return <AnimatedBanner />;
});

// A fresh instance mounts each time isOffline flips true (OfflineBanner
// above unmounts it entirely when false), so the fade/slide-in plays every
// time connectivity is lost, same pattern as AlertBanner's AnimatedBanner.
const AnimatedBanner: React.FC = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.banner, { opacity, transform: [{ translateY }] }]}>
        <IconAlertTriangle size={16} color={colors.danger} />
        <Text style={styles.text}>Hors ligne — vérifiez votre connexion</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
});
