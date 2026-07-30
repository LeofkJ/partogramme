import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { rootStore } from "../../store/rootStore";
import { PasswordInput } from "../../components/PasswordInput";
import CustomButton from "../../components/CustomButton";
import { IconUser, IconPlus } from "../../components/Icons";
import { notify } from "../../lib/notify";
import { logger } from "../../lib/logger";
import { reset } from "../../navigationRef";
import { colors, spacing, radius, layout } from "../../theme";

export type Props = {
  navigation: any;
};

// Wide enough to give the identity block its own side panel instead of
// stacking it above the form, same breakpoint convention as DataTable.
const WIDE_BREAKPOINT = 900;

export const ScreenProfile: React.FC<Props> = observer(() => {
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= WIDE_BREAKPOINT;

  const userInfoStore = rootStore.userInfoStore;
  const profileStore = rootStore.profileStore;

  const [firstName, setFirstName] = useState(userInfoStore.userInfo.firstName);
  const [lastName, setLastName] = useState(userInfoStore.userInfo.lastName);
  const [phone, setPhone] = useState(userInfoStore.userInfo.phone ?? "");
  const [address, setAddress] = useState(userInfoStore.userInfo.address ?? "");
  const [email, setEmail] = useState(profileStore.profile.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const isDoctor = userInfoStore.userInfo.role === "DOCTOR";
  const isAdmin = userInfoStore.userInfo.role === "ADMIN";

  const handleSaveInfo = async () => {
    if (firstName.trim() === "" || lastName.trim() === "") {
      notify.error("Erreur", "Le nom et le prénom sont obligatoires");
      return;
    }
    if (phone.trim() === "") {
      notify.error("Erreur", "Le numéro de téléphone est obligatoire");
      return;
    }
    setIsSavingInfo(true);
    userInfoStore.userInfoFirstName = firstName;
    userInfoStore.userInfoLastName = lastName;
    userInfoStore.userInfoPhone = phone;
    userInfoStore.userInfoAddress = address;
    profileStore.email = email;
    try {
      await userInfoStore.saveUserInfo();
      await profileStore.saveProfile();
      notify.success("Profil mis à jour");
    } catch (error: any) {
      logger.warn("Profile: save info failed", { error: error?.message });
      notify.error("Erreur", "Impossible d'enregistrer le profil");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleLogout = () => {
    profileStore
      .signOut()
      .then(() => {
        rootStore.partogrammeStore.cleanUp();
        rootStore.userInfoStore.cleanUp();
        reset("Screen_Login");
      })
      .catch((error: any) => {
        logger.warn("Profile: signOut failed", { error: error?.message });
      });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      notify.error("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    setIsSavingPassword(true);
    try {
      await profileStore.changePassword(newPassword);
      notify.success("Mot de passe mis à jour");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      logger.warn("Profile: change password failed", { error: error?.message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const identityBlock = (
    <View style={[styles.identityBlock, isWide && styles.identityBlockWide]}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <IconUser size={40} color={colors.textMuted} />
        </View>
        <View style={styles.avatarAddBadge}>
          <IconPlus size={12} color={colors.onAccent} />
        </View>
      </View>
      <Text style={styles.identityName} numberOfLines={1}>
        {firstName} {lastName}
      </Text>
      <Text style={styles.roleText}>
        {isAdmin ? "Administrateur" : isDoctor ? "Médecin" : "Infirmière"}
      </Text>
      {!!userInfoStore.hospitalName && (
        <Text style={styles.identityHospital}>{userInfoStore.hospitalName}</Text>
      )}
      {isWide && (
        <TouchableOpacity style={styles.logoutLink} onPress={handleLogout}>
          <Text style={styles.logoutLinkText}>Se déconnecter</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const formCards = (
    <>
      {/* Informations personnelles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informations personnelles</Text>

        <Text style={styles.label}>Prénom</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Téléphone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Adresse (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>E-mail (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.textMuted}
        />

        <CustomButton
          title={isSavingInfo ? "Enregistrement..." : "Enregistrer"}
          color={colors.accent}
          disabled={isSavingInfo}
          style={styles.cardButton}
          onPressFunction={handleSaveInfo}
          styleText={{ fontSize: 13, fontWeight: "600", margin: 0 }}
        />
      </View>

      {/* Mot de passe */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mot de passe</Text>

        <Text style={styles.label}>Nouveau mot de passe</Text>
        <PasswordInput
          inputStyle={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <PasswordInput
          inputStyle={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor={colors.textMuted}
        />

        <CustomButton
          title={isSavingPassword ? "Enregistrement..." : "Changer le mot de passe"}
          color={colors.accentPressed}
          disabled={isSavingPassword}
          style={styles.cardButton}
          onPressFunction={handleChangePassword}
          styleText={{ fontSize: 13, fontWeight: "600", margin: 0 }}
        />
      </View>

      {/* Hôpital et rôle: admin-managed now (see Admin.tsx) — nurses/doctors
          can no longer self-edit it, so there's no "Modifier" card here. */}

      {!isWide && (
        <TouchableOpacity style={styles.logoutLink} onPress={handleLogout}>
          <Text style={styles.logoutLinkText}>Se déconnecter</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.body}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
      >
        {isWide ? (
          <View style={styles.wideLayout}>
            <View style={styles.wideSidebar}>{identityBlock}</View>
            <View style={styles.wideMain}>{formCards}</View>
          </View>
        ) : (
          <>
            {identityBlock}
            {formCards}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    width: "100%",
    maxWidth: layout.maxFormWidth,
    alignSelf: "center",
  },
  scrollContentWide: {
    maxWidth: layout.maxContentWidth,
    paddingTop: spacing.xxl,
  },
  wideLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xxl,
  },
  wideSidebar: {
    width: 260,
  },
  wideMain: {
    flex: 1,
    maxWidth: 440,
  },
  identityBlock: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  identityBlockWide: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  avatarWrap: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAddBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  identityName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  roleText: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  identityHospital: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 13,
    padding: 8,
  },
  cardButton: {
    width: "100%",
    height: 34,
    margin: 0,
    borderRadius: radius.sm,
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  logoutLink: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  logoutLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
});

export default ScreenProfile;
