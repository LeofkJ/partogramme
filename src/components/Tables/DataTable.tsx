import React from "react";
import { StyleSheet, View, Text, ScrollView, useWindowDimensions, Platform } from "react-native";
import { tableTitles } from "../../../types/constants";

interface Props {
  maxHours: number;
  tableHead?: string[];
  tableTitle?: string[];
  tableData: any[][];
}

const LABEL_WIDTH = 110;
const COL_MIN_WIDTH = 36;
const ROW_HEIGHTS = [44, 72, 72, 44, 44, 60, 44];
const HEADER_HEIGHT = 40;

const COLORS = {
  headerBg: "#f0f0f0",
  headerText: "#111111",
  labelBg: "#f7f7f7",
  labelText: "#222222",
  rowEven: "#ffffff",
  rowOdd: "#fafafa",
  border: "#d0d0d0",
  cellText: "#222222",
  emptyText: "#aaaaaa",
};

const DataTable: React.FC<Props> = ({
  maxHours,
  tableHead,
  tableTitle = tableTitles,
  tableData,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== "web";
  const colCount = maxHours + 1;
  const labelWidth = isMobile ? 50 : LABEL_WIDTH;
  const availableWidth = width - labelWidth - 26;
  const colWidth = isMobile
    ? Math.max(16, Math.floor(availableWidth / colCount))
    : Math.max(COL_MIN_WIDTH, Math.floor(availableWidth / colCount));
  const fontSize = isMobile
    ? colWidth < 20 ? 6 : colWidth < 26 ? 7 : 8
    : colWidth < 42 ? 9 : 11;
  const labelFontSize = isMobile ? 7 : 9;

  const headers: string[] = tableHead
    ? tableHead
    : Array.from({ length: colCount }, (_, i) => `${i}h`);

  const dataColumns = (
    <View>
      {/* Header row */}
      <View style={[styles.row, { height: HEADER_HEIGHT }]}>
        {headers.map((h, i) => (
          <View
            key={i}
            style={[styles.headerCell, { width: colWidth, backgroundColor: COLORS.headerBg }]}
          >
            <Text style={[styles.headerText, { fontSize }]}>{h}</Text>
          </View>
        ))}
      </View>

      {/* Data rows */}
      {tableData.map((rowData, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            { height: ROW_HEIGHTS[rowIndex] ?? 44 },
            { backgroundColor: rowIndex % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd },
          ]}
        >
          {Array.from({ length: colCount }, (_, colIndex) => {
            const val = rowData?.[colIndex];
            const isEmpty = val == null || val === "" || val === "_";
            return (
              <View
                key={colIndex}
                style={[
                  styles.cell,
                  isMobile && styles.cellCompact,
                  { width: colWidth, height: ROW_HEIGHTS[rowIndex] ?? 44 },
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    { fontSize },
                    isEmpty && styles.emptyCellText,
                  ]}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                >
                  {isEmpty ? "—" : val}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Fixed label column */}
      <View style={[styles.labelColumn, { width: labelWidth }]}>
        <View style={[styles.headerCell, { height: HEADER_HEIGHT, backgroundColor: COLORS.headerBg }]} />
        {tableTitle.map((title, i) => (
          <View
            key={i}
            style={[
              styles.labelCell,
              isMobile && styles.labelCellCompact,
              { height: ROW_HEIGHTS[i] ?? 44 },
            ]}
          >
            <Text style={[styles.labelText, { fontSize: labelFontSize }]} numberOfLines={3} adjustsFontSizeToFit>
              {title}
            </Text>
          </View>
        ))}
      </View>

      {/* Data columns: fit-to-screen on mobile (no horizontal scroll), scrollable on web */}
      {isMobile ? (
        <View style={{ flex: 1 }}>{dataColumns}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {dataColumns}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  labelColumn: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  labelCell: {
    backgroundColor: COLORS.labelBg,
    justifyContent: "center",
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    overflow: "hidden",
  },
  labelCellCompact: {
    paddingHorizontal: 2,
  },
  labelText: {
    color: COLORS.labelText,
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 12,
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    overflow: "hidden",
  },
  headerText: {
    color: COLORS.headerText,
    fontWeight: "700",
    textAlign: "center",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    overflow: "hidden",
  },
  cellCompact: {
    paddingHorizontal: 0,
  },
  cellText: {
    color: COLORS.cellText,
    textAlign: "center",
    fontWeight: "500",
  },
  emptyCellText: {
    color: COLORS.emptyText,
    fontWeight: "400",
  },
});

export default DataTable;
