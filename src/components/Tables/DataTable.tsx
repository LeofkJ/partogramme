import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
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

const LABEL_WIDTH = 100;
const CONTAINER_PADDING = 32; // 16 * 2

const DataTable: React.FC<Props> = ({
  maxHours,
  tableHead,
  tableTitle = tableTitles,
  tableData,
}) => {
  const { width } = useWindowDimensions();
  const heightArray = [40, 70, 70, 40, 40, 60, 40];

  const colCount = maxHours + 1;
  const colWidth = Math.floor((width - LABEL_WIDTH - CONTAINER_PADDING) / colCount);
  const widthArr = Array(colCount).fill(colWidth);
  const fontSize = width < 500 ? 8 : 10;

  const header = () => {
    if (!tableHead) {
      const headers = [];
      for (let i = 0; i < colCount; i++) {
        headers.push(`${i}h`);
      }
      return headers;
    }
    return tableHead;
  };

  const renderCells = (data: string[], heightRow: number) => {
    return Array.from({ length: colCount }, (_, i) => (
      <Cell
        key={i}
        data={data[i] ? data[i] : "_"}
        textStyle={[styles.text, { fontSize }]}
        width={colWidth}
        height={heightArray[heightRow]}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <View style={{ width: LABEL_WIDTH }}>
        <Table borderStyle={{ borderWidth: 1 }}>
          <Col
            data={["", ...tableTitle]}
            style={styles.title}
            width={LABEL_WIDTH}
            heightArr={[40, ...heightArray]}
            textStyle={[styles.text, { fontSize }]}
          />
        </Table>
      </View>
      <View style={{ flex: 1 }}>
        <Table borderStyle={{ borderWidth: 1 }}>
          <TableWrapper style={styles.wrapper_rows}>
            <Row
              data={header()}
              style={styles.head}
              widthArr={widthArr}
              textStyle={[styles.text, { fontSize }]}
            />
            {tableData.map((rowData, index) => (
              <TableWrapper key={index} style={styles.rowWrapper}>
                {renderCells(rowData, index)}
              </TableWrapper>
            ))}
          </TableWrapper>
        </Table>
      </View>
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
  head: { height: 40, backgroundColor: "#f1f8ff" },
  wrapper: { flex: 1, flexDirection: "row", width: "100%" },
  wrapper_rows: { flex: 1, flexDirection: "column", width: "100%" },
  dataWrapper: {},
  title: { backgroundColor: "#f6f8fa" },
  row: { flex: 1 },
  rowWrapper: { flexDirection: "row" },
  text: { textAlign: "center" },
});

export default DataTable;
