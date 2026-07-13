import React from "react";
import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Partogramme, data_t } from "../../store/partogramme/partogrammeStore";
import DataListTable from "../Tables/DataListTable";
import dateFormat from "dateformat";
import DialogDataInputTable, { DataInputTable_t } from "./DialogDataInputTable";
import DialogDataInputGraph from "./DialogDataInputGraph";
import { TableData } from "../../store/TableData/TableData";
import { isGraphData, isTableData } from "../../misc/CheckTypes";
import { BabyHeartFrequency } from "../../store/GraphData/BabyHeartFrequency/babyHeartFrequencyStore";
import { Dilation } from "../../store/GraphData/Dilatation/dilatationStore";
import { BabyDescent } from "../../store/GraphData/BabyDescent/babyDescentStore";
import { observer } from "mobx-react-lite";
import { Comment } from "../../store/Comment/CommentStore";
import { DialogEditText } from "./DialogEditText";

interface Props {
  // Put props here
  visible: boolean;
  data: data_t;
  onValidate: (data: String) => void;
  onCancel: () => void;
}

/**
 * @brief Dialog to edit data
 */
const EditDataDialog: React.FC<Props> = observer( ({
  // Put props here
  visible,
  data,
  onCancel,
  onValidate,
}) => {
  // Put state variables here

  return (
    <View>
      {isTableData(data) && (
        <DialogDataInputTable
          visible={visible}
          onClose={(dataStore: DataInputTable_t, data: string) => {
            onValidate(data);
          }}
          onCancel={() => onCancel()}
          data={[
            data?.partogrammeStore.amnioticLiquidStore,
            data?.partogrammeStore.motherSystolicBloodPressureStore,
            data?.partogrammeStore.motherDiastolicBloodPressureStore,
            data?.partogrammeStore.motherHeartRateFrequencyStore,
            data?.partogrammeStore.motherTemperatureStore,
            data?.partogrammeStore.motherContractionFrequencyStore,
            data?.partogrammeStore.motherContractionDurationStore,
          ]}
          preSelectedDataChoice={data.store}
        />
      )}
      {data instanceof BabyHeartFrequency && (
        <DialogDataInputGraph
          visible={visible}
          onClose={(data: string) => onValidate(data)}
          onCancel={() => onCancel()}
          startValue={120}
          endValue={180}
          step={10}
          dataName={"Fréquence cardiaque du bébé"}
        />
      )}
      {data instanceof Dilation && (
        <DialogDataInputGraph
          visible={visible}
          onClose={(data: string) => onValidate(data)}
          onCancel={() => onCancel()}
          startValue={4}
          endValue={10}
          step={1}
          dataName={"Dilatation du col de l'utérus"}
        />
      )}
      {data instanceof BabyDescent && (
        <DialogDataInputGraph
          visible={visible}
          onClose={(data: string) => onValidate(data)}
          onCancel={() => onCancel()}
          startValue={0}
          endValue={10}
          step={1}
          dataName={"Descente du bébé"}
        />
      )}
      { data instanceof Comment && (
        <DialogEditText
          visible={visible}
          onClose={(data: String) => onValidate(data)}
          onCancel={() => onCancel()}
          data_name={"Commentaire"}
          data={data.data.value}
        />
      )}
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
    height: "40%",
    width: "90%",
    position: "absolute",
    margin: 20,
    backgroundColor: "#d0cbeb",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowRadius: 4,
    elevation: 10,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 10,
    alignSelf: "center",
  },
  buttonValidate: {
    backgroundColor: "#403572",
  },
  buttonCancel: {
    backgroundColor: "#C5613E",
    alignSelf: "flex-end",
  },
});

export default EditDataDialog;
