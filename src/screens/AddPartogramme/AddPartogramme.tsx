import {
  StyleSheet, View, TextInput, ScrollView, Text
} from "react-native";
import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import CustomButton from "../../components/CustomButton";
import { rootStore } from "../../store/rootStore";
import DateTimePickerUIBloc from "../../components/DateTimePickerUIBloc";
import { makeAutoObservable } from "mobx";

export type Props = {
  navigation: any;
};

class UiState {
  constructor() {
    makeAutoObservable(this);
    // TODO : Move ui state to teh store
  }
}

/**
 * Screen to add a partogramme
 * @param navigation navigation object component to navigate between screens
 */
export const ScreenAddPartogramme: React.FC<Props> = observer(
  ({ navigation }) => {
    const [userInfoStore] = useState(rootStore.userInfoStore);
    const [commentary, onChangeCommentary] = useState("");
    const [patientFirstName, onChangePatientFirstName] = useState("");
    const [patientLastName, onChangePatientLastName] = useState("");
    const [hospitalName, onChangeHospitalName] = useState("");
    const [noFile, onChangeNoFile] = useState("");
    const [admissionDateTime, onChangeAdmissionDateTime] = useState(new Date());
    const [workStartDateTime, onChangeWorkStartDate] = useState(new Date());

    // Variables to update dates and control the date picker
    const [dateTimeUpdated, setDateTimeUpdated] = useState("");

    const handleTimeAdmissionChanged = (time: Date | undefined) => {
      if (time !== undefined) {
        admissionDateTime.setHours(time.getHours());
        admissionDateTime.setMinutes(time.getMinutes());
        onChangeAdmissionDateTime(admissionDateTime);
      }
    };

    const handleDateAdmissionChanged = (date: Date | undefined) => {
      if (date !== undefined) {
        admissionDateTime.setFullYear(date.getFullYear());
        admissionDateTime.setMonth(date.getMonth());
        admissionDateTime.setDate(date.getDate());
        onChangeAdmissionDateTime(admissionDateTime);
      }
    };

    const handleTimeWorkStartChanged = (time: Date | undefined) => {
      if (time !== undefined) {
        workStartDateTime.setHours(time.getHours());
        workStartDateTime.setMinutes(time.getMinutes());
        onChangeWorkStartDate(workStartDateTime);
      }
    };

    const handleDateWorkStartChanged = (date: Date | undefined) => {
      if (date !== undefined) {
        workStartDateTime.setFullYear(date.getFullYear());
        workStartDateTime.setMonth(date.getMonth());
        workStartDateTime.setDate(date.getDate());
        onChangeWorkStartDate(workStartDateTime);
      }
    };

    // This function is called when the user clicks on the create button
    const createButtonPressed = () => {
      rootStore.partogrammeStore.createPartogramme(
        admissionDateTime.toISOString(),
        commentary,
        patientFirstName,
        patientLastName,
        Number(noFile),
        "ADMITTED",
        workStartDateTime.toISOString(),
      )
        .then(() => {
        })
        .catch((error) => {
        });
      // Navigate to the menu screen
      navigation.navigate("Screen_Menu");
    };

    return (
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          automaticallyAdjustKeyboardInsets={true}
        >
          <View style={[styles.backGroundInfo,
          {
            alignContent: "center",
            justifyContent: "center",
          }]}>
            <Text style={styles.infoTitleText}>
              Prénom du patient :
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom du patient"
              placeholderTextColor={"#939F99"}
              textAlign="left"
              onChangeText={(text) => onChangePatientFirstName(text)}
            />
          </View>
          <View style={[styles.backGroundInfo,
          {
            alignContent: "center",
            justifyContent: "center",
          }]}>
            <Text style={styles.infoTitleText}>
              Nom de famille du patient :
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de famille du patient"
              textAlign="left"
              placeholderTextColor={"#939F99"}
              onChangeText={(text) => onChangePatientLastName(text)}
            />
          </View>
          <View style={[styles.backGroundInfo,
          {
            alignContent: "center",
            justifyContent: "center",
          }]}>
            <Text style={styles.infoTitleText}>
              Nom de l'hôpital :
            </Text>
            <Text
              style={styles.input}
              >{userInfoStore.hospitalName}</Text>
          </View>
          <View style={[styles.backGroundInfo,
          {
            alignContent: "center",
            justifyContent: "center",
          }]}>
            <Text style={styles.infoTitleText}>
              Numéro de dossier :
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Numéro de dossier"
              textAlign="left"
              placeholderTextColor={"#939F99"}
              keyboardType='numeric'
              onChangeText={(text) => onChangeNoFile(text)}
            />
          </View>
          <DateTimePickerUIBloc
            title="Date et heure d'admission"
            onDateChange={handleDateAdmissionChanged}
            onTimeChange={handleTimeAdmissionChanged}
          />
          <DateTimePickerUIBloc
            title="Date et heure de début du travail"
            onDateChange={handleDateWorkStartChanged}
            onTimeChange={handleTimeWorkStartChanged}
          />
          <View style={[styles.backGroundInfo,
          {
            alignContent: "center",
            justifyContent: "center",
          }]}>
            <Text style={styles.infoTitleText}>
              Commentaire :
            </Text>
            <TextInput
              editable={true}
              multiline={true}
              onChangeText={(text) => onChangeCommentary(text)}
              placeholder="Commentaire"
              placeholderTextColor={"#939F99"}
              textAlign="left"
              textAlignVertical="top"
              style={{
                padding: 10,
                borderWidth: 1,
                borderColor: "black",
                borderRadius: 5,
                width: "95%",
                alignSelf: "center",
                marginVertical: 5,
                height: 150,
              }}
            />
          </View>
          <CustomButton
            title="Valider"
            color="#403572"
            style={{ width: 100, height: 50, margin: 10, borderRadius: 5 }}
            onPressFunction={createButtonPressed}
            styleText={{}}
          />
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  scrollView: {
    alignItems: "center",
    width: "100%",
  },
  text: {
    color: "#000000",
    fontSize: 20,
    margin: 5,
    marginLeft: 15,
    textAlign: "center",
  },
  input: {
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 5,
    backgroundColor: "#ffffff",
    fontSize: 20,
    margin: 10,
    width: 300,
    color: "#403572",
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: "#403572",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    top: 10,
    elevation: 5,
    marginLeft: 10,
  },
  backGroundInfo: {
    backgroundColor: "#d5d0e9",
    // paddingLeft: 5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomWidth: 1,
    marginTop: 5,
    marginBottom: 5,
    width: 350,
  },
  infoTitleText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#403572",
    marginLeft: 5,
  },
});
