import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  InteractionManager,
  TouchableOpacity,
} from "react-native";
import { observer } from "mobx-react";
import DialogDataInputGraph from "../../components/Dialogs/DialogDataInputGraph";
import { useEffect, useRef, useState } from "react";
import BabyGraph from "../../components/Graphs/BabyGraph";
import { rootStore } from "../../store/rootStore";
import DilationGraph from "../../components/Graphs/DilationGraph";
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
import DataTable from "../../components/Tables/DataTable";
import DialogDataInputTable, {
  DataInputTable_t,
  DataInputEntry,
} from "../../components/Dialogs/DialogDataInputTable";
import { AmnioticLiquidStore } from "../../store/TableData/AmnioticLiquid/amnioticLiquidStore";
import { Database } from "../../../types/supabase";
import { MotherSystolicBloodPressureStore } from "../../store/TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore";
import { MotherContractionsFrequencyStore } from "../../store/TableData/MotherContractionsFrequency/motherContractionsFrequencyStore";
import { MotherHeartFrequencyStore } from "../../store/TableData/MotherHeartFrequency/motherHeartFrequencyStore";
import { MotherTemperatureStore } from "../../store/TableData/MotherTemperature/motherTemperatureStore";
import ErrorDialog from "../../components/Dialogs/ErrorDialog";
import { IconPencil, IconMaternity, IconAlertTriangle } from "../../components/Icons";
import { getDilationBand, isBpmAlert, TimedReading } from "../../lib/clinicalAlerts";
import { callPhone } from "../../lib/callPhone";
import CustomButton from "../../components/CustomButton";
import DataModifierDialog from "../../components/DataModifierDialog";
import EditDataDialog from "../../components/Dialogs/EditDataDialog";
import { MotherDiastolicBloodPressureStore } from "../../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore";
import { MotherContractionDurationStore } from "../../store/TableData/MotherContractionDuration/motherContractionDurationStore";
import { dataStore_t } from "../../store/partogramme/partogrammeStore";
import { CommentsSlider } from "../../components/CommentsSlider";
import { DialogEditText } from "../../components/Dialogs/DialogEditText";
import { formatDateOnly, formatTimeOnly } from "../../lib/stringUtils";
import { getStringByEnum, partogrammeStates } from "../../../types/constants";
import { DialogConfirm } from "../../components/Dialogs/DialogConfirm";
import { DialogTransferPatient } from "../../components/Dialogs/DialogTransferPatient";
import { DialogReassignPatient } from "../../components/Dialogs/DialogReassignPatient";
import { DialogRaiseAlert } from "../../components/Dialogs/DialogRaiseAlert";
import { DialogMaternityAlerts } from "../../components/Dialogs/DialogMaternityAlerts";
import { DialogHospitalAlerts } from "../../components/Dialogs/DialogHospitalAlerts";
import { logger } from "../../lib/logger";
import { notify } from "../../lib/notify";
import { colors, spacing, radius, layout, statusColors } from "../../theme";

export type Props = {
  navigation: any;
};

export const ScreenGraph: React.FC<Props> = observer(({ navigation }) => {
  const [isReady, setIsReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFcDialogVisible, setFcDialogVisible] = useState(false);
  const [isDilationDialogVisible, setDilationDialogVisible] = useState(false);
  const [isDescentBabyDialogVisible, setDescentBabyDialogVisible] =
    useState(false);
  const [isAddTableDataDialogVisible, setAddTableDataDialogVisible] =
    useState(false);
  const [isDataModifierDialogVisible, setDataModifierDialogVisible] =
    useState(false);
  const [dataModifierStores, setDataModifierStores] = useState<dataStore_t[]>([]);
  const [dataModifierGroupByRow, setDataModifierGroupByRow] = useState(false);
  const [isAddCommentDialogVisible, setAddCommentDialogVisible] =
    useState(false);
  const [isChangeStateDialogVisible, setChangeStateDialogVisible] =
    useState(false);
  const [isTransferDialogVisible, setTransferDialogVisible] = useState(false);
  const [isReassignDialogVisible, setReassignDialogVisible] = useState(false);
  const [isRaiseAlertDialogVisible, setRaiseAlertDialogVisible] = useState(false);
  const [isMaternityAlertsExpanded, setMaternityAlertsExpanded] = useState(false);
  // Hospital-side twin of the maternity dropdown above, but scoped to just
  // this one patient — she's already the chart he's looking at, so there's
  // no cross-patient list to jump from the way maternity's ALERTE button
  // needs (that's what HospitalDashboard's own list is for).
  const [isHospitalAlertsExpanded, setHospitalAlertsExpanded] = useState(false);
  const [hospitalAlerts, setHospitalAlerts] = useState<{ id: string; comment: string; createdAt: string }[]>([]);
  const [hospitalAlertsState, setHospitalAlertsState] = useState<"pending" | "done" | "error">("pending");
  const [isPullBackDialogVisible, setPullBackDialogVisible] = useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newState, setNewState] = useState("");
  const [editingTableItem, setEditingTableItem] = useState<any>(null);
  const [addTableDataPreselected, setAddTableDataPreselected] = useState<DataInputTable_t | undefined>(undefined);
  const [addTableDataTargetHour, setAddTableDataTargetHour] = useState<number | null>(null);
  const [assignedNurse, setAssignedNurse] = useState<{ name: string; phone: string | null; isMaternityNurse: boolean } | null>(null);

  const partogramme = rootStore.partogrammeStore.selectedPartogramme;
  // A web page refresh wipes all in-memory state (partogrammeList, the
  // selection) but the login session and *which* partogramme id was
  // selected both survive it (persisted storage). So instead of instantly
  // bouncing out when nothing's selected yet, try to recover first — only
  // give up if that recovery genuinely fails (e.g. really logged out).
  const [isRecoveringSelection, setIsRecoveringSelection] = useState(true);

  useEffect(() => {
    if (partogramme !== undefined) {
      setIsRecoveringSelection(false);
      return;
    }
    rootStore.userInfoStore
      .fetchUserInfo()
      .then(() => {
        const fetch =
          rootStore.userInfoStore.userInfo.role === "NURSE"
            ? rootStore.partogrammeStore.fetchFromServer(rootStore.profileStore.profile.id)
            : rootStore.partogrammeStore.fetchFromServer();
        return fetch;
      })
      .then(() => {
        // The recovered partogramme's own graphs/tables/comments still need
        // their own load — the mount effect already ran once with nothing
        // selected, so it never fetched any of this.
        if (rootStore.partogrammeStore.selectedPartogramme !== undefined) {
          fetchData();
        }
      })
      .catch((error) => {
        logger.warn("Graph: selection recovery failed", { error: error?.message });
        notify.error("Erreur", "Impossible de charger cette patiente. Vérifiez votre connexion et réessayez.");
      })
      .finally(() => setIsRecoveringSelection(false));
  }, []);

  useEffect(() => {
    if (!isRecoveringSelection && partogramme === undefined) {
      navigation.goBack();
    }
  }, [isRecoveringSelection, partogramme, navigation]);

  // Role and status helpers
  const userRole = rootStore.userInfoStore.userInfo.role;
  const status = partogramme?.partogramme.state;
  const isNurse = userRole === "NURSE";
  const isDoctor = userRole === "DOCTOR";
  const isMaternityNurse = isNurse && rootStore.userInfoStore.userInfo.nurseType === "MATERNITY";
  // Gv: hospital = every doctor and nurse at that hospital, same powers.
  const isHospitalStaff = isDoctor || (isNurse && !isMaternityNurse);

  // Hospitals the admin has explicitly assigned to the maternity nurse's
  // own maternity (hospitalMaternityLink) — the transfer/reassign dialogs'
  // target list. The maternity's "default hospital" (admin-set, see
  // Admin.tsx) is folded into this same list even if it isn't separately
  // linked, and pre-fills the picker — but the choice itself stays
  // restricted to what the admin assigned, not every hospital in the system.
  const ownMaternity = rootStore.userInfoStore.maternities.find(
    (m) => m.id === rootStore.userInfoStore.userInfo.maternityId,
  );
  const defaultHospitalId = ownMaternity?.defaultHospitalId ?? null;
  const linkedHospitalIds = new Set(
    rootStore.userInfoStore.hospitalMaternityLinks
      .filter((l) => l.maternityId === ownMaternity?.id)
      .map((l) => l.hospitalId),
  );
  if (defaultHospitalId) linkedHospitalIds.add(defaultHospitalId);
  const transferHospitalItems = rootStore.userInfoStore.hospitals
    .filter((h) => linkedHospitalIds.has(h.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((h) => ({ label: `${h.name}, ${h.city}`, value: h.id }));

  // Both graphs' shared clock — the first vital sign actually recorded for
  // this patient (dilation, descent, or BPM, whichever came first), not
  // workStartDateTime/patient creation. Falls back to workStartDateTime
  // only when there's no data yet to anchor on (a fresh chart with nothing
  // plotted has nothing else to zero against).
  const bpmList = rootStore.partogrammeStore.selectedPartogramme?.babyHeartFrequencyStore.sortedBabyHeartFrequencyList ?? [];
  const allReadingTimes = [
    ...(partogramme?.dilationStore.sortedDilationList ?? []).map((p) => p.data.created_at),
    ...(partogramme?.babyDescentStore.sortedBabyDescentList ?? []).map((p) => p.data.created_at),
    ...bpmList.map((p) => p.data.created_at),
  ];
  const chartStartTime = allReadingTimes.length > 0
    ? allReadingTimes.reduce((min, t) => (new Date(t).getTime() < new Date(min).getTime() ? t : min))
    : partogramme?.asJson.workStartDateTime ?? null;

  // Whether THIS patient is currently flagged — previously only visible
  // from a list screen (Menu, HospitalDashboard) or the maternity-wide
  // ALERTE dropdown, never on her own chart, which is exactly where
  // someone already looking at her data needs to see it. Same three
  // checks every other flagged-patient view uses (isPatientFlagged).
  const [currentPatientManualAlerts, setCurrentPatientManualAlerts] = useState<
    { id: string; comment: string; createdAt: string }[]
  >([]);
  const fetchCurrentPatientManualAlerts = () => {
    if (!partogramme) return;
    rootStore.partogrammeStore.transportLayer
      .fetchManualAlerts([partogramme.asJson.id])
      .then((rows) => {
        setCurrentPatientManualAlerts(rows.map((r) => ({ id: r.id, comment: r.comment, createdAt: r.createdAt })));
      })
      .catch((error: any) => {
        logger.warn("Graph: fetchManualAlerts (banner) failed", { error: error?.message });
      });
  };
  useEffect(fetchCurrentPatientManualAlerts, [partogramme?.asJson.id]);

  const currentPatientLatestBpm = bpmList.reduce<TimedReading | null>((latest, p) => {
    if (!latest || new Date(p.data.created_at) > new Date(latest.created_at)) {
      return { value: p.data.value, created_at: p.data.created_at };
    }
    return latest;
  }, null);
  const currentPatientDilationReadings: TimedReading[] = (partogramme?.dilationStore.sortedDilationList ?? [])
    .map((p) => ({ value: p.data.value, created_at: p.data.created_at }));
  const currentPatientDilationBand = getDilationBand(
    currentPatientDilationReadings,
    partogramme?.asJson.workStartDateTime ?? null,
  );
  const currentPatientBpmAlert =
    currentPatientLatestBpm != null && isBpmAlert(currentPatientLatestBpm.value) ? currentPatientLatestBpm : null;
  const currentPatientFlag = currentPatientManualAlerts.length > 0
    ? { reason: "manual" as const, text: "Alerte manuelle", comment: currentPatientManualAlerts[0].comment }
    : currentPatientBpmAlert
    ? {
        reason: "bpm" as const,
        text: `${currentPatientBpmAlert.value} bpm · ${currentPatientBpmAlert.value < 100 ? "bradycardie" : "tachycardie"}`,
        comment: null,
      }
    : currentPatientDilationBand === "red"
    ? { reason: "dilation" as const, text: "Dilatation · bande rouge", comment: null }
    : null;

  // A hospital's own patient — false for a linked maternity's
  // not-yet-transferred patient (hospitalId is null there), which is what
  // makes those charts read-only for hospital staff below.
  const isOwnHospitalPatient =
    !!partogramme?.asJson.hospitalId &&
    partogramme.asJson.hospitalId === rootStore.userInfoStore.userInfo.hospitalId;

  // Maternity nurse edits while labour is EN COURS at her centre. Hospital
  // staff (doctor or hospital nurse — same rule) edit only after the
  // patient is actually TRANSFERRED to their hospital. Linked-maternity
  // charts stay read-only until then.
  const canEdit =
    (isMaternityNurse && status === "IN_PROGRESS") ||
    (isHospitalStaff && isOwnHospitalPatient && status === "TRANSFERRED");

  // If hospital staff is sitting on this patient's chart and she gets
  // pulled back to her maternity (RÉCUPÉRER) or reassigned to a different
  // hospital out from under them — from another device, another tab,
  // whatever — isOwnHospitalPatient flips false on the next realtime/poll
  // sync (see the fetchPartogrammeById polling effect below) while they're
  // still looking at it. Kick them back out rather than leaving them
  // stranded on a chart that's no longer theirs to act on. Only fires on
  // an actual true->false transition, not on first load — a hospital
  // nurse opening a linked-maternity candidate's read-only chart (never
  // "own" to begin with) shouldn't get bounced immediately.
  const wasOwnHospitalPatientRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isHospitalStaff || !partogramme) return;
    if (wasOwnHospitalPatientRef.current === true && !isOwnHospitalPatient) {
      notify.error("Patiente reprise", "Cette patiente n'est plus à votre hôpital.");
      navigation.navigate("Screen_Menu");
    }
    wasOwnHospitalPatientRef.current = isOwnHospitalPatient;
  }, [isHospitalStaff, isOwnHospitalPatient, partogramme]);

  // Hospital staff looking up which nurse is responsible for this patient,
  // via the partogramme's nurseId (the nurse's own profileId).
  const nurseId = partogramme?.asJson.nurseId;
  useEffect(() => {
    if (!isHospitalStaff || !nurseId) {
      setAssignedNurse(null);
      return;
    }
    rootStore.userInfoStore
      .fetchOtherUserInfo(nurseId)
      .then((nurse) => {
        if (!nurse) return;
        setAssignedNurse({
          name: `${nurse.firstName} ${nurse.lastName}`,
          phone: nurse.phone,
          isMaternityNurse: nurse.nurseType === "MATERNITY",
        });
      })
      .catch((error: any) => {
        logger.warn("Graph: fetchOtherUserInfo (nurse lookup) failed", { nurseId, error: error?.message });
      });
  }, [isHospitalStaff, nurseId]);

  const fetchHospitalAlerts = () => {
    if (!partogramme) return;
    setHospitalAlertsState("pending");
    rootStore.partogrammeStore.transportLayer
      .fetchManualAlerts([partogramme.asJson.id])
      .then((rows) => {
        setHospitalAlerts(rows.map((r) => ({ id: r.id, comment: r.comment, createdAt: r.createdAt })));
        setHospitalAlertsState("done");
      })
      .catch((error: any) => {
        logger.warn("Graph: fetchManualAlerts (hospital) failed", { error: error?.message });
        setHospitalAlertsState("error");
      });
  };

  const deleteHospitalAlert = (alertId: string) => {
    rootStore.partogrammeStore.transportLayer
      .deleteManualAlert(alertId)
      .then(() => {
        setHospitalAlerts((prev) => prev.filter((a) => a.id !== alertId));
        fetchCurrentPatientManualAlerts();
      })
      .catch((error: any) => {
        logger.warn("Graph: deleteManualAlert (hospital) failed", { error: error?.message });
      });
  };

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      fetchData();
      setTimeout(() => setIsReady(true), 1);
    });
    // Stop listening for live updates on this partogramme once we leave —
    // otherwise every visit leaves its realtime subscriptions running forever.
    // (This only tears down the subscription, not the loaded data itself.)
    // Looked up fresh (not the `partogramme` closed over at mount) since a
    // page-refresh recovery can select it well after this effect ran.
    return () => {
      const current = rootStore.partogrammeStore.selectedPartogramme;
      if (current === undefined) return;
      current.babyHeartFrequencyStore.stopRealtimeSync();
      current.babyDescentStore.stopRealtimeSync();
      current.dilationStore.stopRealtimeSync();
      current.motherSystolicBloodPressureStore.stopRealtimeSync();
      current.motherDiastolicBloodPressureStore.stopRealtimeSync();
      current.motherContractionFrequencyStore.stopRealtimeSync();
      current.motherContractionDurationStore.stopRealtimeSync();
      current.motherTemperatureStore.stopRealtimeSync();
      current.motherHeartRateFrequencyStore.stopRealtimeSync();
      current.amnioticLiquidStore.stopRealtimeSync();
      current.commentStore.stopRealtimeSync();
    };
  }, []);

  // Keeps this patient's own record (state, transferRequest*) fresh while
  // the screen sits open — needed on top of realtime because the
  // Partogramme realtime subscription (partogrammeStore.ts) filters on the
  // viewer's own hospitalId, which a not-yet-transferred maternity patient
  // doesn't have and a maternity nurse never has at all. Without this, a
  // doctor whose transfer request just got rejected keeps seeing "DEMANDE
  // ENVOYÉE" (button stuck disabled, can't re-request) until they leave and
  // come back — and a stale transferRequestStatus on either side can make a
  // genuine accept/reject fail with "already decided" because the row it's
  // conditioned on server-side has already moved on.
  const partogrammeId = partogramme?.asJson.id;
  useEffect(() => {
    if (!partogrammeId) return;
    const interval = setInterval(() => {
      rootStore.transportLayer
        .fetchPartogrammeById(partogrammeId)
        .then((row) => {
          if (row) rootStore.partogrammeStore.updatePartogrammeFromServer(row);
        })
        .catch((error: any) => {
          logger.warn("Graph: refreshSelectedPartogramme failed", { error: error?.message });
        });
    }, 18000);
    return () => clearInterval(interval);
  }, [partogrammeId]);

  // Each createX below rejects out-of-range values by calling notify.error
  // and returning nothing (no thrown error, no rejected promise) — so
  // without checking the result, this dialog would close as if the value
  // had been saved even when it silently wasn't. Only close on a truthy
  // result (validation passed); a rejected value leaves the dialog open
  // with the value still in the field so it can be corrected.
  const onDialogCloseAddFcBaby = async (data: string) => {
    if (!partogramme) return false;
    const result = await partogramme.babyHeartFrequencyStore.createBabyHeartFrequency(
      Number(data),
      new Date().toISOString(),
      0,
    );
    if (!result) return false;
    setFcDialogVisible(false);
    return true;
  };

  const onDialogCloseAddDilation = async (data: string) => {
    if (!partogramme) return false;
    const result = partogramme.dilationStore.createDilation(
      new Date().toISOString(),
      Number(data),
      0,
    );
    if (!result) return false;
    setDilationDialogVisible(false);
    return true;
  };

  const onDialogCloseAddDescentBaby = async (data: string) => {
    if (!partogramme) return false;
    const result = partogramme.babyDescentStore.createBabyDescent(
      Number(data),
      new Date().toISOString(),
      0,
    );
    if (!result) return false;
    setDescentBabyDialogVisible(false);
    return true;
  };

  const onDialogCloseAddDataTable = async (entries: DataInputEntry[]) => {
    if (partogramme === null || entries.length === 0) {
      notify.error(
        "Code Error : Unknown data store type. \n contact the administrator",
      );
      return false;
    }
    // Table rows are 1-minute slots — same field in the same minute
    // overwrites the cell; a new minute starts a new row.
    const currentSlotRank = Math.floor(
      (Date.now() - new Date(partogramme!.asJson.workStartDateTime!).getTime()) / (60 * 1000)
    );
    // Each createX/update below rejects an out-of-range value by calling
    // notify.error and returning nothing (no thrown error, no rejected
    // promise) — so without checking the outcome of every entry, this
    // dialog would close (and show "Ajouté") even when one silently
    // wasn't saved. Only close once every entry in this submission is
    // actually confirmed; otherwise the dialog stays open with the
    // values still in the fields so the rejected one can be fixed.
    let allAccepted = true;
    for (const { dataStore, value: data } of entries) {
      const rank = addTableDataTargetHour ?? currentSlotRank;
      // This field already has a value in the row it would land in — update
      // it instead of creating a second entry at the same rank, which the
      // table can't display anyway (one value per cell) and would just sit
      // there invisibly piling up.
      const existing = (dataStore.dataList as any[]).find((item) => item.data.Rank === rank);
      if (existing) {
        try {
          await existing.update(data);
        } catch (error: any) {
          logger.warn("Graph: table cell update (existing row) failed", { error: error?.message });
          notify.error("Erreur", error.message);
          allAccepted = false;
        }
        continue;
      }
      let result: unknown;
      try {
        if (dataStore instanceof AmnioticLiquidStore) {
          result = await dataStore.createAmnioticLiquid(
            new Date().toISOString(),
            rank,
            data as Database["public"]["Enums"]["LiquidState"],
          );
        } else if (dataStore instanceof MotherSystolicBloodPressureStore) {
          result = dataStore.createNew(Number(data), new Date().toISOString(), rank);
        } else if (dataStore instanceof MotherDiastolicBloodPressureStore) {
          result = dataStore.createNew(Number(data), new Date().toISOString(), rank);
        } else if (dataStore instanceof MotherContractionsFrequencyStore) {
          result = dataStore.createMotherContractionsFrequency(Number(data), new Date().toISOString(), rank);
        } else if (dataStore instanceof MotherContractionDurationStore) {
          result = await dataStore.createData({
            value: Number(data),
            created_at: new Date().toISOString(),
            Rank: rank,
          });
        } else if (dataStore instanceof MotherHeartFrequencyStore) {
          result = dataStore.createMotherHeartFrequency(Number(data), new Date().toISOString(), rank);
        } else if (dataStore instanceof MotherTemperatureStore) {
          result = dataStore.createMotherTemperature(Number(data), new Date().toISOString(), rank);
        }
      } catch (error: any) {
        logger.warn("Graph: table cell create failed", { error: error?.message });
        notify.error("Erreur", error?.message ?? "Impossible d'ajouter cette valeur.");
        result = undefined;
      }
      if (!result) allAccepted = false;
    }
    if (allAccepted) {
      setAddTableDataDialogVisible(false);
      setAddTableDataPreselected(undefined);
      setAddTableDataTargetHour(null);
    }
    return allAccepted;
  };

  const onDialogCloseAddComment = (comment: string) => {
    if (partogramme === null) return;
    partogramme?.commentStore
      .createData({
        value: comment,
        created_at: new Date().toISOString(),
      })
      .catch((error) => {
        logger.warn("Graph: createData (comment) failed", { error: error?.message });
        setErrorMsg(error.message);
        setErrorCode(error.code);
        setIsErrorDialogVisible(true);
      });
    setAddCommentDialogVisible(false);
  };

  const openAddCommentDialog = () => setAddCommentDialogVisible(true);
  const openFcDialog = () => setFcDialogVisible(true);
  const openDilationDialog = () => setDilationDialogVisible(true);
  const openDescentBabyDialog = () => setDescentBabyDialogVisible(true);
  const openAddDataTable = () => {
    setAddTableDataPreselected(undefined);
    setAddTableDataTargetHour(null);
    setAddTableDataDialogVisible(true);
  };
  const openAddDataTableForCell = (store: DataInputTable_t, hour: number) => {
    setAddTableDataPreselected(store);
    setAddTableDataTargetHour(hour);
    setAddTableDataDialogVisible(true);
  };

  const fetchData = () => {
    // Looked up fresh rather than using the outer `partogramme` const, so
    // this still works when called after a page-refresh recovery selects
    // the partogramme later than this closure was created.
    const current = rootStore.partogrammeStore.selectedPartogramme;
    if (current === undefined) return Promise.resolve();
    return Promise.allSettled([
      current.babyHeartFrequencyStore.loadBabyHeartFrequencies(),
      current.babyDescentStore.loadBabyDescents(),
      current.dilationStore.loadDilations(),
      current.motherSystolicBloodPressureStore.loadData(),
      current.motherDiastolicBloodPressureStore.loadData(),
      current.motherContractionFrequencyStore.loadMotherContractionsFrequencies(),
      current.motherContractionDurationStore.load(),
      current.motherTemperatureStore.loadMotherTemperatures(),
      current.motherHeartRateFrequencyStore.loadMotherHeartFrequencies(),
      current.amnioticLiquidStore.loadAmnioticLiquids(),
      current.commentStore.load(),
    ]).then((results) => {
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        logger.warn("Graph: fetchData had failures", { count: failures.length });
        notify.error("Erreur", "Certaines données n'ont pas pu être chargées. Tirez pour rafraîchir.");
      }
      return results;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  if (partogramme === undefined) {
    return null;
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  } else {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollViewContentStyle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          <Text style={styles.patientTitleLabel}>Partogramme</Text>
          <Text style={styles.patientTitle}>
            Dossier #{partogramme?.asJson.noFile}
          </Text>

          {currentPatientFlag && (
            <View style={styles.currentAlertBanner}>
              <IconAlertTriangle size={16} color={colors.danger} />
              <View style={styles.currentAlertTextBlock}>
                <Text style={styles.currentAlertText} numberOfLines={1}>
                  {currentPatientFlag.text}
                </Text>
                {!!currentPatientFlag.comment && (
                  <Text style={styles.currentAlertComment} numberOfLines={2}>
                    {currentPatientFlag.comment}
                  </Text>
                )}
              </View>
            </View>
          )}

          <DialogRaiseAlert
            isVisible={isRaiseAlertDialogVisible}
            onClose={() => setRaiseAlertDialogVisible(false)}
            onSubmit={(comment) =>
              isMaternityNurse
                ? rootStore.maternityAlertsStore.addAlert(partogramme!.asJson.id, comment).then(() => {
                    setRaiseAlertDialogVisible(false);
                    fetchCurrentPatientManualAlerts();
                  })
                : rootStore.partogrammeStore.transportLayer
                    .createManualAlert(partogramme!.asJson.id, comment)
                    .then(() => {
                      setRaiseAlertDialogVisible(false);
                      fetchHospitalAlerts();
                      fetchCurrentPatientManualAlerts();
                    })
            }
          />

          <View style={{ marginTop: 5, width: "95%" }}>
            <View
              style={[
                { paddingTop: 5, paddingBottom: 5, alignContent: "center" },
                styles.backGroundInfo,
              ]}
            >
              <View style={{ flexDirection: "row" }}>
                <Text style={[styles.infoTitleText, { padding: 2 }]}>
                  Statut :{" "}
                </Text>
                <Text
                  style={[
                    styles.infoText,
                    {
                      backgroundColor: statusColors(partogramme!.asJson.state).bg,
                      color: statusColors(partogramme!.asJson.state).fg,
                      fontWeight: "600",
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                      overflow: "hidden",
                    },
                  ]}
                >
                  {getStringByEnum(
                    partogrammeStates,
                    partogramme?.asJson.state,
                  )}
                </Text>
              </View>
              <Text style={[styles.infoTitleText, { padding: 2 }]}>
                Mise à jour du statut :{" "}
              </Text>
              <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", width: "100%", gap: 5 }}>
                {/* EN COURS — maternity nurse, or hospital nurse on a
                    leftover patient already at her hospital. Not for a
                    hospital nurse browsing a linked maternity chart. */}
                {(isMaternityNurse || (isNurse && isOwnHospitalPatient)) && (
                  <TouchableOpacity
                    disabled={partogramme!.asJson.state !== "ADMITTED"}
                    onPress={() => {
                      setNewState("IN_PROGRESS");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                      opacity:
                        partogramme!.asJson.state === "ADMITTED" ? 1 : 0.4,
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"EN COURS"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* TRANSFERÉ — hospital nurse only, on a patient already
                    at her hospital. Not for maternity nurses (they use
                    "Transférer" below) and not for a linked maternity's
                    not-yet-transferred patient (read-only + Demander). */}
                {isNurse && !isMaternityNurse && isOwnHospitalPatient && (
                  <TouchableOpacity
                    disabled={partogramme!.asJson.state !== "IN_PROGRESS"}
                    activeOpacity={0.2}
                    onPress={() => {
                      setNewState("TRANSFERRED");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                      opacity:
                        partogramme!.asJson.state === "IN_PROGRESS" ? 1 : 0.4,
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"TRANSFERÉ"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* RÉCLAMER — doctor only, before TRANSFERRED at HER OWN
                    hospital, or on an unclaimed TRANSFERRED patient (a
                    maternity referral that arrived with no refDoctorId yet
                    — see MATERNITY_TRANSFER_PLAN.md). Lets a doctor pull a
                    patient under her care directly (e.g. during rounds)
                    instead of waiting on the nurse to push it via
                    TRANSFERÉ. Both lead to the same TRANSFERRED state;
                    changeState sets refDoctorId either way, so tapping this
                    on an already-TRANSFERRED referral is what actually
                    claims it. Gated to isOwnHospitalPatient for the
                    ADMITTED/IN_PROGRESS branch — now that doctors can also
                    browse a linked maternity's not-yet-transferred patients
                    (see task.md), this must not let her self-claim one
                    directly; DEMANDER UN TRANSFERT below is the only path
                    for those. */}
                {isDoctor &&
                  ((isOwnHospitalPatient && (status === "ADMITTED" || status === "IN_PROGRESS")) ||
                    (status === "TRANSFERRED" && !partogramme!.asJson.refDoctorId)) && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => {
                      setNewState("TRANSFERRED");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"RÉCLAMER"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Demander un transfert — hospital staff viewing a linked
                    maternity's not-yet-transferred patient (read-only
                    chart). Same action as the dashboard "Demander" button. */}
                {isHospitalStaff &&
                  !isOwnHospitalPatient &&
                  (status === "ADMITTED" || status === "IN_PROGRESS") && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    disabled={!!partogramme!.asJson.transferRequestHospitalId}
                    onPress={() => {
                      partogramme!
                        .requestTransfer(
                          rootStore.userInfoStore.userInfo.hospitalId as string,
                          rootStore.profileStore.profile.id,
                        )
                        .catch((error: any) => {
                          logger.warn("Graph: requestTransfer failed", { error: error?.message });
                        });
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: partogramme!.asJson.transferRequestHospitalId
                        ? colors.surfaceMuted
                        : colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[
                        styles.infoText,
                        {
                          padding: 2,
                          color: partogramme!.asJson.transferRequestHospitalId
                            ? colors.textMuted
                            : "white",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {partogramme!.asJson.transferRequestHospitalId ? "DEMANDE ENVOYÉE" : "DEMANDER UN TRANSFERT"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Transférer — maternity nurse only, before TRANSFERRED.
                    Sends the patient to a hospital in her region (see
                    MATERNITY_TRANSFER_PLAN.md). */}
                {isMaternityNurse && (status === "ADMITTED" || status === "IN_PROGRESS") && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => setTransferDialogVisible(true)}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"TRANSFÉRER"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Réassigner — the maternity nurse who originally created
                    this patient, once already transferred: wrong claim, or
                    a straight Hospital A -> Hospital B change (see
                    MATERNITY_HOSPITAL_WORKFLOW_PLAN.md). Not shown to other
                    midwives at the same maternity — RLS scopes this update
                    to the original nurseId regardless. */}
                {isMaternityNurse
                  && status === "TRANSFERRED"
                  && partogramme!.asJson.nurseId === rootStore.profileStore.profile.id
                  && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => setReassignDialogVisible(true)}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"RÉASSIGNER"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Récupérer — same eligibility as Réassigner, but pulls the
                    patient all the way back to her own maternity instead of
                    moving her to a different hospital. Works even if a
                    doctor already claimed her — the midwife keeps override
                    authority (explicit user decision, see
                    MATERNITY_HOSPITAL_WORKFLOW_PLAN.md). */}
                {isMaternityNurse
                  && status === "TRANSFERRED"
                  && partogramme!.asJson.nurseId === rootStore.profileStore.profile.id
                  && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => setPullBackDialogVisible(true)}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"RÉCUPÉRER"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* TERMINÉ — same gate as canEdit: midwife while EN COURS,
                    hospital staff once TRANSFERRED to their hospital. */}
                {canEdit && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => {
                      setNewState("WORK_FINISHED");
                      setChangeStateDialogVisible(true);
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.accent,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: "white" }]}
                      numberOfLines={1}
                    >
                      {"TERMINÉ"}
                    </Text>
                  </TouchableOpacity>
                )}

                {isMaternityNurse && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => {
                      setMaternityAlertsExpanded(true);
                      rootStore.maternityAlertsStore.fetchAlerts();
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.dangerSoft,
                      borderWidth: 1,
                      borderColor: colors.danger,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: colors.danger, fontWeight: "600" }]}
                      numberOfLines={1}
                    >
                      {"ALERTE"}
                    </Text>
                  </TouchableOpacity>
                )}

                {isHospitalStaff && isOwnHospitalPatient && (
                  <TouchableOpacity
                    activeOpacity={0.2}
                    onPress={() => {
                      setHospitalAlertsExpanded(true);
                      fetchHospitalAlerts();
                    }}
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 140,
                      minWidth: 140,
                      backgroundColor: colors.dangerSoft,
                      borderWidth: 1,
                      borderColor: colors.danger,
                      borderRadius: radius.sm,
                      padding: 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={[styles.infoText, { padding: 2, color: colors.danger, fontWeight: "600" }]}
                      numberOfLines={1}
                    >
                      {"ALERTE"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isMaternityNurse && (
              <DialogMaternityAlerts
                isVisible={isMaternityAlertsExpanded}
                onClose={() => {
                  setMaternityAlertsExpanded(false);
                  fetchCurrentPatientManualAlerts();
                }}
                onAdd={() => {
                  setMaternityAlertsExpanded(false);
                  setRaiseAlertDialogVisible(true);
                }}
                onSelectPatient={(id) => {
                  setMaternityAlertsExpanded(false);
                  rootStore.partogrammeStore.updateSelectedPartogramme(id);
                  navigation.push("Screen_Graph");
                }}
              />
            )}

            {isHospitalStaff && (
              <DialogHospitalAlerts
                isVisible={isHospitalAlertsExpanded}
                state={hospitalAlertsState}
                alerts={hospitalAlerts}
                onClose={() => setHospitalAlertsExpanded(false)}
                onRetry={fetchHospitalAlerts}
                onAdd={() => {
                  setHospitalAlertsExpanded(false);
                  setRaiseAlertDialogVisible(true);
                }}
                onDelete={deleteHospitalAlert}
              />
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Admission</Text>
              <Text style={styles.infoValue}>
                {formatDateOnly(partogramme!.asJson.admissionDateTime)}
              </Text>
              <Text style={styles.infoTime}>
                {formatTimeOnly(partogramme!.asJson.admissionDateTime)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Début du travail</Text>
              <Text style={styles.infoValue}>
                {formatDateOnly(partogramme!.asJson.workStartDateTime)}
              </Text>
              <Text style={styles.infoTime}>
                {formatTimeOnly(partogramme!.asJson.workStartDateTime)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {isMaternityNurse ? "Maternité" : "Hôpital"}
              </Text>
              <View style={styles.infoValueRow}>
                {isMaternityNurse && <IconMaternity size={18} color={colors.text} />}
                <Text style={styles.infoValue} numberOfLines={1}>
                  {isMaternityNurse
                    ? ownMaternity?.name
                    : rootStore.userInfoStore.hospitals.filter(
                        (h) => h.id === rootStore.userInfoStore.userInfo?.hospitalId,
                      )[0]?.name}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dossier</Text>
              <Text style={styles.infoValue}>#{partogramme?.asJson.noFile}</Text>
            </View>
            {isHospitalStaff && assignedNurse && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{assignedNurse.isMaternityNurse ? "Sage-femme" : "Infirmière"}</Text>
                <Text style={styles.infoValue}>{assignedNurse.name}</Text>
                {!!assignedNurse.phone && (
                  <TouchableOpacity onPress={() => callPhone(assignedNurse.phone as string)}>
                    <Text style={[styles.infoTime, styles.phoneLink]}>{assignedNurse.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!!partogramme?.asJson.commentary && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Commentaire</Text>
                <Text style={styles.infoValue}>
                  {partogramme.asJson.commentary}
                </Text>
              </View>
            )}
          </View>

          <DialogConfirm
            Title="Confirmation du changement d'état"
            isVisible={isChangeStateDialogVisible}
            setIsVisible={setChangeStateDialogVisible}
            onValidate={() => {
              partogramme!
                .changeState(
                  newState as Database["public"]["Enums"]["PartogrammeState"],
                )
                .catch((error) => {
                  logger.warn("Graph: changeState failed", { newState, error: error?.message });
                  setErrorMsg(error.message);
                  setErrorCode(error.code);
                  setIsErrorDialogVisible(true);
                });
              setChangeStateDialogVisible(false);
            }}
            InfoText={`Voulez-vous vraiment changer l'état du partogramme vers ${partogrammeStates[newState as keyof typeof partogrammeStates]} ?`}
          />

          <DialogTransferPatient
            isVisible={isTransferDialogVisible}
            hospitalItems={transferHospitalItems}
            defaultHospitalId={defaultHospitalId}
            onClose={() => setTransferDialogVisible(false)}
            onSubmit={({ hospitalId, reason }) =>
              partogramme!
                .transferToHospital(hospitalId, reason)
                .then(() => {
                  setTransferDialogVisible(false);
                  navigation.goBack();
                })
                .catch((error: any) => {
                  logger.warn("Graph: transferToHospital failed", { error: error?.message });
                  return Promise.reject(error);
                })
            }
          />

          <DialogReassignPatient
            isVisible={isReassignDialogVisible}
            hospitalItems={transferHospitalItems.filter((h) => h.value !== partogramme!.asJson.hospitalId)}
            currentHospitalName={
              rootStore.userInfoStore.hospitals.find((h) => h.id === partogramme!.asJson.hospitalId)?.name ?? "—"
            }
            onClose={() => setReassignDialogVisible(false)}
            onSubmit={({ hospitalId, reason }) =>
              partogramme!
                .reassignToHospital(hospitalId, reason)
                .then(() => {
                  setReassignDialogVisible(false);
                  navigation.goBack();
                })
                .catch((error: any) => {
                  logger.warn("Graph: reassignToHospital failed", { error: error?.message });
                  return Promise.reject(error);
                })
            }
          />

          <DialogConfirm
            Title="Récupérer la patiente"
            isVisible={isPullBackDialogVisible}
            setIsVisible={setPullBackDialogVisible}
            onValidate={() => {
              partogramme!
                .pullBackToMaternity()
                .then(() => {
                  setPullBackDialogVisible(false);
                  navigation.goBack();
                })
                .catch((error: any) => {
                  logger.warn("Graph: pullBackToMaternity failed", { error: error?.message });
                  setPullBackDialogVisible(false);
                });
            }}
            InfoText="Voulez-vous vraiment récupérer cette patiente et la ramener à votre maternité ? Elle ne sera plus rattachée à l'hôpital, même si un médecin l'a déjà prise en charge."
          />

          <View style={styles.sectionTitleRow}>
            <Text style={styles.textTitle}>Fréquence Cardiaque du bébé</Text>
            {partogramme!.babyHeartFrequencyStore.dataList.length > 0 && (
              <TouchableOpacity
                style={styles.modifyButton}
                onPress={() => {
                  setDataModifierStores([partogramme!.babyHeartFrequencyStore]);
                  setDataModifierGroupByRow(false);
                  setDataModifierDialogVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {canEdit && <IconPencil size={13} color={colors.accent} />}
                <Text style={styles.modifyLink}>{canEdit ? "Modifier" : "Horaires"}</Text>
              </TouchableOpacity>
            )}
          </View>
          <BabyGraph
            data={bpmList.map((p) => p.data)}
            startTime={chartStartTime}
            loading={partogramme!.babyHeartFrequencyStore.isLoading}
          />
          <DialogDataInputGraph
            visible={isFcDialogVisible}
            onClose={onDialogCloseAddFcBaby}
            onCancel={() => setFcDialogVisible(false)}
            startValue={120}
            endValue={180}
            step={10}
            dataName={"Fréquence cardiaque du bébé"}
          />
          {canEdit && (
            <CustomButton
              title="+ Ajouter FC bébé"
              color={colors.accent}
              disabled={false}
              style={styles.buttonStyle}
              onPressFunction={openFcDialog}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}

          <View style={styles.sectionTitleRow}>
            <Text style={styles.textTitle}>Graphique de dilatation</Text>
            {(partogramme!.dilationStore.dataList.length > 0 ||
              partogramme!.babyDescentStore.dataList.length > 0) && (
              <TouchableOpacity
                style={styles.modifyButton}
                onPress={() => {
                  setDataModifierStores([partogramme!.dilationStore, partogramme!.babyDescentStore]);
                  setDataModifierGroupByRow(false);
                  setDataModifierDialogVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {canEdit && <IconPencil size={13} color={colors.accent} />}
                <Text style={styles.modifyLink}>{canEdit ? "Modifier" : "Horaires"}</Text>
              </TouchableOpacity>
            )}
          </View>
          <DilationGraph
            dilationStore={partogramme?.dilationStore}
            babyDescentStore={partogramme?.babyDescentStore}
            startTime={chartStartTime}
          />
          <DialogDataInputGraph
            visible={isDilationDialogVisible}
            onClose={onDialogCloseAddDilation}
            onCancel={() => setDilationDialogVisible(false)}
            startValue={4}
            endValue={10}
            step={1}
            dataName={"Dilatation du col de l'utérus"}
          />
          {canEdit && (
            <View style={styles.buttonRow}>
              <CustomButton
                title="+ Dilatation"
                color={colors.accent}
                disabled={false}
                style={styles.buttonStyle2}
                onPressFunction={openDilationDialog}
                styleText={{ fontSize: 14, fontWeight: "bold" }}
              />
              <CustomButton
                title="+ Descente bébé"
                color={colors.accentPressed}
                disabled={false}
                style={styles.buttonStyle2}
                onPressFunction={openDescentBabyDialog}
                styleText={{ fontSize: 14, fontWeight: "bold" }}
              />
            </View>
          )}
          <DialogDataInputGraph
            visible={isDescentBabyDialogVisible}
            onClose={onDialogCloseAddDescentBaby}
            onCancel={() => setDescentBabyDialogVisible(false)}
            startValue={0}
            endValue={10}
            step={1}
            dataName={"Descente du bébé"}
          />

          <View style={styles.sectionTitleRow}>
            <Text style={styles.textTitle}>Tableau</Text>
            {(partogramme!.motherTemperatureStore.dataList.length > 0 ||
              partogramme!.motherSystolicBloodPressureStore.dataList.length > 0 ||
              partogramme!.motherDiastolicBloodPressureStore.dataList.length > 0 ||
              partogramme!.motherHeartRateFrequencyStore.dataList.length > 0 ||
              partogramme!.motherContractionFrequencyStore.dataList.length > 0 ||
              partogramme!.motherContractionDurationStore.dataList.length > 0 ||
              partogramme!.amnioticLiquidStore.dataList.length > 0) && (
              <TouchableOpacity
                style={styles.modifyButton}
                onPress={() => {
                  setDataModifierStores([
                    partogramme!.motherTemperatureStore,
                    partogramme!.motherSystolicBloodPressureStore,
                    partogramme!.motherDiastolicBloodPressureStore,
                    partogramme!.motherHeartRateFrequencyStore,
                    partogramme!.motherContractionFrequencyStore,
                    partogramme!.motherContractionDurationStore,
                    partogramme!.amnioticLiquidStore,
                  ]);
                  setDataModifierGroupByRow(true);
                  setDataModifierDialogVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {canEdit && <IconPencil size={13} color={colors.accent} />}
                <Text style={styles.modifyLink}>{canEdit ? "Modifier" : "Horaires"}</Text>
              </TouchableOpacity>
            )}
          </View>
          <DataTable
            editable={canEdit}
            startTime={partogramme?.asJson.workStartDateTime}
            loading={
              partogramme!.motherTemperatureStore.isLoading ||
              partogramme!.motherSystolicBloodPressureStore.isLoading ||
              partogramme!.motherDiastolicBloodPressureStore.isLoading ||
              partogramme!.motherHeartRateFrequencyStore.isLoading ||
              partogramme!.motherContractionFrequencyStore.isLoading ||
              partogramme!.motherContractionDurationStore.isLoading ||
              partogramme!.amnioticLiquidStore.state === "pending"
            }
            columns={[
              {
                label: "Temp",
                fullName: "Température de la mère",
                items: partogramme!.motherTemperatureStore.sortedMotherTemperatureList,
                formattedValues: partogramme!.motherTemperatureStore.motherTemperatureListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherTemperatureStore, hour),
              },
              {
                label: "PA Sys",
                fullName: "Tension artérielle Systolique de la mère",
                items: partogramme!.motherSystolicBloodPressureStore.sortedMotherBloodPressureList,
                formattedValues: partogramme!.motherSystolicBloodPressureStore.motherBloodPressureListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherSystolicBloodPressureStore, hour),
              },
              {
                label: "PA Dia",
                fullName: "Tension artérielle Diastolique de la mère",
                items: partogramme!.motherDiastolicBloodPressureStore.sortedMotherBloodPressureList,
                formattedValues: partogramme!.motherDiastolicBloodPressureStore.motherBloodPressureListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherDiastolicBloodPressureStore, hour),
              },
              {
                label: "Pouls",
                fullName: "Pouls de la mère",
                items: partogramme!.motherHeartRateFrequencyStore.sortedMotherHeartFrequencyList,
                formattedValues: partogramme!.motherHeartRateFrequencyStore.motherHeartRateFrequencyListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherHeartRateFrequencyStore, hour),
              },
              {
                label: "Fréq. contr.",
                fullName: "Fréquence des contractions",
                items: partogramme!.motherContractionFrequencyStore.sortedMotherContractionsFrequencyList,
                formattedValues: partogramme!.motherContractionFrequencyStore.motherContractionFrequencyListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherContractionFrequencyStore, hour),
              },
              {
                label: "Durée contr.",
                fullName: "Durée des contractions de la mère",
                items: partogramme!.motherContractionDurationStore.sortedMotherContractionDurationList,
                formattedValues: partogramme!.motherContractionDurationStore.DataListAsString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.motherContractionDurationStore, hour),
              },
              {
                label: "Liq.",
                fullName: "Liquide Amniotique",
                items: partogramme!.amnioticLiquidStore.sortedAmnioticLiquidList,
                formattedValues: partogramme!.amnioticLiquidStore.amnioticLiquidAsTableString,
                onPress: (item) => setEditingTableItem(item),
                onAddPress: (hour) => openAddDataTableForCell(partogramme!.amnioticLiquidStore, hour),
              },
            ]}
          />
          {editingTableItem && (
            <EditDataDialog
              visible={!!editingTableItem}
              data={editingTableItem}
              onCancel={() => setEditingTableItem(null)}
              onDelete={() => {
                editingTableItem.delete();
                setEditingTableItem(null);
              }}
              onValidate={(data) => {
                editingTableItem
                  ?.update(data.toString())
                  .then(() => setEditingTableItem(null))
                  .catch((error: any) => {
                    logger.warn("Graph: table cell edit failed", { error: error?.message });
                    setErrorMsg(error.message);
                    setErrorCode(error.code);
                    setIsErrorDialogVisible(true);
                    setEditingTableItem(null);
                  });
              }}
            />
          )}
          {canEdit && (
            <CustomButton
              title="+ Ajouter des données au tableau"
              color={colors.accent}
              disabled={false}
              style={styles.buttonStyle}
              onPressFunction={openAddDataTable}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}

          <CommentsSlider
            data={partogramme!.commentStore.sortedCommentList}
            title="Liste des Commentaires"
            onEditPress={canEdit ? (item) => setEditingTableItem(item) : undefined}
            onDeletePress={canEdit ? (item) => item.delete() : undefined}
          />
          <DialogEditText
            visible={isAddCommentDialogVisible}
            onClose={onDialogCloseAddComment}
            onCancel={() => setAddCommentDialogVisible(false)}
            data_name={"Ajouter un commentaire"}
          />
          {canEdit && (
            <CustomButton
              title="+ Ajouter un commentaire"
              color={colors.accent}
              disabled={false}
              style={styles.buttonAddCommentary}
              onPressFunction={openAddCommentDialog}
              styleText={{ fontSize: 15, fontWeight: "bold" }}
            />
          )}
        </ScrollView>


        {partogramme && (
          <DialogDataInputTable
            visible={isAddTableDataDialogVisible}
            onClose={onDialogCloseAddDataTable}
            onCancel={() => {
              setAddTableDataDialogVisible(false);
              setAddTableDataPreselected(undefined);
              setAddTableDataTargetHour(null);
            }}
            preSelectedDataChoice={addTableDataPreselected}
            data={[
              partogramme.amnioticLiquidStore,
              partogramme.motherSystolicBloodPressureStore,
              partogramme.motherDiastolicBloodPressureStore,
              partogramme.motherHeartRateFrequencyStore,
              partogramme.motherTemperatureStore,
              partogramme.motherContractionFrequencyStore,
              partogramme.motherContractionDurationStore,
            ]}
          />
        )}

        <ErrorDialog
          isVisible={isErrorDialogVisible}
          errorCode={errorCode}
          errorMsg={errorMsg}
          toggleDialog={() => setIsErrorDialogVisible(!isErrorDialogVisible)}
        />
        <DataModifierDialog
          visible={isDataModifierDialogVisible}
          partogramme={partogramme!}
          dataStores={dataModifierStores}
          groupByRow={dataModifierGroupByRow}
          onCancel={() => setDataModifierDialogVisible(false)}
          readOnly={!canEdit}
        />
      </View>
    );
  }
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
    width: "100%",
  },
  // Single content lane: every section (info, buttons, graphs, table,
  // comments) sizes against this capped column, not the raw window.
  scrollViewContentStyle: {
    alignItems: "center",
    paddingBottom: 100,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  sectionTitleRow: {
    width: "95%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.xxl + spacing.lg,
    marginBottom: spacing.md,
  },
  textTitle: {
    fontSize: 19,
    fontWeight: "600",
    color: colors.text,
  },
  modifyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modifyLink: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.accent,
  },
  infoTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  backGroundInfo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  infoRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoTime: {
    fontSize: 13,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  phoneLink: {
    color: colors.accent,
    textDecorationLine: "underline",
  },
  buttonStyle: {
    width: "90%",
    height: layout.touchTarget,
    borderRadius: radius.sm,
    justifyContent: "center",
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    width: "90%",
    gap: 10,
    marginTop: 8,
  },
  buttonStyle2: {
    flex: 1,
    // CustomButton's own base style hardcodes width: 150 — an explicit
    // width always wins over flex sizing in Yoga regardless of flex:1, so
    // without clearing it here these two buttons never actually share the
    // row evenly; on SE-width screens "+ Descente bébé" gets squeezed to
    // its 150px floor with no room for the label.
    width: undefined,
    height: layout.touchTarget,
    borderRadius: radius.sm,
    justifyContent: "center",
  },
  buttonAddCommentary: {
    width: "90%",
    height: layout.touchTarget,
    borderRadius: radius.sm,
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  patientTitleLabel: {
    width: "95%",
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.lg,
  },
  patientTitle: {
    width: "95%",
    color: colors.text,
    fontSize: 22,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  currentAlertBanner: {
    width: "95%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  currentAlertTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  currentAlertText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  currentAlertComment: {
    fontSize: 12,
    color: colors.danger,
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 16,
  },
});
