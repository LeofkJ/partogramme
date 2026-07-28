import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { observer } from "mobx-react";
import { SafeAreaView } from "react-native-safe-area-context";
import { rootStore } from "../../store/rootStore";
import CustomButton from "../../components/CustomButton";
import { CustomDropdown } from "../../components/Dialogs/CustomDropdown";
import { DialogConfirm } from "../../components/Dialogs/DialogConfirm";
import { DialogAccountDetails, AccountDetails } from "../../components/Dialogs/DialogAccountDetails";
import { SegmentedControl } from "../../components/SegmentedControl";
import { IconTrash, IconPlus, IconUser, IconHome } from "../../components/Icons";
import { notify } from "../../lib/notify";
import { normalizeBeninPhone } from "../../lib/phone";
import { reset } from "../../navigationRef";
import { colors, spacing, radius, layout } from "../../theme";

type RoleChoice = "NURSE" | "DOCTOR";
type Page = "create" | "accounts" | "hospitals";

// Below this, the sidebar nav collapses into a segmented control above the
// content instead of sitting fixed on the side. Comfortably below common
// budget-laptop resolutions (1366x768, 1280x800 and up keep the sidebar).
const WIDE_BREAKPOINT = 900;
const SIDEBAR_WIDTH = 220;

export const ScreenAdmin: React.FC = observer(() => {
  const adminStore = rootStore.adminStore;
  const isAdmin = rootStore.userInfoStore.userInfo.role === "ADMIN";
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= WIDE_BREAKPOINT;

  const [page, setPage] = useState<Page>("create");
  const [createdAccount, setCreatedAccount] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    // Route gating in the navigator only keeps this off the web nav. Direct
    // URL entry still reaches this component, so re-check the role here too.
    if (!isAdmin) {
      reset("Screen_Menu");
    }
  }, [isAdmin]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RoleChoice>("NURSE");
  const [hospitalId, setHospitalId] = useState("");
  const [refDoctorId, setRefDoctorId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [accountFilter, setAccountFilter] = useState<"ALL" | "NURSE" | "DOCTOR">("ALL");
  const [accountSearch, setAccountSearch] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");

  const [newHospitalName, setNewHospitalName] = useState("");
  const [newHospitalCity, setNewHospitalCity] = useState("");
  const [isAddingHospital, setIsAddingHospital] = useState(false);

  const [deletingHospitalId, setDeletingHospitalId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingHospital, setIsDeletingHospital] = useState(false);

  useEffect(() => {
    adminStore.fetchAll();
  }, []);

  const hospitalItems = adminStore.hospitals.map((h) => ({
    label: `${h.name}, ${h.city}`,
    value: h.id,
  }));
  // refDoctorId points at the doctor's profileId, not their userInfo row id.
  const doctorItems = adminStore.doctors.map((d) => ({
    label: `${d.firstName} ${d.lastName}`,
    value: d.profileId,
  }));

  const hospitalName = (id: string | null) =>
    adminStore.hospitals.find((h) => h.id === id)?.name ?? "-";

  const activeAccounts = adminStore.accounts.filter(
    (a) => a.role === "NURSE" || a.role === "DOCTOR",
  );
  const filteredAccounts = activeAccounts
    .filter((a) => accountFilter === "ALL" || a.role === accountFilter)
    .filter((a) => {
      const query = accountSearch.trim().toLowerCase();
      if (!query) return true;
      const haystack = `${a.firstName} ${a.lastName} ${hospitalName(a.hospitalId)}`.toLowerCase();
      return haystack.includes(query);
    });

  const filteredHospitals = adminStore.hospitals.filter((h) =>
    `${h.name} ${h.city}`.toLowerCase().includes(hospitalSearch.trim().toLowerCase()),
  );

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRole("NURSE");
    setHospitalId("");
    setRefDoctorId("");
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      notify.error("Erreur", "Prénom, nom et email sont obligatoires");
      return;
    }
    if (!hospitalId) {
      notify.error("Erreur", "Veuillez sélectionner un hôpital");
      return;
    }
    if (role === "NURSE" && !refDoctorId) {
      notify.error("Erreur", "Veuillez sélectionner un médecin de référence");
      return;
    }
    const normalizedPhone = normalizeBeninPhone(phone);
    setPhone(normalizedPhone);
    setIsCreating(true);
    try {
      const result = await adminStore.createAccount({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        hospitalId,
        refDoctorId: role === "NURSE" ? refDoctorId : null,
        phone: normalizedPhone,
      });
      setCreatedAccount({ email: email.trim(), tempPassword: result.tempPassword });
      resetForm();
      setPage("accounts");
    } catch {
      // adminStore already surfaced the error via notify.error
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddHospital = async () => {
    if (!newHospitalName.trim() || !newHospitalCity.trim()) {
      notify.error("Erreur", "Nom et ville sont obligatoires");
      return;
    }
    setIsAddingHospital(true);
    try {
      await adminStore.createHospital({
        name: newHospitalName.trim(),
        city: newHospitalCity.trim(),
      });
      setNewHospitalName("");
      setNewHospitalCity("");
    } catch {
      // adminStore already surfaced the error via notify.error
    } finally {
      setIsAddingHospital(false);
    }
  };

  const startDeleteHospital = (hospitalId: string) => {
    setDeletingHospitalId(hospitalId);
    setDeleteConfirmText("");
  };

  const cancelDeleteHospital = () => {
    setDeletingHospitalId(null);
    setDeleteConfirmText("");
  };

  const confirmDeleteHospital = async (hospitalId: string) => {
    setIsDeletingHospital(true);
    try {
      await adminStore.removeHospital(hospitalId);
      setDeletingHospitalId(null);
      setDeleteConfirmText("");
    } catch {
      // adminStore already surfaced the error via notify.error
    } finally {
      setIsDeletingHospital(false);
    }
  };

  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const handleRemove = (userInfoId: string, name: string) => {
    setRemoveTarget({ id: userInfoId, name });
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    await adminStore.removeAccount(removeTarget.id).catch(() => {});
  };

  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);

  const detailsAccount: AccountDetails | null = (() => {
    const account = adminStore.accounts.find((a) => a.id === detailsAccountId);
    if (!account) return null;
    const refDoctor = adminStore.doctors.find((d) => d.profileId === account.refDoctorId);
    return {
      name: `${account.firstName} ${account.lastName}`,
      role: account.role === "DOCTOR" ? "DOCTOR" : "NURSE",
      email: adminStore.emailByProfileId[account.profileId] ?? null,
      phone: account.phone,
      address: account.address,
      hospitalName: hospitalName(account.hospitalId),
      refDoctorName: refDoctor ? `${refDoctor.firstName} ${refDoctor.lastName}` : null,
    };
  })();

  const requiredLabel = (text: string) => (
    <Text style={styles.label}>
      {text} <Text style={styles.required}>*</Text>
    </Text>
  );

  const navHeader = (
    <View style={styles.sidebarHeader}>
      <Text style={styles.sidebarTitle}>Administration</Text>
    </View>
  );

  const navButtons = (
    <View style={styles.navList}>
      <TouchableOpacity
        style={[styles.navButton, page === "create" && styles.navButtonActive]}
        onPress={() => setPage("create")}
      >
        <IconPlus
          size={14}
          color={page === "create" ? colors.text : colors.textSecondary}
        />
        <Text style={[styles.navButtonText, page === "create" && styles.navButtonTextActive]}>
          Nouveau compte
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, page === "accounts" && styles.navButtonActive]}
        onPress={() => setPage("accounts")}
      >
        <IconUser
          size={14}
          color={page === "accounts" ? colors.text : colors.textSecondary}
        />
        <Text style={[styles.navButtonText, page === "accounts" && styles.navButtonTextActive]}>
          Comptes actifs
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, page === "hospitals" && styles.navButtonActive]}
        onPress={() => setPage("hospitals")}
      >
        <IconHome
          size={14}
          color={page === "hospitals" ? colors.text : colors.textSecondary}
        />
        <Text style={[styles.navButtonText, page === "hospitals" && styles.navButtonTextActive]}>
          Hôpitaux
        </Text>
      </TouchableOpacity>
    </View>
  );

  const createPage = (
    <View style={styles.pageCard}>
      <Text style={styles.pageTitle}>Nouveau compte</Text>
      <Text style={styles.pageSubtitle}>
        Le compte est activé immédiatement avec un mot de passe temporaire que vous transmettez vous-même à la personne. Elle devra le changer à sa première connexion.
      </Text>

      <SegmentedControl
        options={[
          { key: "NURSE", label: "Infirmière" },
          { key: "DOCTOR", label: "Médecin" },
        ]}
        value={role}
        onChange={setRole}
        style={styles.roleFilterRow}
        chipStyle={styles.roleFilterChip}
      />

      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          {requiredLabel("Prénom")}
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Aïcha"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.fieldHalf}>
          {requiredLabel("Nom")}
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Sossou"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          {requiredLabel("Email")}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="aicha.sossou@hopital.bj"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Téléphone (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          {requiredLabel("Hôpital")}
          <CustomDropdown
            items={hospitalItems}
            selectedValue={hospitalId}
            onValueChange={setHospitalId}
            placeholder="Sélectionnez un hôpital"
            buttonStyle={styles.dropdownButton}
            textStyle={styles.dropdownText}
            menuItemStyle={styles.dropdownMenuItem}
            menuItemTextStyle={styles.dropdownMenuItemText}
            searchable
            searchPlaceholder="Rechercher un hôpital…"
            clearable
          />
        </View>
        <View style={styles.fieldHalf}>
          {role === "NURSE" ? (
            <>
              {requiredLabel("Médecin de référence")}
              <CustomDropdown
                items={doctorItems}
                selectedValue={refDoctorId}
                onValueChange={setRefDoctorId}
                placeholder="Sélectionnez un médecin"
                buttonStyle={styles.dropdownButton}
                textStyle={styles.dropdownText}
                menuItemStyle={styles.dropdownMenuItem}
                menuItemTextStyle={styles.dropdownMenuItemText}
                searchable
                searchPlaceholder="Rechercher un médecin…"
                clearable
              />
            </>
          ) : (
            <View />
          )}
        </View>
      </View>

      <CustomButton
        title={isCreating ? "Création…" : "Créer le compte"}
        color={colors.accent}
        disabled={isCreating}
        style={styles.cardButton}
        onPressFunction={handleCreate}
        styleText={{ fontSize: 12, fontWeight: "600", margin: 0 }}
      />
    </View>
  );

  const accountsPage = (
    <View style={styles.pageCard}>
      <View style={styles.listHeader}>
        <Text style={styles.pageTitle}>Comptes actifs</Text>

        <SegmentedControl
          options={[
            { key: "ALL", label: "Tous" },
            { key: "NURSE", label: "Infirmières" },
            { key: "DOCTOR", label: "Médecins" },
          ]}
          value={accountFilter}
          onChange={setAccountFilter}
        />
      </View>

      <TextInput
        style={[styles.input, styles.searchInput]}
        value={accountSearch}
        onChangeText={setAccountSearch}
        placeholder="Rechercher par nom ou hôpital…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      {filteredAccounts.length > 0 && isWide && (
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, styles.colName]}>Nom</Text>
          <Text style={[styles.tableHeaderText, styles.colRole]}>Rôle</Text>
          <Text style={[styles.tableHeaderText, styles.colHospital]}>Hôpital</Text>
          <Text style={[styles.tableHeaderText, styles.colAction]}> </Text>
        </View>
      )}

      {filteredAccounts.map((account) => (
        <TouchableOpacity
          key={account.id}
          style={styles.accountRow}
          onPress={() => setDetailsAccountId(account.id)}
          activeOpacity={0.6}
        >
          <View style={[styles.colName, styles.accountInfo]}>
            <Text style={styles.accountName} numberOfLines={1}>
              {account.firstName} {account.lastName}
            </Text>
            {!isWide && (
              <Text style={styles.accountMeta}>
                {hospitalName(account.hospitalId)}
              </Text>
            )}
          </View>

          <View style={styles.colRole}>
            <View
              style={[
                styles.roleBadge,
                account.role === "DOCTOR"
                  ? styles.roleBadgeDoctor
                  : styles.roleBadgeNurse,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  account.role === "DOCTOR"
                    ? styles.roleBadgeTextDoctor
                    : styles.roleBadgeTextNurse,
                ]}
              >
                {account.role === "DOCTOR" ? "Médecin" : "Infirmière"}
              </Text>
            </View>
          </View>

          {isWide && (
            <Text style={[styles.colHospital, styles.accountMeta]} numberOfLines={1}>
              {hospitalName(account.hospitalId)}
            </Text>
          )}

          <View style={[styles.colAction, styles.actionCell]}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() =>
                handleRemove(account.id, `${account.firstName} ${account.lastName}`)
              }
            >
              <IconTrash size={13} color={colors.danger} />
              {isWide && <Text style={styles.removeLink}>Retirer l'accès</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {filteredAccounts.length === 0 && (
        <Text style={styles.emptyText}>
          {activeAccounts.length === 0
            ? "Aucun compte pour le moment"
            : accountSearch.trim() !== ""
              ? "Aucun résultat"
              : accountFilter === "NURSE"
                ? "Aucune infirmière"
                : "Aucun médecin"}
        </Text>
      )}
    </View>
  );

  const hospitalsPage = (
    <>
      <View style={styles.pageCard}>
        <Text style={styles.pageTitle}>Ajouter un hôpital</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            {requiredLabel("Nom")}
            <TextInput
              style={styles.input}
              value={newHospitalName}
              onChangeText={setNewHospitalName}
              placeholder="CHU de Cotonou"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.fieldHalf}>
            {requiredLabel("Ville")}
            <TextInput
              style={styles.input}
              value={newHospitalCity}
              onChangeText={setNewHospitalCity}
              placeholder="Cotonou"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <CustomButton
          title={isAddingHospital ? "Ajout en cours…" : "Ajouter l'hôpital"}
          color={colors.accent}
          disabled={isAddingHospital}
          style={styles.cardButton}
          onPressFunction={handleAddHospital}
          styleText={{ fontSize: 12, fontWeight: "600", margin: 0 }}
        />
      </View>

      <View style={[styles.pageCard, styles.pageCardSpaced]}>
        <View style={styles.listHeader}>
          <Text style={styles.pageTitle}>Hôpitaux</Text>
        </View>

        <TextInput
          style={[styles.input, styles.searchInput]}
          value={hospitalSearch}
          onChangeText={setHospitalSearch}
          placeholder="Rechercher par nom ou ville…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        {filteredHospitals.map((hospital) => (
          <View key={hospital.id}>
            <View style={styles.hospitalRow}>
              <View>
                <Text style={styles.accountName}>{hospital.name}</Text>
                <Text style={styles.accountMeta}>{hospital.city}</Text>
              </View>
              {deletingHospitalId !== hospital.id && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => startDeleteHospital(hospital.id)}
                >
                  <IconTrash size={13} color={colors.danger} />
                  <Text style={styles.removeLink}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            {deletingHospitalId === hospital.id && (
              <View style={styles.deleteConfirmBox}>
                <Text style={styles.deleteConfirmLabel}>
                  Tapez "{hospital.name}" pour confirmer la suppression
                </Text>
                <View style={styles.deleteConfirmRow}>
                  <TextInput
                    style={[styles.input, styles.deleteConfirmInput]}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholder={hospital.name}
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.cancelDeleteButton}
                    onPress={cancelDeleteHospital}
                  >
                    <Text style={styles.cancelDeleteButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmDeleteButton,
                      deleteConfirmText.trim() !== hospital.name &&
                        styles.confirmDeleteButtonDisabled,
                    ]}
                    disabled={deleteConfirmText.trim() !== hospital.name || isDeletingHospital}
                    onPress={() => confirmDeleteHospital(hospital.id)}
                  >
                    <Text style={styles.confirmDeleteButtonText}>
                      {isDeletingHospital ? "Suppression…" : "Confirmer"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {filteredHospitals.length === 0 && (
          <Text style={styles.emptyText}>
            {adminStore.hospitals.length === 0
              ? "Aucun hôpital pour le moment"
              : "Aucun résultat"}
          </Text>
        )}
      </View>
    </>
  );

  const tempPasswordBanner = createdAccount && (
    <View style={styles.tempPasswordBanner}>
      <Text style={styles.tempPasswordTitle}>
        Compte créé pour {createdAccount.email}
      </Text>
      <Text style={styles.tempPasswordLabel}>Mot de passe temporaire à transmettre :</Text>
      <Text style={styles.tempPasswordValue} selectable>{createdAccount.tempPassword}</Text>
      <Text style={styles.tempPasswordHint}>
        La personne devra le changer à sa première connexion.
      </Text>
      <TouchableOpacity
        style={styles.tempPasswordDismiss}
        onPress={() => setCreatedAccount(null)}
      >
        <Text style={styles.tempPasswordDismissText}>J'ai noté le mot de passe</Text>
      </TouchableOpacity>
    </View>
  );

  const pageContent = (
    <>
      {tempPasswordBanner}
      {page === "create" ? createPage : page === "accounts" ? accountsPage : hospitalsPage}
      <DialogConfirm
        isVisible={!!removeTarget}
        setIsVisible={(value) => {
          if (!value) setRemoveTarget(null);
        }}
        Title="Retirer l'accès"
        InfoText={
          removeTarget
            ? `${removeTarget.name} ne pourra plus se connecter à l'application. Cette action est réversible depuis Supabase si besoin.`
            : undefined
        }
        confirmText="Retirer l'accès"
        destructive
        onValidate={confirmRemove}
      />
      <DialogAccountDetails
        isVisible={!!detailsAccountId}
        account={detailsAccount}
        onClose={() => setDetailsAccountId(null)}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.body}>
      <View style={styles.wideLayout}>
        <View style={styles.sidebar}>
          {navHeader}
          {navButtons}
        </View>
        <ScrollView
          style={styles.mainArea}
          contentContainerStyle={styles.mainAreaContent}
        >
          <View style={styles.mainAreaInner}>{pageContent}</View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // --- Wide (sidebar) layout ---
  wideLayout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.md,
  },
  mainArea: {
    flex: 1,
  },
  mainAreaContent: {
    padding: spacing.xxl,
    alignItems: "center",
  },
  mainAreaInner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
  },

  // --- Sidebar header ---
  sidebarHeader: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // --- Nav buttons ---
  navList: {
    gap: 2,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    flex: 1,
  },
  navButtonActive: {
    backgroundColor: colors.surfaceMuted,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    flexShrink: 1,
  },
  navButtonTextActive: {
    color: colors.text,
    fontWeight: "600",
  },

  // --- Page content ---
  pageCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  pageCardSpaced: {
    marginTop: spacing.lg,
  },
  tempPasswordBanner: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tempPasswordTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  tempPasswordLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  tempPasswordValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.success,
    marginTop: 4,
  },
  tempPasswordHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  tempPasswordDismiss: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.success,
  },
  tempPasswordDismissText: {
    color: colors.onAccent,
    fontWeight: "600",
    fontSize: 12,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  roleFilterRow: {
    maxWidth: 240,
    marginBottom: spacing.md,
  },
  roleFilterChip: {
    flex: 1,
    alignItems: "center",
    minWidth: 100,
  },
  fieldRow: {
    flexDirection: "row",
    gap: spacing.lg,
    maxWidth: layout.maxFormWidth,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  required: {
    color: colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 12,
    padding: 7,
  },
  searchInput: {
    maxWidth: 260,
    marginBottom: spacing.md,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: "400",
  },
  dropdownMenuItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  dropdownMenuItemText: {
    fontSize: 12,
  },
  cardButton: {
    width: 160,
    height: 32,
    margin: 0,
    borderRadius: radius.sm,
    justifyContent: "center",
    marginTop: spacing.md,
  },

  // --- Accounts list ---
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  colName: {
    flex: 1.2,
    minWidth: 0,
  },
  colRole: {
    width: 90,
  },
  colHospital: {
    flex: 1,
    minWidth: 0,
  },
  colAction: {
    width: 140,
    alignItems: "flex-end",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: spacing.md,
  },
  accountInfo: {
    minWidth: 0,
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  deleteConfirmBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  deleteConfirmLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  deleteConfirmRow: {
    flexDirection: "row",
    gap: 6,
  },
  deleteConfirmInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  cancelDeleteButton: {
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cancelDeleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmDeleteButton: {
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
  },
  confirmDeleteButtonDisabled: {
    opacity: 0.4,
  },
  confirmDeleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
  accountName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  accountMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  actionCell: {
    alignItems: "flex-end",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  removeLink: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  roleBadgeDoctor: {
    backgroundColor: colors.accentSoft,
  },
  roleBadgeNurse: {
    backgroundColor: colors.surfaceMuted,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  roleBadgeTextDoctor: {
    color: colors.accent,
  },
  roleBadgeTextNurse: {
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
});

export default ScreenAdmin;
