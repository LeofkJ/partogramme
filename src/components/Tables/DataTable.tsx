import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";

export interface DataTableColumn {
  label: string;
  fullName: string;
  items: any[];
  formattedValues: string[];
  onPress: (item: any) => void;
  onAddPress: (hour: number) => void;
}

interface Props {
  maxHours: number;
  columns: DataTableColumn[];
}

const HOUR_LABEL_WIDTH = 40;
const ROW_HEIGHT = 46;
const HEADER_HEIGHT = 44;
const COL_MIN_WIDTH = 44;

const COLORS = {
  headerBg: "#f0f0f0",
  headerText: "#111111",
  hourLabelBg: "#f7f7f7",
  hourLabelText: "#222222",
  rowEven: "#ffffff",
  rowOdd: "#fafafa",
  border: "#d0d0d0",
  cellText: "#222222",
  emptyText: "#cccccc",
  editableTint: "#f5f3fc",
};

const DataTable: React.FC<Props> = ({ maxHours, columns }) => {
  const { width } = useWindowDimensions();
  const colCount = columns.length;
  const availableWidth = width - HOUR_LABEL_WIDTH - 32;
  const colWidth = Math.max(COL_MIN_WIDTH, Math.floor(availableWidth / colCount));
  const fontSize = colWidth < 50 ? 10 : 11;
  const lineHeight = Math.ceil(fontSize * 1.3);

  const hours = Array.from({ length: maxHours + 1 }, (_, i) => i);

  return (
    <View>
      <View style={styles.container}>
        {/* Header row: hour corner + one column per vital sign */}
        <View style={[styles.row, { height: HEADER_HEIGHT }]}>
          <View style={[styles.hourCell, styles.hourHeaderCell, { width: HOUR_LABEL_WIDTH }]} />
          {columns.map((col, i) => (
            <View key={i} style={[styles.headerCell, { width: colWidth }]}>
              <Text
                style={styles.headerText}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {col.label}
              </Text>
            </View>
          ))}
        </View>

        {/* One row per hour */}
        {hours.map((h) => (
          <View
            key={h}
            style={[
              styles.row,
              { height: ROW_HEIGHT, backgroundColor: h % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd },
            ]}
          >
            <View style={[styles.hourCell, { width: HOUR_LABEL_WIDTH }]}>
              <Text style={styles.hourText}>{h}h</Text>
            </View>
            {columns.map((col, colIndex) => {
              const itemIndex = col.items.findIndex((i) => i?.data?.Rank === h);
              const item = itemIndex >= 0 ? col.items[itemIndex] : null;
              const val = itemIndex >= 0 ? col.formattedValues[itemIndex] : null;
              const isEmpty = item == null;
              if (isEmpty) {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[styles.cell, { width: colWidth }]}
                    onPress={() => col.onAddPress(h)}
                    activeOpacity={0.5}
                  >
                    <Text style={[styles.emptyCellText, { fontSize: fontSize + 1 }]}>+</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[styles.cell, styles.cellEditable, { width: colWidth }]}
                  onPress={() => col.onPress(item)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[styles.cellText, { fontSize, lineHeight }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend: full name behind each abbreviated header — its own separate card */}
      <View style={styles.legend}>
        {columns.map((col, i) => (
          <Text key={i} style={styles.legendText}>
            <Text style={styles.legendAbbr}>{col.label}</Text> = {col.fullName}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  row: {
    flexDirection: "row",
  },
  hourCell: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.hourLabelBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    overflow: "hidden",
  },
  hourHeaderCell: {
    backgroundColor: COLORS.headerBg,
  },
  hourText: {
    color: COLORS.hourLabelText,
    fontSize: 11,
    fontWeight: "700",
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.headerBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingHorizontal: 3,
    overflow: "hidden",
  },
  headerText: {
    color: COLORS.headerText,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 13,
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    overflow: "hidden",
  },
  cellEditable: {
    backgroundColor: COLORS.editableTint,
  },
  cellText: {
    color: COLORS.cellText,
    textAlign: "center",
    fontWeight: "600",
  },
  emptyCellText: {
    color: COLORS.emptyText,
    fontWeight: "400",
  },
  legend: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fafafa",
    gap: 3,
  },
  legendText: {
    fontSize: 11,
    color: "#555555",
    lineHeight: 15,
  },
  legendAbbr: {
    fontWeight: "700",
    color: COLORS.headerText,
  },
});

export default DataTable;
