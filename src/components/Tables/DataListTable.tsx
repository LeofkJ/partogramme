import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Table,
  TableWrapper,
  Row,
  Rows,
  Col,
  Cell,
} from "react-native-reanimated-table";
import { tableTitles } from "../../../types/constants";
import { Button, Icon } from "@rneui/themed";
import { data_t } from "../../store/partogramme/partogrammeStore";

interface Props {
  Headers: string[];
  tableDataString: any[][];
  widthArr: number[];
  flexArray?: number[];
  onPress: (data: data_t, index:number) => void;
}

const DataListTable: React.FC<Props> = ({
  Headers,
  tableDataString: tableDataString,
  widthArr,
  flexArray,
  onPress,
}) => {
  const element = (data, index) => (
    <Button 
      radius={"sm"} 
      type="solid"
      buttonStyle = {styles.btn}
      onPress={
        () => {
          onPress(index);
        }
      }>
      <Icon
        name="pen"
        color= "white"
        type= "font-awesome-5"
        size={20}
         />
    </Button>
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal={true}>
        <View style={{ }}>
          <Table borderStyle={{ borderWidth: 1 }}>
            <Row
              data={["", ...Headers]}
              style={styles.head}
              textStyle={styles.text}
              // flexArr={flexArray}
              widthArr={widthArr}
            />
            {tableDataString.map((rowData, index) => (
              <TableWrapper key={index} style={styles.row}>
                <Cell
                  // flex={flexArray[0]}
                  data={element(rowData, index)}
                  textStyle={styles.text}
                  width={widthArr[0]}
                />
                {rowData.map((cellData, cellIndex) => (
                  <Cell
                    // flex={flexArray[cellIndex]}
                    key={cellIndex}
                    data={cellData}
                    textStyle={styles.text}
                    width={widthArr[cellIndex+1]}
                  />
                ))}
              </TableWrapper>
            ))}
          </Table>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F6F3F3",
    width: "100%",
    borderRadius: 10,
    alignSelf: "center",
  },
  head: { height: 40, backgroundColor: "#403572", width: "100%" , borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 2},
  wrapper: { flex: 1, flexDirection: "row", width: "100%" },
  wrapper_rows: { flex: 1, flexDirection: "column", width: "100%" },
  dataWrapper: {},
  title: { backgroundColor: "#f6f8fa" },
  row: { flexDirection: "row", backgroundColor: "#7162b5" , borderLeftWidth: 2, borderRightWidth: 2},
  rowWrapper: { flexDirection: "row" },
  text: { textAlign: "center", color: "#fff", margin: 2 },
  btn: { width: 40, height: 40, backgroundColor: "#403572", borderRadius: 20, margin: 5 },
  btnText: { textAlign: "center", color: "#fff" },
});

export default DataListTable;
