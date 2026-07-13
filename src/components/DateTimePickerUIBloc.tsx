import * as React from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { fr, registerTranslation, DatePickerInput, TimePickerModal } from "react-native-paper-dates";
registerTranslation("fr", fr);

export interface AppProps {
  title: string;
  onDateChange: (d: Date | undefined) => void;
  onTimeChange: (d: Date | undefined) => void;
}

export interface AppState {
  inputDate: Date | undefined;
  inputTime: Date;
  showTimePicker: boolean;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default class DateTimePickerUIBloc extends React.Component<
  AppProps,
  AppState
> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      inputDate: new Date(),
      inputTime: new Date(),
      showTimePicker: false,
    };
  }

  componentDidUpdate(_prevProps: AppProps, prevState: AppState) {
    if (prevState.inputDate !== this.state.inputDate) {
      this.props.onDateChange(this.state.inputDate);
    }
  }

  onConfirmTime = ({ hours, minutes }: { hours: number; minutes: number }) => {
    const date = new Date(0, 0, 0, hours, minutes);
    this.setState({ inputTime: date, showTimePicker: false });
    this.props.onTimeChange(date);
  };

  public render() {
    const { inputDate, inputTime, showTimePicker } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.titleText}>{this.props.title}</Text>

        <Text style={styles.fieldLabel}>Date</Text>
        <DatePickerInput
          locale="fr"
          label=""
          value={inputDate}
          onChange={(d) => this.setState({ inputDate: d })}
          inputMode="start"
          style={styles.dateInput}
        />

        <Text style={styles.fieldLabel}>Heure</Text>
        <Pressable
          onPress={() => this.setState({ showTimePicker: true })}
          android_ripple={{ color: "#40357215" }}
          style={({ pressed }) => [
            styles.timeRow,
            pressed && { backgroundColor: "#f0eef8" },
          ]}
        >
          <Text style={styles.timeValue}>{formatTime(inputTime)}</Text>
          <Text style={styles.timeChevron}>›</Text>
        </Pressable>

        <TimePickerModal
          visible={showTimePicker}
          onDismiss={() => this.setState({ showTimePicker: false })}
          onConfirm={this.onConfirmTime}
          hours={inputTime.getHours()}
          minutes={inputTime.getMinutes()}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#403572",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
    marginLeft: 2,
  },
  dateInput: {
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
  },
  timeChevron: {
    fontSize: 20,
    color: "#aaa",
    lineHeight: 22,
  },
});
