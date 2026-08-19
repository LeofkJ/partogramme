/**
 * Admin-only: which hospitals a maternity is linked to (see
 * MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §1) — the explicit relationship that
 * drives which hospitals a midwife can transfer/request to, and which
 * maternities a hospital's doctors can see alerts from. Linked hospitals
 * render as tags directly under the maternity row (always visible, no
 * click needed), and tapping expands an inline checklist right there —
 * previously this lived entirely behind a "Hôpitaux liés (N)" link that
 * opened a separate modal, which hid the actual links from view.
 */
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { IconCheck, IconChevronDown } from "./Icons";
import { colors, radius, spacing } from "../theme";

interface HospitalRow {
  id: string;
  name: string;
  city: string;
  linked: boolean;
}

interface Props {
  hospitals: HospitalRow[];
  onToggle: (hospitalId: string, linked: boolean) => void;
}

export const MaternityHospitalLinksPanel = ({ hospitals, onToggle }: Props) => {
  const [isExpanded, setExpanded] = useState(false);
  const linkedHospitals = hospitals.filter((h) => h.linked);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggle} activeOpacity={0.6} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.tagRow}>
          {linkedHospitals.length === 0 ? (
            <Text style={styles.noneText}>Aucun hôpital lié</Text>
          ) : (
            linkedHospitals.map((hospital) => (
              <View key={hospital.id} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>{hospital.name}</Text>
              </View>
            ))
          )}
        </View>
        <View style={[styles.chevronWrap, isExpanded && styles.chevronWrapOpen]}>
          <IconChevronDown size={13} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.panel}>
          {hospitals.length === 0 ? (
            <Text style={styles.emptyText}>Aucun hôpital pour le moment</Text>
          ) : (
            hospitals.map((hospital) => (
              <TouchableOpacity
                key={hospital.id}
                style={styles.row}
                activeOpacity={0.6}
                onPress={() => onToggle(hospital.id, !hospital.linked)}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>{hospital.name}</Text>
                  <Text style={styles.rowCity} numberOfLines={1}>{hospital.city}</Text>
                </View>
                <View style={[styles.checkbox, hospital.linked && styles.checkboxChecked]}>
                  {hospital.linked && <IconCheck size={12} color={colors.onAccent} />}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tagRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    maxWidth: 220,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
  },
  noneText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  chevronWrap: {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapOpen: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ rotate: "180deg" }],
  },
  panel: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  rowName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  rowCity: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
});
