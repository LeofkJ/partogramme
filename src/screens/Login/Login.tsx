import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  AppStateStatus,
  AppState,
} from "react-native";
import "react-native-url-polyfill/auto";
import CustomButton from "../../components/CustomButton";
import { rootStore } from "../../store/rootStore";
import { supabase } from "../../initSupabase";
import { observer } from "mobx-react";

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
      if (event === "SIGNED_OUT") {
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
    rootStore.profileStore
      .signInWithEmail(
        rootStore.profileStore.email,
        rootStore.profileStore.password,
      )
      .then((result) => {
        if (result) {
          navigation.navigate("Screen_Menu");
          setIsLoadingDialogVisible(false);
        }
      })
      .catch((error) => {
        setIsLoadingDialogVisible(false);
        const msg = (error?.message || "").toLowerCase();
        const raw = error?.message || JSON.stringify(error);
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
        setErrorMessage(`${friendly}\n[${raw}]`);
      });
  };

  return (
    <View style={styles.body}>
      <Text style={styles.titleText}>Bienvenue dans le PartoGraph !</Text>
      <Text style={styles.text}>Login:</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={rootStore.profileStore.email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(value) => rootStore.profileStore.setProfileEmail(value)}
      />
      <Text style={styles.text}>Password:</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={rootStore.profileStore.password}
        secureTextEntry={true}
        onChangeText={(value) => rootStore.profileStore.setPassword(value)}
      />
      <CustomButton
        title="Login"
        color="#403572"
        disabled={false}
        onPressFunction={LoginButtonPressed}
        style={{ width: 344, marginTop: 10 }}
        styleText={{}}
      />
      <CustomButton
        title="Créer un compte"
        color="#9F90D4"
        disabled={false}
        onPressFunction={() => navigation.navigate("Screen_Register")}
        style={{ width: 344, marginTop: 10 }}
        styleText={{ fontSize: 14 }}
      />
      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
      {isLoadingDialogVisible && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Connexion en cours...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#000000",
    fontSize: 20,
    margin: 10,
    textAlign: "center",
  },
  input: {
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 5,
    fontSize: 20,
    marginRight: 50,
    marginLeft: 50,
    width: 344,
  },
  titleText: {
    textAlign: "center",
    color: "#403572",
    fontSize: 20,
    margin: 2,
    fontWeight: "bold",
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  loadingText: {
    color: "#403572",
    fontSize: 16,
  },
  errorText: {
    color: "#DE2C1D",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
    width: 344,
  },
});
