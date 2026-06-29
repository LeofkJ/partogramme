import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";
import "react-native-url-polyfill/auto";
import CustomButton from "../../components/CustomButton";
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
      const raw = error.message || JSON.stringify(error);
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
      setErrorMessage(`${friendly}\n[${raw}]`);
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
      <Text style={styles.titleText}>Créer un compte</Text>
      <Text style={styles.text}>Email :</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(value) => setEmail(value)}
      />
      <Text style={styles.text}>Mot de passe :</Text>
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        secureTextEntry={true}
        onChangeText={(value) => setPassword(value)}
      />
      <Text style={styles.text}>Confirmer le mot de passe :</Text>
      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        secureTextEntry={true}
        onChangeText={(value) => setConfirmPassword(value)}
      />
      <CustomButton
        title="Créer un compte"
        color="#403572"
        disabled={false}
        onPressFunction={RegisterButtonPressed}
        style={{ marginTop: 20, width: 344 }}
        styleText={{}}
      />
      <CustomButton
        title="Déjà un compte ? Se connecter"
        color="#9F90D4"
        disabled={false}
        onPressFunction={() => navigation.navigate("Screen_Login")}
        style={{ marginTop: 10, width: 344 }}
        styleText={{ fontSize: 14 }}
      />
      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Création du compte...</Text>
        </View>
      )}
    </View>
  );
};

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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
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
