import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
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
        Alert.alert("Login error : " + error.message);
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
        onPressFunction={LoginButtonPressed}
        style={{}}
        styleText={{}}
      />
      <CustomButton
        title="Login"
        color="#403572"
        disabled={false}
        onPressFunction={LoginButtonPressed}
        style={{}}
        styleText={{}}
      />
      <CustomButton
        title="Créer un compte"
        color="#9F90D4"
        disabled={false}
        onPressFunction={() => navigation.navigate("Screen_Register")}
        style={{ marginTop: 10 }}
        styleText={{ fontSize: 14 }}
      />
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
    textAlign: "left",
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
});
