import * as React from "react";
import { colors, spacing, radius, type, layout } from "../theme";
import { View, StyleSheet, Text, Pressable, Modal, Dimensions } from "react-native";
import { IconX } from "./Icons";
import { WheelColumn, WHEEL_HEIGHT } from "./WheelColumn";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// A modest, clinically-reasonable range — admission/labor-start dates are
// always close to today, never decades away.
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 5 + i);

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface AppProps {
  title: string;
  onDateChange: (d: Date | undefined) => void;
  onTimeChange: (d: Date | undefined) => void;
}

export interface AppState {
  inputDate: Date | undefined;
  inputTime: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
  wheelDay: number;
  wheelMonth: number;
  wheelYear: number;
  wheelHour: number;
  wheelMinute: number;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(date: Date | undefined): string {
  if (!date) return "Sélectionner une date";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default class DateTimePickerUIBloc extends React.Component<
  AppProps,
  AppState
> {
  constructor(props: AppProps) {
    super(props);
    const now = new Date();
    this.state = {
      inputDate: now,
      inputTime: new Date(),
      showDatePicker: false,
      showTimePicker: false,
      wheelDay: now.getDate(),
      wheelMonth: now.getMonth(),
      wheelYear: now.getFullYear(),
      wheelHour: now.getHours(),
      wheelMinute: now.getMinutes(),
    };
  }

  componentDidUpdate(_prevProps: AppProps, prevState: AppState) {
    if (prevState.inputDate !== this.state.inputDate) {
      this.props.onDateChange(this.state.inputDate);
    }
  }

  openDatePicker = () => {
    const base = this.state.inputDate ?? new Date();
    this.setState({
      showDatePicker: true,
      wheelDay: base.getDate(),
      wheelMonth: base.getMonth(),
      wheelYear: base.getFullYear(),
    });
  };

  confirmDate = () => {
    const { wheelDay, wheelMonth, wheelYear } = this.state;
    const clampedDay = Math.min(wheelDay, daysInMonth(wheelYear, wheelMonth));
    this.setState({
      inputDate: new Date(wheelYear, wheelMonth, clampedDay),
      showDatePicker: false,
    });
  };

  openTimePicker = () => {
    const base = this.state.inputTime;
    this.setState({
      showTimePicker: true,
      wheelHour: base.getHours(),
      wheelMinute: base.getMinutes(),
    });
  };

  confirmTime = () => {
    const { wheelHour, wheelMinute } = this.state;
    const date = new Date(0, 0, 0, wheelHour, wheelMinute);
    this.setState({ inputTime: date, showTimePicker: false });
    this.props.onTimeChange(date);
  };

  public render() {
    const {
      inputDate, inputTime, showDatePicker, showTimePicker,
      wheelDay, wheelMonth, wheelYear, wheelHour, wheelMinute,
    } = this.state;
    const dayCount = daysInMonth(wheelYear, wheelMonth);
    const dayItems = Array.from({ length: dayCount }, (_, i) => (i + 1).toString());
    const yearItems = YEARS.map((y) => y.toString());
    const yearIndex = Math.max(0, YEARS.indexOf(wheelYear));
    const hourItems = HOURS.map((h) => h.toString().padStart(2, "0"));
    const minuteItems = MINUTES.map((m) => m.toString().padStart(2, "0"));

    return (
      <View style={styles.container}>
        <Text style={styles.titleText}>{this.props.title}</Text>

        <Text style={styles.fieldLabel}>Date</Text>
        <Pressable
          onPress={this.openDatePicker}
          android_ripple={{ color: colors.accentSoft }}
          style={({ pressed }) => [
            styles.timeRow,
            pressed && { backgroundColor: colors.accentSoft },
          ]}
        >
          <Text style={styles.timeValue}>{formatDate(inputDate)}</Text>
          <Text style={styles.timeChevron}>›</Text>
        </Pressable>

        <Modal
          visible={showDatePicker}
          animationType="fade"
          transparent
          onRequestClose={() => this.setState({ showDatePicker: false })}
        >
          <View style={styles.overlay}>
            <View
              style={[
                styles.pickerCard,
                { width: Math.min(Dimensions.get("window").width * 0.92, 420) },
              ]}
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Sélectionner une date</Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => this.setState({ showDatePicker: false })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconX size={16} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.wheelRow}>
                <View pointerEvents="none" style={styles.wheelHighlight} />
                <WheelColumn
                  items={dayItems}
                  selectedIndex={wheelDay - 1}
                  onChange={(i) => this.setState({ wheelDay: i + 1 })}
                />
                <WheelColumn
                  items={MONTH_NAMES}
                  selectedIndex={wheelMonth}
                  onChange={(i) => this.setState({ wheelMonth: i })}
                />
                <WheelColumn
                  items={yearItems}
                  selectedIndex={yearIndex}
                  onChange={(i) => this.setState({ wheelYear: YEARS[i] })}
                />
              </View>

              <Pressable
                onPress={this.confirmDate}
                style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.confirmButtonText}>Valider</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Text style={styles.fieldLabel}>Heure</Text>
        <Pressable
          onPress={this.openTimePicker}
          android_ripple={{ color: colors.accentSoft }}
          style={({ pressed }) => [
            styles.timeRow,
            pressed && { backgroundColor: colors.accentSoft },
          ]}
        >
          <Text style={styles.timeValue}>{formatTime(inputTime)}</Text>
          <Text style={styles.timeChevron}>›</Text>
        </Pressable>

        <Modal
          visible={showTimePicker}
          animationType="fade"
          transparent
          onRequestClose={() => this.setState({ showTimePicker: false })}
        >
          <View style={styles.overlay}>
            <View
              style={[
                styles.pickerCard,
                { width: Math.min(Dimensions.get("window").width * 0.92, 420) },
              ]}
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Sélectionner une heure</Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => this.setState({ showTimePicker: false })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconX size={16} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.wheelRow}>
                <View pointerEvents="none" style={styles.wheelHighlight} />
                <WheelColumn
                  items={hourItems}
                  selectedIndex={wheelHour}
                  onChange={(i) => this.setState({ wheelHour: i })}
                />
                <WheelColumn
                  items={minuteItems}
                  selectedIndex={wheelMinute}
                  onChange={(i) => this.setState({ wheelMinute: i })}
                />
              </View>

              <Pressable
                onPress={this.confirmTime}
                style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.confirmButtonText}>Valider</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  titleText: {
    ...type.label,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...type.label,
    marginBottom: spacing.xs,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: layout.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  timeValue: {
    fontSize: type.body.fontSize,
    color: colors.text,
    fontWeight: "500",
  },
  timeChevron: {
    fontSize: 20,
    color: colors.textMuted,
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelRow: {
    flexDirection: "row",
    height: WHEEL_HEIGHT,
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: (WHEEL_HEIGHT - layout.touchTarget) / 2,
    height: layout.touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
  },
  confirmButton: {
    height: layout.touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  confirmButtonText: {
    color: colors.onAccent,
    fontSize: type.body.fontSize,
    fontWeight: "600",
  },
});
