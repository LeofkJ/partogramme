/**
 * Live operational view for admins — separate from the Admin panel's
 * account/hospital management, this is "what's happening right now."
 * Scoped by an optional hospitalId: the root admin picks a hospital (or
 * leaves it on "Tous les hôpitaux" for the aggregate + per-hospital
 * breakdown); a future hospital-level admin would land here pre-locked to
 * their own hospital with the picker hidden entirely.
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { observer } from "mobx-react";
import { rootStore } from "../../store/rootStore";
import { navigate } from "../../navigationRef";
import { CustomDropdown } from "../../components/Dialogs/CustomDropdown";
import { DialogSimpleList, SimpleListRow } from "../../components/Dialogs/DialogSimpleList";
import { PartogrammeSummary, loggedInRecently } from "../../store/admin/adminStore";
import { Partogramme_t } from "../../store/partogramme/partogrammeStore";
import { colors, spacing, radius } from "../../theme";
import { formatDateOnly } from "../../tools/StringUtilitary";

// Bordered box, same as the rest of the Admin panel's boxed content
// (dropdownButton, pageCard) — not the patient card's flat vitals-row style.
// Clickable: every count on this screen opens the rows behind it instead of
// being a dead end.
const StatItem = ({ label, value, onPress }: { label: string; value: React.ReactNode; onPress: () => void }) => (
  <TouchableOpacity style={styles.statBox} onPress={onPress} activeOpacity={0.6}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const StaffItem = ({ label, active, total, onPress }: { label: string; active: number; total: number; onPress: () => void }) => (
  <StatItem
    label={label}
    onPress={onPress}
    value={
      <>
        {active}
        <Text style={styles.statValueOfTotal}>/{total}</Text>
      </>
    }
  />
);

export const AdminDashboard: React.FC = observer(() => {
  const adminStore = rootStore.adminStore;
  const [hospitalId, setHospitalId] = useState("");
  const scope = hospitalId || null;

  // Live-ish without a manual refresh: the accounts/hospitals/partogrammes
  // data itself already polls every 30s at the Admin.tsx level (shared
  // across all tabs) — this just adds the vitals fetch on the same cadence,
  // since that's Dashboard-specific and nothing else needs it.
  useEffect(() => {
    adminStore.fetchDashboardVitals();
    const interval = setInterval(() => {
      adminStore.fetchDashboardVitals();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const census = adminStore.censusByState(scope);
  const throughput = adminStore.todayThroughput(scope);
  const staff = adminStore.staffSnapshot(scope);
  const attention = adminStore.needsAttention(scope);
  const breakdown = adminStore.hospitalBreakdown();

  const hospitalItems = [
    { label: "Tous les hôpitaux", value: "" },
    ...adminStore.hospitals.map((h) => ({ label: `${h.name}, ${h.city}`, value: h.id })),
  ];

  const hospitalName = (id: string | null) => adminStore.hospitals.find((h) => h.id === id)?.name ?? "—";

  const [detail, setDetail] = useState<{ title: string; rows: SimpleListRow[] } | null>(null);

  // Hydrates a real Partogramme instance in the shared partogrammeStore
  // from the admin's lightweight summary row, then opens the same Graph
  // screen nurses/doctors use — reuses the store's own find-or-create
  // logic instead of duplicating it. Read-only in practice: canEdit there
  // only turns on for NURSE/DOCTOR, and admin has no write RLS on any of
  // these tables anyway.
  const openPatientDetail = (p: PartogrammeSummary) => {
    const json: Partogramme_t["Row"] = {
      id: p.id,
      admissionDateTime: p.admissionDateTime,
      commentary: p.commentary,
      hospitalId: p.hospitalId,
      isDeleted: false,
      noFile: p.noFile,
      nurseId: p.nurseId,
      patientFirstName: p.patientFirstName,
      patientLastName: p.patientLastName,
      refDoctorId: p.refDoctorId,
      state: p.state as Partogramme_t["Row"]["state"],
      workFinishedDateTime: p.workFinishedDateTime,
      workStartDateTime: p.workStartDateTime,
    };
    rootStore.partogrammeStore.updatePartogrammeFromServer(json).then(() => {
      rootStore.partogrammeStore.updateSelectedPartogramme(p.id);
      setDetail(null);
      navigate("Screen_Graph");
    });
  };

  const patientRows = (patients: PartogrammeSummary[], showHospital = !scope): SimpleListRow[] =>
    patients.map((p) => ({
      key: p.id,
      primary: `${p.patientFirstName ?? "Sans prénom"} ${p.patientLastName ?? ""} · Dossier #${p.noFile}`,
      secondary: showHospital ? hospitalName(p.hospitalId) : undefined,
      onPress: () => openPatientDetail(p),
    }));

  const openPatients = (title: string, patients: PartogrammeSummary[]) => {
    setDetail({ title, rows: patientRows(patients) });
  };

  const openStaff = (title: string, role: "NURSE" | "DOCTOR") => {
    const rows: SimpleListRow[] = adminStore.staffList(role, scope).map((a) => {
      const lastLogin = adminStore.lastLoginByProfileId[a.profileId];
      const active = loggedInRecently(lastLogin);
      return {
        key: a.id,
        primary: `${a.firstName} ${a.lastName}`,
        secondary: !scope && a.hospitalId ? hospitalName(a.hospitalId) : undefined,
        status: {
          text: active
            ? "Connecté(e) récemment"
            : lastLogin
              ? `Dernière connexion le ${formatDateOnly(lastLogin)}`
              : "Jamais connecté(e)",
          tone: active ? "success" : "muted",
        },
      };
    });
    setDetail({ title, rows });
  };

  return (
    <View style={styles.pageCard}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>Tableau de bord</Text>
          <Text style={styles.pageSubtitle}>
            {scope ? "Vue d'un seul hôpital." : "Vue agrégée, tous hôpitaux confondus."}
          </Text>
        </View>
        <CustomDropdown
          items={hospitalItems}
          selectedValue={hospitalId}
          onValueChange={setHospitalId}
          placeholder="Tous les hôpitaux"
          buttonStyle={styles.dropdownButton}
          textStyle={styles.dropdownText}
          searchable
          searchPlaceholder="Rechercher un hôpital…"
          clearable
        />
      </View>

      <View style={[styles.section, styles.sectionFirst]}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>À surveiller</Text>
          {attention.length > 0 && (
            <Text style={styles.sectionCount}>
              {attention.length} alerte{attention.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
        {attention.length === 0 ? (
          <Text style={styles.emptyText}>Aucune patiente en alerte actuellement.</Text>
        ) : (
          attention.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.attentionRow}
              activeOpacity={0.6}
              onPress={() => openPatientDetail(p)}
            >
              <View style={styles.attentionInfo}>
                <Text style={styles.attentionName} numberOfLines={1}>
                  {p.patientFirstName ?? "Sans prénom"} {p.patientLastName ?? ""}
                </Text>
                <Text style={styles.attentionMeta} numberOfLines={1}>
                  Dossier #{p.noFile}{!scope ? ` · ${hospitalName(p.hospitalId)}` : ""}
                </Text>
              </View>
              <View style={styles.attentionValueBlock}>
                <Text style={styles.attentionValueNum}>{p.value}</Text>
                <Text style={styles.attentionValueUnit}>
                  {p.reason === "bpm" ? "bpm" : "cm"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patientes actuelles</Text>
        <View style={styles.statRow}>
          <StatItem
            label="Admis"
            value={census.ADMITTED}
            onPress={() => openPatients("Admis", adminStore.patientsInState("ADMITTED", scope))}
          />
          <StatItem
            label="En cours"
            value={census.IN_PROGRESS}
            onPress={() => openPatients("En cours", adminStore.patientsInState("IN_PROGRESS", scope))}
          />
          <StatItem
            label="Transféré"
            value={census.TRANSFERRED}
            onPress={() => openPatients("Transféré", adminStore.patientsInState("TRANSFERRED", scope))}
          />
          <StatItem
            label="Terminé"
            value={census.WORK_FINISHED}
            onPress={() => openPatients("Terminé", adminStore.patientsInState("WORK_FINISHED", scope))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aujourd'hui</Text>
        <View style={styles.statRow}>
          <StatItem
            label="Admissions"
            value={throughput.admittedToday}
            onPress={() => openPatients("Admissions aujourd'hui", adminStore.patientsAdmittedToday(scope))}
          />
          <StatItem
            label="Sorties"
            value={throughput.finishedToday}
            onPress={() => openPatients("Sorties aujourd'hui", adminStore.patientsFinishedToday(scope))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personnel</Text>
        <View style={styles.statRow}>
          <StaffItem
            label="Infirmières connectées (24h)"
            active={staff.activeNurses}
            total={staff.totalNurses}
            onPress={() => openStaff("Infirmières", "NURSE")}
          />
          <StaffItem
            label="Médecins connectés (24h)"
            active={staff.activeDoctors}
            total={staff.totalDoctors}
            onPress={() => openStaff("Médecins", "DOCTOR")}
          />
        </View>
      </View>

      {!scope && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par hôpital</Text>
          <View style={styles.breakdownHeaderRow}>
            <Text style={[styles.breakdownHeaderText, styles.colHospitalName]} />
            <Text style={[styles.breakdownHeaderText, styles.colActive]}>Patientes actives</Text>
            <Text style={[styles.breakdownHeaderText, styles.colStat]}>Personnel connecté (24h)</Text>
          </View>
          {breakdown.map(({ hospital, census: hCensus, staff: hStaff }) => {
            const active = hCensus.ADMITTED + hCensus.IN_PROGRESS + hCensus.TRANSFERRED;
            const activePatients = adminStore.partogrammes.filter(
              (p) => p.hospitalId === hospital.id && p.state !== "WORK_FINISHED",
            );
            return (
              <TouchableOpacity
                key={hospital.id}
                style={styles.breakdownRow}
                activeOpacity={0.6}
                onPress={() => setDetail({ title: `Patientes actives — ${hospital.name}`, rows: patientRows(activePatients, false) })}
              >
                <Text style={[styles.colHospitalName, styles.hospitalNameText]} numberOfLines={1}>
                  {hospital.name}
                </Text>
                <Text style={[styles.breakdownCell, styles.colActive]}>{active}</Text>
                <Text style={[styles.breakdownCell, styles.colStat]}>
                  {hStaff.activeNurses + hStaff.activeDoctors}/{hStaff.totalNurses + hStaff.totalDoctors}
                </Text>
              </TouchableOpacity>
            );
          })}
          {breakdown.length === 0 && (
            <Text style={styles.emptyText}>Aucun hôpital pour le moment</Text>
          )}
        </View>
      )}

      <DialogSimpleList
        isVisible={!!detail}
        title={detail?.title ?? ""}
        rows={detail?.rows ?? []}
        emptyText="Aucun résultat"
        onClose={() => setDetail(null)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  pageCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    minWidth: 200,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  sectionFirst: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // ---- À surveiller: the abnormal reading is the biggest, boldest thing
  // in the box — a real vitals-readout number, not a small pill — so it
  // reads as urgent from size/weight alone, not color. Holds up on cheap
  // screens, in direct sunlight, and for colorblind readers, none of which
  // a color-only signal survives. Same bordered-box recipe as the stat
  // cards below and the popup rows, so a patient in an alert reads as a
  // distinct, contained item rather than floating text. ----
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  attentionInfo: {
    flex: 1,
    minWidth: 0,
  },
  attentionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  attentionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  attentionValueBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  attentionValueNum: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.danger,
    lineHeight: 20,
  },
  attentionValueUnit: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.danger,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // ---- stat boxes — same border/radius/background as dropdownButton and
  // the rest of the Admin panel's boxed content ----
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statBox: {
    minWidth: 92,
    flexGrow: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  statValueOfTotal: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ---- per-hospital breakdown ----
  breakdownHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  breakdownCell: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
  },
  colHospitalName: {
    flex: 1.4,
    minWidth: 0,
  },
  hospitalNameText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.text,
  },
  colActive: {
    flex: 1,
    paddingRight: spacing.md,
  },
  colStat: {
    width: 84,
    textAlign: "right",
  },
});
