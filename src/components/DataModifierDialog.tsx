import React from "react";
import { colors, radius, spacing } from "../theme";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Partogramme, data_t, dataStore_t } from '../store/partogramme/partogrammeStore';
import EditDataDialog from "./Dialogs/EditDataDialog";
import { DataList } from "./DataList";
import { observer } from "mobx-react";
import { runInAction } from "mobx";
import ErrorDialog from "./Dialogs/ErrorDialog";
import { DialogConfirm } from "./Dialogs/DialogConfirm";
import { logger } from "../lib/logger";
import { IconTrash, IconX } from "./Icons";

interface Props {
  visible: boolean;
  partogramme: Partogramme;
  onCancel: () => void;
  dataStores?: dataStore_t[];
  /** No edit/delete actions, just the timestamped list — for viewers who can't edit this partogramme. */
  readOnly?: boolean;
  /**
   * Group by row (15-minute slot / Rank) instead of a flat chronological
   * list — for table data, where several independent values (temp, pulse,
   * etc.) can share the same row. Tap a row to see just its own values.
   */
  groupByRow?: boolean;
}

const DataModifierDialog: React.FC<Props> = observer(({
  visible,
  partogramme,
  onCancel,
  dataStores,
  readOnly = false,
  groupByRow = false,
}) => {
  const { width, height } = useWindowDimensions();
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [rowPendingDelete, setRowPendingDelete] = useState<[number, data_t[]] | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedRank(null);
      setRowPendingDelete(null);
    }
  }, [visible]);

  const dataList = (partogramme.allDataSorted ?? []).filter(
    (item) => !dataStores || dataStores.includes(item.store)
  );

  // Rows sorted oldest-first (allDataSorted is newest-first) for a natural
  // top-to-bottom reading order, same as the table itself.
  const rows: [number, data_t[]][] = [];
  if (groupByRow) {
    const byRank = new Map<number, data_t[]>();
    dataList.forEach((item) => {
      const rank = (item.data as any).Rank;
      if (rank == null) return;
      if (!byRank.has(rank)) byRank.set(rank, []);
      byRank.get(rank)!.push(item);
    });
    rows.push(...Array.from(byRank.entries()).sort((a, b) => a[0] - b[0]));
  }

  const formatRowLabel = (rank: number, items: data_t[]) => {
    const withTime = items.find((i) => i.data.created_at);
    if (withTime) {
      return new Date(withTime.data.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    const start = partogramme.asJson.workStartDateTime;
    if (!start) return `Créneau ${rank}`;
    return new Date(new Date(start).getTime() + rank * 15 * 60000)
      .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const selectedRowItems = selectedRank !== null
    ? rows.find(([rank]) => rank === selectedRank)?.[1] ?? []
    : [];

  return (
    <View>
      <Modal
        visible={visible && !isEditDialogVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.overlay}>
          <View style={[
            styles.card,
            { width: Math.min(width * 0.92, 440), maxHeight: height * 0.75 }
          ]}>
            <View style={styles.header}>
              {groupByRow && selectedRank !== null ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedRank(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.backButtonText}>‹ Retour</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.headerTitle}>
                  {readOnly ? "Horaires des données" : "Modifier les données"}
                </Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onCancel}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconX size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {groupByRow ? (
              selectedRank === null ? (
                <FlatList
                  data={rows}
                  keyExtractor={([rank]) => String(rank)}
                  ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
                  renderItem={({ item: [rank, items] }) => (
                    <View style={styles.rowItem}>
                      <TouchableOpacity
                        style={styles.rowItemMain}
                        onPress={() => setSelectedRank(rank)}
                      >
                        <Text style={styles.rowItemTime}>{formatRowLabel(rank, items)}</Text>
                        <Text style={styles.rowItemCount}>
                          {items.length} valeur{items.length > 1 ? "s" : ""}
                        </Text>
                      </TouchableOpacity>
                      {!readOnly && (
                        <TouchableOpacity
                          style={styles.rowDeleteButton}
                          onPress={() => setRowPendingDelete([rank, items])}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <IconTrash size={16} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
              ) : (
                <DataList
                  dataList={selectedRowItems}
                  onEditButtonPress={readOnly ? undefined : (item) => {
                    runInAction(() => {
                      item.partogrammeStore.editedDataId = item.data.id;
                    });
                    setIsEditDialogVisible(true);
                  }}
                />
              )
            ) : (
              <DataList
                dataList={dataList}
                onEditButtonPress={readOnly ? undefined : (item) => {
                  runInAction(() => {
                    item.partogrammeStore.editedDataId = item.data.id;
                  });
                  setIsEditDialogVisible(true);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {!readOnly && partogramme.dataToEdit &&
        <EditDataDialog
          visible={isEditDialogVisible}
          data={partogramme.getDataById(partogramme.dataToEdit.data.id)!}
          onCancel={() => setIsEditDialogVisible(false)}
          onValidate={(data) => {
            partogramme.dataToEdit?.update(data.toString())
              .then(() => setIsEditDialogVisible(false))
              .catch((error: any) => {
                logger.warn("DataModifierDialog: data update failed", { error: error?.message });
                setIsEditDialogVisible(false);
                setErrorMessage(error.message);
                setIsErrorDialogVisible(true);
              });
          }}
        />
      }
      <ErrorDialog
        isVisible={isErrorDialogVisible}
        errorCode="Erreur"
        errorMsg={errorMessage}
        toggleDialog={() => setIsErrorDialogVisible(false)}
      />

      <DialogConfirm
        Title="Supprimer la ligne"
        isVisible={rowPendingDelete !== null}
        setIsVisible={() => setRowPendingDelete(null)}
        onValidate={() => {
          if (!rowPendingDelete) return;
          const [rank, items] = rowPendingDelete;
          items.forEach((item) => item.delete());
          if (selectedRank === rank) setSelectedRank(null);
        }}
        InfoText={
          rowPendingDelete
            ? `Supprimer les ${rowPendingDelete[1].length} valeur${rowPendingDelete[1].length > 1 ? "s" : ""} de ${formatRowLabel(rowPendingDelete[0], rowPendingDelete[1])} ? Cette action est irréversible.`
            : undefined
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowItemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  rowDeleteButton: {
    padding: 6,
    marginLeft: spacing.sm,
  },
  rowItemTime: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textDecorationLine: "underline",
  },
  rowItemCount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default DataModifierDialog;
