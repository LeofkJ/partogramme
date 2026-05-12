/**
 * @brief  DateTimePickerUIBloc Component.
 * @description This component provide a UI block for date and time picker.
 */

import * as React from "react";
import { View, StyleSheet, Text, Platform } from 'react-native';
import {
  fr,
  registerTranslation,
  DatePickerInput,
  TimePickerModal,
} from "react-native-paper-dates";
import { Button } from "@rneui/themed";
registerTranslation("fr", fr);

export interface AppProps {
  title: string;
  onDateChange: (d: Date | undefined) => void;
  onTimeChange: (d: Date | undefined) => void;
}

export interface AppState {
  inputDate: Date | undefined;
  inputTime: Date | undefined;
  isTimePickerVisible: boolean;
}

/**
 * @brief  DateTimePickerUIBloc Component.
 * @description This component provide a UI block for date and time picker.
 * @param  {AppProps} props : props of the component
 * @returns JSX.Element
 */
export default class DateTimePickerUIBloc extends React.Component<
  AppProps,
  AppState
> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      inputDate: new Date(),
      inputTime: new Date(),
      isTimePickerVisible: false,
    };
  }

  setInputDate(d: Date | undefined) {
    this.setState({ inputDate: d });
  }

  setIsTimePickerVisible(b: boolean) {
    this.setState({ isTimePickerVisible: b });
  }

  // useEffect on InputDate change
  componentDidUpdate(prevProps: AppProps, prevState: AppState) {
    // If inputDate changed, call onDateChange callback
    if (prevState.inputDate !== this.state.inputDate) {
      this.props.onDateChange(this.state.inputDate);
    }
  }

  onDismiss = () => {
    this.setIsTimePickerVisible(false);
  };

  onConfirm = (hoursAndMinutes: { hours: number; minutes: number }) => {
    this.setIsTimePickerVisible(false);
    let date = new Date(
      0,
      0,
      0,
      hoursAndMinutes.hours,
      hoursAndMinutes.minutes
    );
    this.setState({
      inputTime: date,
    });
    this.props.onTimeChange(date);
  };

  public render() {
    return (
      <View style={styles.container}>
        {/* Date Picker */}
        <Text style={styles.titleText}>{this.props.title}</Text>
        <View style={{ flex: 1 }}>
          <DatePickerInput
            locale="fr"
            label="Date"
            value={this.state.inputDate}
            onChange={(d) => this.setInputDate(d)}
            inputMode="start"
            style={{ width: 350 }}
          />
          {/* Time Picker */}
          <View style={styles.timeContainer}>
          {/* Time text view */}
            <View style={{ flex: 2 }}>
              <Text style={styles.text}>Heure</Text>
              <Text style={(Platform.OS === "web") ? styles.textSmallPC: styles.textSmall}>
                {(this.state.inputTime
                  ? this.state.inputTime.getHours() +
                    ":" +
                    this.state.inputTime.getMinutes()
                  : "Pas d'heures sélectionnée."
                ).toString()}
              </Text>
            </View>
            {/* Picker button on the right */}
            <Button
              title="Choisir une heure"
              titleStyle={{ fontSize: 12 }}
              onPress={() => this.setIsTimePickerVisible(true)}
              buttonStyle={styles.validateButton}
              type="solid"
            />
            <TimePickerModal
              visible={this.state.isTimePickerVisible}
              onDismiss={this.onDismiss}
              onConfirm={this.onConfirm}
              hours={12}
              minutes={14}
            />
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 10,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  text: {
    fontSize: 16,
  },
  textSmall: {
    fontSize: 12,
  },
  textSmallPC: {
    fontSize: 12,
    marginBottom: 30,
  },
  validateButton: {
    width: 100,
    flex: 1,
    height: 45,
    borderRadius: 20,
    backgroundColor: "#403572",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    padding: 0,
    elevation: 0,
  },
  timeContainer: {
    flexDirection: "row",
    flex: 1,
    width: "100%",
    marginTop: 10,
    marginBottom:10,
    paddingRight: 20,
    paddingStart: 10,
    paddingBottom: 10,
    backgroundColor: "",
    borderBottomWidth: 1,
  },
});
