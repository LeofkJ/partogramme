import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, Alert } from "react-native";
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

  const RegisterButtonPressed = async () => {
    if (email === "" || password === "" || confirmPassword === "") {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        "Erreur",
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setIsLoading(false);
      Alert.alert("Erreur", error.message);
      return;
    }

    if (data.user) {
      rootStore.profileStore.setProfileEmail(email);
      rootStore.profileStore.setProfileId(data.user.id);
      setIsLoading(false);
      navigation.navigate("Screen_Menu");
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
});
