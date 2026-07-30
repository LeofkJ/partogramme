import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { colors, layout } from "../../theme";

export interface DataTableColumn {
  label: string;
  fullName: string;
  items: any[];
  formattedValues: string[];
  onPress: (item: any) => void;
  onAddPress: (hour: number) => void;
}

interface Props {
  columns: DataTableColumn[];
  /** When false (viewer has no edit rights for this status), cells are inert. */
  editable?: boolean;
  /** Labor start — rows are labeled with the real clock time, in 15-minute steps after it. */
  startTime?: string | null;
}

const HOUR_LABEL_WIDTH = 44;
const ROW_HEIGHT = 46;
const HEADER_HEIGHT = 44;
const COL_MIN_WIDTH = 44;

const COLORS = {
  headerBg: colors.surfaceMuted,
  headerText: colors.text,
  hourLabelBg: colors.surfaceMuted,
  hourLabelText: colors.textSecondary,
  rowEven: colors.surface,
  rowOdd: colors.background,
  border: colors.border,
  cellText: colors.text,
  emptyText: colors.textMuted,
  editableTint: colors.accentSoft,
};

const DataTable: React.FC<Props> = ({ columns, editable = true, startTime }) => {
  const { width } = useWindowDimensions();
  const colCount = columns.length;
  // Cap like the rest of the app: on big monitors the table stays readable
  // instead of stretching columns across the whole screen.
  const effectiveWidth = Math.min(width, layout.maxContentWidth);
  const availableWidth = effectiveWidth - HOUR_LABEL_WIDTH - 32;
  const colWidth = Math.max(COL_MIN_WIDTH, Math.floor(availableWidth / colCount));
  const fontSize = colWidth < 50 ? 10 : 11;
  const lineHeight = Math.ceil(fontSize * 1.3);

  // Rows are 15-minute slots, not hourly — anything entered within the same
  // 15-minute window lands on the same row (`Rank` is the slot index). Only
  // slots that actually have at least one value get a row, the table isn't
  // a fixed grid of every possible slot across the whole span.
  const SLOT_MINUTES = 15;
  const hours = Array.from(
    new Set(
      columns
        .flatMap((col) => col.items)
        .map((item) => item?.data?.Rank)
        .filter((rank): rank is number => rank != null)
    )
  ).sort((a, b) => a - b);

  const formatRowLabel = (h: number) => {
    if (!startTime) return `${h}h`;
    const d = new Date(new Date(startTime).getTime() + h * SLOT_MINUTES * 60000);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  // Wide screens have room for the real column names; no legend needed then.
  const useFullNames = effectiveWidth >= 900;
  const headerHeight = useFullNames ? 60 : HEADER_HEIGHT;

  return (
    <View>
      <View style={styles.container}>
        {/* Header row: hour corner + one column per vital sign */}
        <View style={[styles.row, { height: headerHeight }]}>
          <View style={[styles.hourCell, styles.hourHeaderCell, { width: HOUR_LABEL_WIDTH }]} />
          {columns.map((col, i) => (
            <View key={i} style={[styles.headerCell, { width: colWidth }]}>
              <Text
                style={styles.headerText}
                numberOfLines={useFullNames ? 3 : 2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {useFullNames ? col.fullName : col.label}
              </Text>
            </View>
          ))}
        </View>

        {/* One row per hour */}
        {hours.map((h) => {
          // Prefer the real time something was actually recorded in this row
          // over the assumed slot time — only fall back for rows nothing's
          // been entered in yet, since there's no real time to show there.
          const rowItem = columns
            .flatMap((col) => col.items)
            .find((i) => i?.data?.Rank === h);
          const rowLabel = rowItem?.data?.created_at
            ? new Date(rowItem.data.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            : formatRowLabel(h);
          return (
          <View
            key={h}
            style={[
              styles.row,
              { height: ROW_HEIGHT, backgroundColor: h % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd },
            ]}
          >
            <View style={[styles.hourCell, { width: HOUR_LABEL_WIDTH }]}>
              <Text style={styles.hourText} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>
                {rowLabel}
              </Text>
            </View>
            {columns.map((col, colIndex) => {
              const itemIndex = col.items.findIndex((i) => i?.data?.Rank === h);
              const item = itemIndex >= 0 ? col.items[itemIndex] : null;
              const val = itemIndex >= 0 ? col.formattedValues[itemIndex] : null;
              const isEmpty = item == null;
              if (isEmpty) {
                if (!editable) {
                  return (
                    <View key={colIndex} style={[styles.cell, { width: colWidth }]} />
                  );
                }
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
              const valueText = (
                <Text
                  style={[styles.cellText, { fontSize, lineHeight }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {val}
                </Text>
              );
              if (!editable) {
                return (
                  <View key={colIndex} style={[styles.cell, { width: colWidth }]}>
                    {valueText}
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[styles.cell, styles.cellEditable, { width: colWidth }]}
                  onPress={() => col.onPress(item)}
                  activeOpacity={0.6}
                >
                  {valueText}
                </TouchableOpacity>
              );
            })}
          </View>
          );
        })}
      </View>

      {/* Legend: full name behind each abbreviated header — only needed
          when the headers show abbreviations */}
      {!useFullNames && (
        <View style={styles.legend}>
          {columns.map((col, i) => (
            <Text key={i} style={styles.legendText}>
              <Text style={styles.legendAbbr}>{col.label}</Text> = {col.fullName}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 8,
    alignSelf: "center",
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
