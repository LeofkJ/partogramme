import React from "react";
import { colors, radius, spacing } from "../theme";
import { useState } from "react";
import {
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
import { logger } from "../lib/logger";
import { IconX } from "./Icons";

interface Props {
  visible: boolean;
  partogramme: Partogramme;
  onCancel: () => void;
  dataStores?: dataStore_t[];
}

const DataModifierDialog: React.FC<Props> = observer(({
  visible,
  partogramme,
  onCancel,
  dataStores,
}) => {
  const { width, height } = useWindowDimensions();
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const dataList = (partogramme.allDataSorted ?? []).filter(
    (item) => !dataStores || dataStores.includes(item.store)
  );

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
              <Text style={styles.headerTitle}>Modifier les données</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onCancel}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconX size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <DataList
              dataList={dataList}
              onEditButtonPress={(item) => {
                runInAction(() => {
                  item.partogrammeStore.editedDataId = item.data.id;
                });
                setIsEditDialogVisible(true);
              }}
            />
          </View>
        </View>
      </Modal>

      {partogramme.dataToEdit &&
        <EditDataDialog
          visible={isEditDialogVisible}
          data={partogramme.getDataById(partogramme.dataToEdit.data.id)!}
          onCancel={() => setIsEditDialogVisible(false)}
          onValidate={(data) => {
            partogramme.dataToEdit?.update(data.toString())
              .then(() => setIsEditDialogVisible(false))
              .catch((error: any) => {
                logger.warn("DataModifierDialog: data update failed", { error: error?.message });
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
