import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import "react-native-url-polyfill/auto";
import { observer } from "mobx-react";
import { useLogin } from "./useLogin";
import { colors, spacing, radius, type, layout } from "../../theme";

export type Props = {
  navigation: any;
};

export const ScreenLogin: React.FC<Props> = observer(({ navigation }) => {
  const login = useLogin(() => navigation.navigate("Screen_Menu"));
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.body}>
      <View style={styles.card}>
        <Text style={styles.wordmark}>PartoGraph</Text>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Suivi du travail et de l'accouchement
        </Text>

        <View style={[styles.hairline, { marginBottom: spacing.xxl }]} />

        <Text style={styles.inputLabel}>Adresse email</Text>
        <TextInput
          style={styles.input}
          placeholder="prenom.nom@hopital.fr"
          placeholderTextColor={colors.textMuted}
          value={login.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onChangeText={login.setEmail}
        />

        <Text style={styles.inputLabel}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          value={login.password}
          secureTextEntry={true}
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={login.submit}
          onChangeText={login.setPassword}
        />

        {login.errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{login.errorMessage}</Text>
          </View>
        )}

        <Pressable
          onPress={login.submit}
          disabled={login.isSubmitting}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && styles.btnPrimaryPressed,
            login.isSubmitting && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnPrimaryText}>
            {login.isSubmitting ? "Connexion…" : "Se connecter"}
          </Text>
        </Pressable>

        <View style={[styles.hairline, { marginTop: spacing.xl }]} />

        <Pressable
          onPress={() => navigation.navigate("Screen_Register")}
          style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.btnGhostText}>Créer un compte</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: layout.maxFormWidth,
  },
  hairline: {
    height: 1,
    width: "100%",
    backgroundColor: colors.hairline,
  },
  wordmark: {
    ...type.label,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.lg,
  },
  title: {
    ...type.display,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...type.label,
    fontWeight: "400",
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...type.label,
    marginBottom: spacing.xs,
  },
  input: {
    height: layout.touchTarget,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    fontSize: type.body.fontSize,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  btnPrimary: {
    height: layout.touchTarget,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  btnPrimaryPressed: {
    backgroundColor: colors.accentPressed,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: colors.onAccent,
    fontSize: type.body.fontSize,
    fontWeight: "600",
  },
  btnGhost: {
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  btnGhostText: {
    color: colors.accent,
    fontSize: type.body.fontSize,
    fontWeight: "500",
  },
});
