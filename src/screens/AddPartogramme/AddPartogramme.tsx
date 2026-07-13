import { StyleSheet, View, TextInput, ScrollView, Text, Pressable } from "react-native";
import { useState } from "react";
import { observer } from "mobx-react";
import { rootStore } from "../../store/rootStore";
import DateTimePickerUIBloc from "../../components/DateTimePickerUIBloc";
import { logger } from "../../lib/logger";

export type Props = {
  navigation: any;
};

export const ScreenAddPartogramme: React.FC<Props> = observer(
  ({ navigation }) => {
    const [userInfoStore] = useState(rootStore.userInfoStore);
    const [commentary, onChangeCommentary] = useState("");
    const [patientFirstName, onChangePatientFirstName] = useState("");
    const [patientLastName, onChangePatientLastName] = useState("");
    const [noFile, onChangeNoFile] = useState("");
    const [admissionDateTime, onChangeAdmissionDateTime] = useState(new Date());
    const [workStartDateTime, onChangeWorkStartDate] = useState(new Date());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const createButtonPressed = () => {
      const trimmedNoFile = noFile.trim();
      const parsedNoFile = Number(trimmedNoFile);
      if (trimmedNoFile === "" || Number.isNaN(parsedNoFile)) {
        setErrorMessage("Le numéro de dossier doit être un nombre valide.");
        return;
      }
      setErrorMessage(null);
      setIsSubmitting(true);
      rootStore.partogrammeStore
        .createPartogramme(
          admissionDateTime.toISOString(),
          commentary,
          patientFirstName,
          patientLastName,
          parsedNoFile,
          "ADMITTED",
          workStartDateTime.toISOString(),
        )
        .then(() => {
          setIsSubmitting(false);
          navigation.navigate("Screen_Menu");
        })
        .catch((error) => {
          logger.warn("createPartogramme failed", { noFile: trimmedNoFile, error: error?.message });
          setIsSubmitting(false);
          setErrorMessage("Impossible de créer le partogramme. Veuillez réessayer.");
        });
    };

    return (
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.label}>Prénom du patient</Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="#aaa"
              onChangeText={onChangePatientFirstName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Nom de famille</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de famille"
              placeholderTextColor="#aaa"
              onChangeText={onChangePatientLastName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Hôpital</Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>
                {userInfoStore.hospitalName || "—"}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Numéro de dossier</Text>
            <TextInput
              style={styles.input}
              placeholder="Numéro de dossier"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              onChangeText={onChangeNoFile}
            />
          </View>

          <View style={styles.divider} />

          <DateTimePickerUIBloc
            title="Admission"
            onDateChange={handleDateAdmissionChanged}
            onTimeChange={handleTimeAdmissionChanged}
          />

          <View style={styles.divider} />

          <DateTimePickerUIBloc
            title="Début du travail"
            onDateChange={handleDateWorkStartChanged}
            onTimeChange={handleTimeWorkStartChanged}
          />

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>Commentaire</Text>
            <TextInput
              editable
              multiline
              numberOfLines={4}
              onChangeText={onChangeCommentary}
              placeholder="Commentaire (optionnel)"
              placeholderTextColor="#aaa"
              textAlignVertical="top"
              style={styles.textArea}
            />
          </View>

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          <Pressable
            onPress={createButtonPressed}
            disabled={isSubmitting}
            android_ripple={{ color: "#ffffff30" }}
            style={({ pressed }) => [
              styles.btn,
              pressed && { opacity: 0.85 },
              isSubmitting && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.btnText}>
              {isSubmitting ? "Création…" : "Valider"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#f7f7f9",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#403572",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#fff",
    color: "#222",
  },
  readonlyInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#f0f0f5",
  },
  readonlyText: {
    fontSize: 15,
    color: "#666",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingTop: 11,
    backgroundColor: "#fff",
    color: "#222",
    height: 110,
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 10,
  },
  btn: {
    backgroundColor: "#403572",
    borderRadius: 8,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: "#c0392b",
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
});
