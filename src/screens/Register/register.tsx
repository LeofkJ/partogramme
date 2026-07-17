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
import { useRegister } from "./useRegister";
import { colors, spacing, radius, type, layout } from "../../theme";

export type Props = {
  navigation: any;
};

export const ScreenRegister: React.FC<Props> = ({ navigation }) => {
  const register = useRegister(() => navigation.navigate("Screen_Menu"));

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.body}>
      <View style={styles.card}>
        <Text style={styles.wordmark}>PartoGraph</Text>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Rejoignez PartoGraph pour commencer
        </Text>

        <View style={[styles.hairline, { marginBottom: spacing.xxl }]} />

        <Text style={styles.inputLabel}>Adresse email</Text>
        <TextInput
          style={styles.input}
          placeholder="prenom.nom@hopital.fr"
          placeholderTextColor={colors.textMuted}
          value={register.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onChangeText={register.setEmail}
        />

        <Text style={styles.inputLabel}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="6 caractères minimum"
          placeholderTextColor={colors.textMuted}
          value={register.password}
          secureTextEntry={true}
          returnKeyType="next"
          onChangeText={register.setPassword}
        />

        <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          value={register.confirmPassword}
          secureTextEntry={true}
          returnKeyType="go"
          onSubmitEditing={register.submit}
          onChangeText={register.setConfirmPassword}
        />

        {register.errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{register.errorMessage}</Text>
          </View>
        )}

        <Pressable
          onPress={register.submit}
          disabled={register.isSubmitting}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && styles.btnPrimaryPressed,
            register.isSubmitting && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnPrimaryText}>
            {register.isSubmitting ? "Création en cours…" : "Créer un compte"}
          </Text>
        </Pressable>

        <View style={[styles.hairline, { marginTop: spacing.xl }]} />

        <Pressable
          onPress={() => navigation.navigate("Screen_Login")}
          style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.btnGhostText}>Déjà un compte ? Se connecter</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

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
