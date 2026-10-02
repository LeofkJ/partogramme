import React from "react";
import { View } from "react-native";
import { data_t } from "../../store/partogramme/partogrammeStore";
import DialogDataInputTable from "./DialogDataInputTable";
import DialogDataInputGraph from "./DialogDataInputGraph";
import { isTableData } from "../../lib/checkTypes";
import { BabyHeartFrequency } from "../../store/GraphData/BabyHeartFrequency/babyHeartFrequencyStore";
import { Dilation } from "../../store/GraphData/Dilatation/dilatationStore";
import { BabyDescent } from "../../store/GraphData/BabyDescent/babyDescentStore";
import { observer } from "mobx-react-lite";
import { Comment } from "../../store/Comment/CommentStore";
import { DialogEditText } from "./DialogEditText";
import { AmnioticLiquid } from "../../store/TableData/AmnioticLiquid/amnioticLiquidStore";
import { getStringByEnum, liquidStates } from "../../../types/constants";

interface Props {
  // Put props here
  visible: boolean;
  data: data_t;
  onValidate: (data: String) => void;
  onCancel: () => void;
  onDelete?: () => void;
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
  onDelete,
}) => {
  // Put state variables here

  return (
    <View>
      {isTableData(data) && (
        <DialogDataInputTable
          visible={visible}
          onClose={(entries) => {
            onValidate(entries[0].value);
          }}
          onCancel={() => onCancel()}
          onDelete={onDelete}
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
          recordedAt={data.data.created_at}
          initialValue={
            data instanceof AmnioticLiquid
              ? (getStringByEnum(liquidStates, data.data.value) ?? String(data.data.value))
              : String(data.data.value)
          }
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
          initialValue={String(data.data.value)}
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
          initialValue={String(data.data.value)}
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
          initialValue={String(data.data.value)}
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

export default EditDataDialog;
