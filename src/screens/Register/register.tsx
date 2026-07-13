import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
} from "react-native";
import "react-native-url-polyfill/auto";
import { supabase } from "../../initSupabase";
import { rootStore } from "../../store/rootStore";

export type Props = {
  navigation: any;
};

export const ScreenRegister: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const RegisterButtonPressed = async () => {
    setErrorMessage(null);

    if (email === "" || password === "" || confirmPassword === "") {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setIsLoading(false);
      const msg = error.message.toLowerCase();
      let friendly = "";
      if (msg.includes("already registered") || msg.includes("user already exists") || msg.includes("already exists")) {
        friendly = "Un compte existe déjà avec cet email.";
      } else if (msg.includes("invalid email") || msg.includes("unable to validate email")) {
        friendly = "Adresse email invalide.";
      } else if (msg.includes("password") || msg.includes("weak password")) {
        friendly = "Le mot de passe ne respecte pas les critères requis (minimum 6 caractères).";
      } else if (msg.includes("too many requests") || msg.includes("rate limit") || (error as any)?.status === 429) {
        friendly = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
        friendly = "Pas de connexion internet. Vérifiez votre réseau.";
      } else if (msg.includes("signup") && msg.includes("disabled")) {
        friendly = "La création de compte est temporairement désactivée.";
      } else {
        friendly = "Erreur lors de la création du compte. Veuillez réessayer.";
      }
      setErrorMessage(friendly);
      return;
    }

    if (data.session) {
      const { error: profileError } = await supabase
        .from("Profile")
        .upsert({ id: data.user!.id, email: email, isDeleted: false });
      if (profileError) {
        setIsLoading(false);
        setErrorMessage("Compte créé mais erreur lors de la configuration du profil. Veuillez réessayer.");
        return;
      }
      rootStore.profileStore.setProfileEmail(email);
      rootStore.profileStore.setProfileId(data.user!.id);
      setIsLoading(false);
      navigation.navigate("Screen_Menu");
    } else if (data.user && !data.session) {
      setIsLoading(false);
      setErrorMessage("Un lien de confirmation a été envoyé à " + email + ". Veuillez confirmer votre email avant de vous connecter.");
    } else {
      setIsLoading(false);
      setErrorMessage("Impossible de créer le compte. Veuillez réessayer.");
    }
  };

  return (
    <View style={styles.body}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Créer un compte</Text>
        <Text style={styles.subtitleText}>Rejoignez PartoGraph pour commencer</Text>
      </View>

      <View>
        <TextInput
          style={styles.input}
          placeholder="Adresse email"
          placeholderTextColor="#aaa"
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(value) => setEmail(value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#aaa"
          value={password}
          secureTextEntry={true}
          onChangeText={(value) => setPassword(value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor="#aaa"
          value={confirmPassword}
          secureTextEntry={true}
          onChangeText={(value) => setConfirmPassword(value)}
        />

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <Pressable
          onPress={RegisterButtonPressed}
          disabled={isLoading}
          android_ripple={{ color: "#ffffff30" }}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { opacity: 0.85 },
            isLoading && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>
            {isLoading ? "Création en cours…" : "Créer un compte"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Screen_Login")}
          android_ripple={{ color: "#40357220" }}
          style={({ pressed }) => [
            styles.btnSecondary,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.btnSecondaryText}>Déjà un compte ? Se connecter</Text>
        </Pressable>
      </View>
    </View>
  );
};

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
