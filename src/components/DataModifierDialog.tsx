import React from "react";
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Partogramme, data_t } from '../store/partogramme/partogrammeStore';
import EditDataDialog from "./Dialogs/EditDataDialog";
import { DataList } from "./DataList";
import { observer } from "mobx-react";
import { runInAction } from "mobx";
import ErrorDialog from "./Dialogs/ErrorDialog";
import { logger } from "../lib/logger";

interface Props {
  visible: boolean;
  partogramme: Partogramme;
  onCancel: () => void;
}

const DataModifierDialog: React.FC<Props> = observer(({
  visible,
  partogramme,
  onCancel,
}) => {
  const { width, height } = useWindowDimensions();
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <View>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.overlay}>
          <View style={[
            styles.card,
            { width: Math.min(width * 0.92, 480), maxHeight: height * 0.8 }
          ]}>
            <DataList
              title="Données des 10 dernières minutes"
              dataList={partogramme.Last10MinutesDataIds.slice()}
              onEditButtonPress={(item) => {
                runInAction(() => {
                  item.partogrammeStore.editedDataId = item.data.id;
                });
                setIsEditDialogVisible(true);
              }}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCancel}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
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
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    backgroundColor: "#DE2C1D",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
});

export default DataModifierDialog;
