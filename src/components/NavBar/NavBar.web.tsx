import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { navigate, reset } from "../../navigationRef";
import { rootStore } from "../../store/rootStore";
import { logger } from "../../lib/logger";
import { colors, spacing } from "../../theme";
import type { NavBarProps } from "./NavBar";

export const NAVBAR_ENABLED = true;

// Landing-page chrome: the navbar shows the auth links here...
const LOGGED_OUT_ROUTES = ["Screen_Login", "Screen_Register"];
// ...and defaults to a single "Connexion" link (acting as sign-out)
// everywhere else, since those screens have no other way back.

const handleLogout = () => {
  rootStore.profileStore
    .signOut()
    .then(() => {
      rootStore.partogrammeStore.cleanUp();
      rootStore.userInfoStore.cleanUp();
      reset("Screen_Login");
    })
    .catch((error) => {
      logger.warn("NavBar.web: signOut failed", { error: error?.message });
    });
};

const NavLink = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ hovered }: any) => [
      styles.link,
      hovered && styles.linkHovered,
    ]}
  >
    <Text style={[styles.linkText, active && styles.linkTextActive]}>
      {label}
    </Text>
  </Pressable>
);

export const NavBar = ({ currentRouteName }: NavBarProps) => {
  // currentRouteName is undefined for a brief moment on every web load/refresh,
  // until the navigation container reports it's ready. Rendering nothing in
  // that gap is what made this bar seem to "disappear" — default to the
  // logged-in bar instead so there's always a way back, and only switch to
  // the logged-out variant once we positively know we're on Login/Register.
  if (currentRouteName && LOGGED_OUT_ROUTES.includes(currentRouteName)) {
    return (
      <View style={styles.bar}>
        <View style={styles.inner}>
          <Pressable onPress={() => navigate("Screen_Login")}>
            <Text style={styles.wordmark}>PartoGraph</Text>
          </Pressable>

          <View style={styles.links}>
            <NavLink
              label="Connexion"
              active={currentRouteName === "Screen_Login"}
              onPress={() => navigate("Screen_Login")}
            />
            <View style={styles.hairline} />
            <NavLink
              label="Créer un compte"
              active={currentRouteName === "Screen_Register"}
              onPress={() => navigate("Screen_Register")}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Text style={styles.wordmark}>PartoGraph</Text>
        <View style={styles.links}>
          <NavLink label="Connexion" onPress={handleLogout} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: 52,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    // Translucent chrome: the canvas shows through faintly, and the
    // bar's edge is a soft transparent hairline rather than a hard border.
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26, 26, 26, 0.08)",
  },
  // Notion/Linear-style: full-width bar, but the content sits in a
  // centered column so brand and links never drift to the screen edges.
  inner: {
    width: "100%",
    maxWidth: 860,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.accent,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  hairline: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(26, 26, 26, 0.12)",
  },
  link: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
  },
  linkHovered: {
    backgroundColor: colors.accentSoft,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  linkTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },
});
