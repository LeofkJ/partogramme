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
import * as Clipboard from "expo-clipboard";
import { rootStore } from "../../store/rootStore";
import CustomButton from "../../components/CustomButton";
import { CustomDropdown } from "../../components/Dialogs/CustomDropdown";
import { DialogConfirm } from "../../components/Dialogs/DialogConfirm";
import { DialogAccountDetails, AccountDetails } from "../../components/Dialogs/DialogAccountDetails";
import { DialogEditAccount, EditableAccount } from "../../components/Dialogs/DialogEditAccount";
import { SegmentedControl } from "../../components/SegmentedControl";
import { IconTrash, IconPlus, IconUser, IconHome, IconUserCog, IconCopy, IconCheck } from "../../components/Icons";
import { notify } from "../../lib/notify";
import { reset } from "../../navigationRef";
import { colors, spacing, radius, layout } from "../../theme";
import { formatDateOnly } from "../../tools/StringUtilitary";

type RoleChoice = "NURSE" | "DOCTOR";
type Page = "create" | "accounts" | "hospitals" | "admins";

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
  const [passwordCopied, setPasswordCopied] = useState(false);

  const handleCopyPassword = async (password: string) => {
    await Clipboard.setStringAsync(password);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

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
  const [isCreating, setIsCreating] = useState(false);
  const [accountFilter, setAccountFilter] = useState<"ALL" | "NURSE" | "DOCTOR">("ALL");

  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminHospitalId, setAdminHospitalId] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
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

  const hospitalName = (id: string | null) =>
    adminStore.hospitals.find((h) => h.id === id)?.name ?? "-";

  const activeAccounts = adminStore.accounts.filter(
    (a) => a.role === "NURSE" || a.role === "DOCTOR",
  );
  const adminAccounts = adminStore.accounts.filter((a) => a.role === "ADMIN");
  const adminCount = adminAccounts.length;
  const myProfileId = rootStore.profileStore.profile.id;
  const filteredAdminAccounts = adminAccounts.filter((a) => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) return true;
    const haystack = `${a.firstName} ${a.lastName} ${hospitalName(a.hospitalId)}`.toLowerCase();
    return haystack.includes(query);
  });
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
    setIsCreating(true);
    try {
      const result = await adminStore.createAccount({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        hospitalId,
        phone: phone.trim(),
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

  const resetAdminForm = () => {
    setAdminFirstName("");
    setAdminLastName("");
    setAdminEmail("");
    setAdminPhone("");
    setAdminHospitalId("");
  };

  const handleCreateAdmin = async () => {
    if (!adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim()) {
      notify.error("Erreur", "Prénom, nom et email sont obligatoires");
      return;
    }
    setIsCreatingAdmin(true);
    try {
      const result = await adminStore.createAccount({
        email: adminEmail.trim(),
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        role: "ADMIN",
        hospitalId: adminHospitalId || null,
        phone: adminPhone.trim(),
      });
      setCreatedAccount({ email: adminEmail.trim(), tempPassword: result.tempPassword });
      resetAdminForm();
    } catch {
      // adminStore already surfaced the error via notify.error
    } finally {
      setIsCreatingAdmin(false);
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
    return {
      name: `${account.firstName} ${account.lastName}`,
      role: account.role === "DOCTOR" ? "DOCTOR" : account.role === "ADMIN" ? "ADMIN" : "NURSE",
      email: adminStore.emailByProfileId[account.profileId] ?? null,
      phone: account.phone,
      address: account.address,
      hospitalName: hospitalName(account.hospitalId),
    };
  })();

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const editableAccount: EditableAccount | null = (() => {
    const account = adminStore.accounts.find((a) => a.id === editingAccountId);
    if (!account) return null;
    return {
      userInfoId: account.id,
      role: account.role === "DOCTOR" ? "DOCTOR" : account.role === "ADMIN" ? "ADMIN" : "NURSE",
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone ?? "",
      hospitalId: account.hospitalId ?? "",
      isSelf: account.profileId === myProfileId,
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

      <TouchableOpacity
        style={[styles.navButton, page === "admins" && styles.navButtonActive]}
        onPress={() => setPage("admins")}
      >
        <IconUserCog
          size={14}
          color={page === "admins" ? colors.text : colors.textSecondary}
        />
        <Text style={[styles.navButtonText, page === "admins" && styles.navButtonTextActive]}>
          Administrateurs
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
        <View style={styles.fieldNarrow}>
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
          <Text style={[styles.tableHeaderText, styles.colName]}>Employé</Text>
          <Text style={[styles.tableHeaderText, styles.colPhone]}>Téléphone</Text>
          <Text style={[styles.tableHeaderText, styles.colRole]}>Rôle</Text>
          <Text style={[styles.tableHeaderText, styles.colHospital]}>Hôpital</Text>
          <Text style={[styles.tableHeaderText, styles.colPatients]}>Patients</Text>
          <Text style={[styles.tableHeaderText, styles.colLastLogin]}>Dernière connexion</Text>
          <Text style={[styles.tableHeaderText, styles.colAction]}> </Text>
        </View>
      )}

      {filteredAccounts.map((account) => {
        const lastLogin = adminStore.lastLoginByProfileId[account.profileId];
        const patientCount = adminStore.patientCounts(account);

        return (
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
              {!isWide && !!account.phone && (
                <Text style={styles.accountMeta}>{account.phone}</Text>
              )}
              {!isWide && (
                <Text style={styles.accountMeta}>
                  {hospitalName(account.hospitalId)} · {patientCount.active} actif
                  {patientCount.active !== 1 ? "s" : ""}, {patientCount.inactive} inactif
                  {patientCount.inactive !== 1 ? "s" : ""} ·{" "}
                  {lastLogin ? formatDateOnly(lastLogin) : "Jamais connecté"}
                </Text>
              )}
            </View>

            {isWide && (
              <Text style={[styles.colPhone, styles.accountMeta]}>
                {account.phone || "—"}
              </Text>
            )}

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
              <Text style={[styles.colHospital, styles.accountMeta]}>
                {hospitalName(account.hospitalId)}
              </Text>
            )}

            {isWide && (
              <View style={[styles.colPatients, styles.patientBadgeRow]}>
                <View style={[styles.patientBadge, styles.patientBadgeActive]}>
                  <Text style={[styles.patientBadgeText, styles.patientBadgeTextActive]}>
                    {patientCount.active}
                  </Text>
                </View>
                <View style={[styles.patientBadge, styles.patientBadgeInactive]}>
                  <Text style={[styles.patientBadgeText, styles.patientBadgeTextInactive]}>
                    {patientCount.inactive}
                  </Text>
                </View>
              </View>
            )}

            {isWide && (
              <Text style={[styles.colLastLogin, styles.accountMeta]}>
                {lastLogin ? formatDateOnly(lastLogin) : "Jamais connecté"}
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
        );
      })}

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

  const adminsPage = (
    <>
      <View style={styles.pageCard}>
        <Text style={styles.pageTitle}>Nouvel administrateur</Text>
        <Text style={styles.pageSubtitle}>
          Un administrateur a accès à toute la gestion des comptes et des hôpitaux. Le compte est activé immédiatement avec un mot de passe temporaire que vous transmettez vous-même à la personne.
        </Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            {requiredLabel("Prénom")}
            <TextInput
              style={styles.input}
              value={adminFirstName}
              onChangeText={setAdminFirstName}
              placeholder="Aïcha"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.fieldHalf}>
            {requiredLabel("Nom")}
            <TextInput
              style={styles.input}
              value={adminLastName}
              onChangeText={setAdminLastName}
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
              value={adminEmail}
              onChangeText={setAdminEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="admin@hopital.bj"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Téléphone (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={adminPhone}
              onChangeText={setAdminPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldNarrow}>
            <Text style={styles.label}>Hôpital (optionnel)</Text>
            <CustomDropdown
              items={hospitalItems}
              selectedValue={adminHospitalId}
              onValueChange={setAdminHospitalId}
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
        </View>

        <CustomButton
          title={isCreatingAdmin ? "Création…" : "Créer l'administrateur"}
          color={colors.accent}
          disabled={isCreatingAdmin}
          style={styles.cardButton}
          onPressFunction={handleCreateAdmin}
          styleText={{ fontSize: 12, fontWeight: "600", margin: 0 }}
        />
      </View>

      <View style={[styles.pageCard, styles.pageCardSpaced]}>
        <View style={styles.listHeader}>
          <Text style={styles.pageTitle}>Administrateurs</Text>
        </View>

        <TextInput
          style={[styles.input, styles.searchInput]}
          value={adminSearch}
          onChangeText={setAdminSearch}
          placeholder="Rechercher par nom ou hôpital…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        {filteredAdminAccounts.length > 0 && isWide && (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colName]}>Employé</Text>
            <Text style={[styles.tableHeaderText, styles.colPhone]}>Téléphone</Text>
            <Text style={[styles.tableHeaderText, styles.colHospital]}>Hôpital</Text>
            <Text style={[styles.tableHeaderText, styles.colLastLogin]}>Dernière connexion</Text>
            <Text style={[styles.tableHeaderText, styles.colAction]}> </Text>
          </View>
        )}

        {filteredAdminAccounts.map((account) => {
          const lastLogin = adminStore.lastLoginByProfileId[account.profileId];
          const isSelf = account.profileId === myProfileId;

          return (
            <TouchableOpacity
              key={account.id}
              style={styles.accountRow}
              onPress={() => setDetailsAccountId(account.id)}
              activeOpacity={0.6}
            >
              <View style={[styles.colName, styles.accountInfo]}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {account.firstName} {account.lastName}
                  {isSelf ? " (vous)" : ""}
                </Text>
                {!isWide && !!account.phone && (
                  <Text style={styles.accountMeta}>{account.phone}</Text>
                )}
                {!isWide && (
                  <Text style={styles.accountMeta}>
                    {hospitalName(account.hospitalId)} ·{" "}
                    {lastLogin ? formatDateOnly(lastLogin) : "Jamais connecté"}
                  </Text>
                )}
              </View>

              {isWide && (
                <Text style={[styles.colPhone, styles.accountMeta]}>
                  {account.phone || "—"}
                </Text>
              )}

              {isWide && (
                <Text style={[styles.colHospital, styles.accountMeta]}>
                  {hospitalName(account.hospitalId)}
                </Text>
              )}

              {isWide && (
                <Text style={[styles.colLastLogin, styles.accountMeta]}>
                  {lastLogin ? formatDateOnly(lastLogin) : "Jamais connecté"}
                </Text>
              )}

              <View style={[styles.colAction, styles.actionCell]}>
                {!isSelf && adminCount > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      handleRemove(account.id, `${account.firstName} ${account.lastName}`)
                    }
                  >
                    <IconTrash size={13} color={colors.danger} />
                    {isWide && <Text style={styles.removeLink}>Retirer l'accès</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredAdminAccounts.length === 0 && (
          <Text style={styles.emptyText}>
            {adminAccounts.length === 0 ? "Aucun administrateur pour le moment" : "Aucun résultat"}
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
      <View style={styles.tempPasswordRow}>
        <Text style={styles.tempPasswordValue} selectable>{createdAccount.tempPassword}</Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => handleCopyPassword(createdAccount.tempPassword)}
        >
          {passwordCopied ? (
            <IconCheck size={14} color={colors.success} />
          ) : (
            <IconCopy size={14} color={colors.textSecondary} />
          )}
          <Text style={styles.copyButtonText}>
            {passwordCopied ? "Copié" : "Copier"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.tempPasswordHint}>
        La personne devra le changer à sa première connexion.
      </Text>
      <TouchableOpacity
        style={styles.tempPasswordDismiss}
        onPress={() => {
          setCreatedAccount(null);
          setPasswordCopied(false);
        }}
      >
        <Text style={styles.tempPasswordDismissText}>J'ai noté le mot de passe</Text>
      </TouchableOpacity>
    </View>
  );

  const pageContent = (
    <>
      {tempPasswordBanner}
      {page === "create"
        ? createPage
        : page === "accounts"
          ? accountsPage
          : page === "hospitals"
            ? hospitalsPage
            : adminsPage}
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
        onEdit={() => {
          setEditingAccountId(detailsAccountId);
          setDetailsAccountId(null);
        }}
      />
      <DialogEditAccount
        isVisible={!!editingAccountId}
        account={editableAccount}
        hospitalItems={hospitalItems}
        onClose={() => setEditingAccountId(null)}
        onSave={async (input) => {
          await adminStore.updateAccount(input);
          setEditingAccountId(null);
        }}
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
  tempPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  tempPasswordValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.success,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
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
  fieldNarrow: {
    width: 220,
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
    gap: spacing.lg,
    paddingBottom: spacing.sm,
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
    width: 200,
    minWidth: 0,
  },
  colPhone: {
    width: 150,
  },
  colRole: {
    width: 80,
  },
  colHospital: {
    width: 200,
  },
  colPatients: {
    width: 90,
    alignItems: "flex-start",
  },
  patientBadgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  colLastLogin: {
    width: 140,
  },
  colAction: {
    width: 120,
    alignItems: "flex-end",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: spacing.lg,
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
  patientBadge: {
    alignSelf: "flex-start",
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignItems: "center",
  },
  patientBadgeActive: {
    backgroundColor: colors.successSoft,
  },
  patientBadgeInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  patientBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  patientBadgeTextActive: {
    color: colors.success,
  },
  patientBadgeTextInactive: {
    color: colors.textMuted,
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
