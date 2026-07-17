import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  AppStateStatus,
  AppState,
} from "react-native";
import "react-native-url-polyfill/auto";
import { rootStore } from "../../store/rootStore";
import { supabase } from "../../initSupabase";
import { observer } from "mobx-react";
import { logger } from "../../lib/logger";

export type Props = {
  navigation: any;
};

export const ScreenLogin: React.FC<Props> = observer(({ navigation }) => {
  const [isLoadingDialogVisible, setIsLoadingDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
      }
    };

    const handleAuthStateChange = (event: any) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        // Clear any previous user's data before the new session's data is fetched,
        // so a different user logging in on the same device never sees stale
        // partogrammes/info left over from the last session.
        rootStore.partogrammeStore.cleanUp();
        rootStore.userInfoStore.cleanUp();
      }
    };

    supabase.auth.onAuthStateChange(handleAuthStateChange);

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const LoginButtonPressed = () => {
    setIsLoadingDialogVisible(true);
    setErrorMessage(null);
    logger.info("Login attempt", { email: rootStore.profileStore.email });
    rootStore.profileStore
      .signInWithEmail(
        rootStore.profileStore.email,
        rootStore.profileStore.password,
      )
      .then((result) => {
        if (result) {
          logger.info("Login success", { email: rootStore.profileStore.email });
          navigation.navigate("Screen_Menu");
          setIsLoadingDialogVisible(false);
        }
      })
      .catch((error) => {
        logger.warn("Login failed", { email: rootStore.profileStore.email, reason: error?.message });
        setIsLoadingDialogVisible(false);
        const msg = (error?.message || "").toLowerCase();
        let friendly = "";
        if (msg.includes("invalid login credentials") || msg.includes("user not found") || msg.includes("invalid email")) {
          friendly = "Email introuvable ou mot de passe incorrect.";
        } else if (msg.includes("email not confirmed")) {
          friendly = "Veuillez confirmer votre email avant de vous connecter.";
        } else if (msg.includes("too many requests") || msg.includes("rate limit") || error?.status === 429) {
          friendly = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
        } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
          friendly = "Pas de connexion internet. Vérifiez votre réseau.";
        } else if (msg.includes("disabled") || msg.includes("not enabled")) {
          friendly = "Ce compte a été désactivé. Contactez l'administrateur.";
        } else {
          friendly = "Erreur de connexion. Veuillez réessayer.";
        }
        setErrorMessage(friendly);
      });
  };

  return (
    <View style={styles.body}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Bienvenue dans le PartoGraph !</Text>
        <Text style={styles.subtitleText}>Connectez-vous pour continuer</Text>
      </View>

      <View>
        <TextInput
          style={styles.input}
          placeholder="Adresse email"
          placeholderTextColor="#aaa"
          value={rootStore.profileStore.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(value) => rootStore.profileStore.setProfileEmail(value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#aaa"
          value={rootStore.profileStore.password}
          secureTextEntry={true}
          onChangeText={(value) => rootStore.profileStore.setPassword(value)}
        />

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <Pressable
          onPress={LoginButtonPressed}
          disabled={isLoadingDialogVisible}
          android_ripple={{ color: "#ffffff30" }}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { opacity: 0.85 },
            isLoadingDialogVisible && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>
            {isLoadingDialogVisible ? "Connexion…" : "Se connecter"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Screen_Register")}
          android_ripple={{ color: "#40357220" }}
          style={({ pressed }) => [
            styles.btnSecondary,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.btnSecondaryText}>Créer un compte</Text>
        </Pressable>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#f7f7f9",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  titleText: {
    color: "#403572",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  titleAccent: {
    width: 40,
    height: 3,
    backgroundColor: "#9F90D4",
    borderRadius: 2,
    marginBottom: 10,
  },
  subtitleText: {
    color: "#999",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    backgroundColor: "#fff",
    color: "#222",
  },
  btnPrimary: {
    backgroundColor: "#403572",
    borderRadius: 8,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSecondary: {
    borderRadius: 8,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#9F90D4",
  },
  btnSecondaryText: {
    color: "#9F90D4",
    fontSize: 15,
    fontWeight: "500",
  },
  errorText: {
    color: "#c0392b",
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
});
