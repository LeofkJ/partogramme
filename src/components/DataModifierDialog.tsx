import React from "react";
import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Partogramme, data_t } from '../store/partogramme/partogrammeStore';
import EditDataDialog from "./Dialogs/EditDataDialog";
import { DataList } from "./DataList";
import { observer } from "mobx-react";
import { runInAction } from "mobx";
import ErrorDialog from "./Dialogs/ErrorDialog";

interface Props {
  // Put props here
  visible: boolean;
  partogramme: Partogramme;
  onCancel: () => void;
}

const createTableData = (dataList: data_t[]) => {
  const tableData = [];
  var options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  for (const data of dataList) {
    const dataRow = [] as string[];
    dataRow.push(data.store.name); // data name
    dataRow.push(data.data.value.toString() + " " + data.store.unit); // data value
    let date = new Date(data.data.created_at).toLocaleDateString(
      "fr-FR",
      options
    );
    dataRow.push(date); // data timestamp
    tableData.push(dataRow);
  }
  return tableData;
};

/**
 * @brief Dialog to
 */
const DataModifierDialog: React.FC<Props> = observer(({
  // Put props here
  visible,
  partogramme,
  onCancel,
}) => {
  // Put state variables here
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentSelectedDataId, setCurrentSelectedDataId] = useState("");
  const last10MinutesData = partogramme.Last10MinutesDataIds;

  return (
    // Put JSX here
    <View>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        style={{
          flex: 1,
          justifyContent: "center",
        }}
      >
        <View style={styles.modalView}>
          <DataList
            title={"Données des 10 dernières minutes"}
            dataList={partogramme.Last10MinutesDataIds.slice()}
            onEditButtonPress={(item) => {
              runInAction(() => {
                item.partogrammeStore.editedDataId = item.data.id;
              });
              setIsEditDialogVisible(true);
            }}
          />
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel, { marginLeft: 50 }]}
            onPress={() => {
              onCancel();
            }}
          >
            <Text style={{ color: "white" }}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {partogramme.dataToEdit && 
        <EditDataDialog
          visible={isEditDialogVisible}
          data={partogramme.getDataById(partogramme.dataToEdit.data.id)!}
          onCancel={() => {
            setIsEditDialogVisible(false);
          }}
          onValidate={(data) => {
            partogramme.dataToEdit?.update(data.toString())
            .then(() => {
                setIsEditDialogVisible(false);
            })
            .catch((error:any) => {
                setErrorMessage(error.message);
                setIsErrorDialogVisible(true);
            });

          }}
        />
      }
      <ErrorDialog
        isVisible={isErrorDialogVisible}
        errorCode={"Erreur"}
        errorMsg={errorMessage}
        toggleDialog={() => {
          setIsErrorDialogVisible(false);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  // Put styles here
  container: {
    flex: 1,
    justifyContent: "center",
  },
  modalView: {
    justifyContent: "center",
    width: "90%",
    height: "95%",
    margin: 20,
    backgroundColor: "#efedff",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowRadius: 10,
    elevation: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 10,
  },
  buttonValidate: {
    backgroundColor: "#403572",
  },
  buttonCancel: {
    backgroundColor: "#C5613E",
    alignSelf: "flex-end",
  },
});

export default DataModifierDialog;
