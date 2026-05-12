import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Table,
  TableWrapper,
  Row, Col,
  Cell
} from "react-native-reanimated-table";
import { tableTitles } from "../../../types/constants";

interface Props {
  maxHours: number;
  tableHead?: string[];
  tableTitle?: string[];
  tableData: any[][];
}

const DataTable: React.FC<Props> = ({
  maxHours,
  tableHead,
  tableTitle = tableTitles,
  tableData,
}) => {
  const heightArray = [40, 70, 70, 40, 40, 60, 40];
  
  // generate the header of the table
  const header = () => {
    if (!tableHead) {
      const headers = [];
      for (let i = 0; i < maxHours+1; i++) {
        headers.push(`${i}h`);
      }
      return headers;
    }
    return tableHead;
  };

  const renderCells = (data:string[], heightRow: number) => {
    const cells = [];
    for (let i = 0; i < maxHours+1; i++) {
      cells.push(
        <Cell
          key={i}
          data={data[i] ? data[i] : "_"}
          textStyle={styles.text}
          flex={1}
          height={heightArray[heightRow]}
        />
      );
    }
    return cells;
  };

  return (
    <View style={styles.container}>
      <View style={{ width: 100}}>
        <Table borderStyle={{ borderWidth: 1 }}>
          <Col 
            data={["", ...tableTitle]} 
            style={styles.title} 
            width={100}
            heightArr={[...[40], ...heightArray]}
            textStyle={styles.text} 
            />
        </Table>
      </View>
      <ScrollView horizontal={true}>
        <View style={{ width: 1200}}>
          <Table borderStyle={{ borderWidth: 1 }}>
              <TableWrapper style={styles.wrapper_rows}>
                <Row 
                data={header()} 
                style={styles.head} 
                flexArr={[1, 1, 1, 1, 1, 1, 1 , 1, 1, 1, 1, 1, 1]}
                textStyle={styles.text} 
                widthArr={[100]}
                />
                {
                  tableData.map((rowData, index) => (
                    <TableWrapper key={index} style={styles.rowWrapper}>
                      {
                        renderCells(rowData, index)
                      }
                    </TableWrapper>
                  ))
                }
              </TableWrapper>
          </Table>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 30,
    backgroundColor: "#fff",
    width: "100%",
    minHeight: 470,
    alignSelf: "center",
  },
  head: { height: 40, backgroundColor: "#f1f8ff", width: "100%" },
  wrapper: { flex: 1, flexDirection: "row" , width: "100%"},
  wrapper_rows: { flex: 1, flexDirection: "column" , width: "100%"},
  dataWrapper: { },
  title: { backgroundColor: "#f6f8fa"},
  row: {flex :1},
  rowWrapper: {flexDirection :"row"},
  text: { textAlign: "center" },
});

export default DataTable;
