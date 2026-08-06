import { StyleSheet, View, TextInput, ScrollView, Text, Pressable } from "react-native";
import { useState } from "react";
import { observer } from "mobx-react";
import { rootStore } from "../../store/rootStore";
import DateTimePickerUIBloc from "../../components/DateTimePickerUIBloc";
import { logger } from "../../lib/logger";
import { colors, spacing, radius, type, layout } from "../../theme";

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
          logger.warn("createPartogramme failed", { noFile: trimmedNoFile, error: error?.message, code: error?.code });
          setIsSubmitting(false);
          // 23505 = Postgres unique_violation — the (hospitalId, noFile)
          // constraint (see 2026-08-07_unique_dossier_per_hospital.sql).
          setErrorMessage(
            error?.code === "23505"
              ? "Ce numéro de dossier est déjà utilisé dans cet hôpital. Veuillez en choisir un autre."
              : "Impossible de créer le partogramme. Veuillez réessayer.",
          );
        });
    };

    return (
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formColumn}>
          <View style={styles.section}>
            <Text style={styles.label}>Prénom du patient</Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor={colors.textMuted}
              onChangeText={onChangePatientFirstName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Nom de famille</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de famille"
              placeholderTextColor={colors.textMuted}
              onChangeText={onChangePatientLastName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              {userInfoStore.userInfo.nurseType === "MATERNITY" ? "Maternité" : "Hôpital"}
            </Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>
                {(userInfoStore.userInfo.nurseType === "MATERNITY"
                  ? userInfoStore.maternityName
                  : userInfoStore.hospitalName) || "—"}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Numéro de dossier</Text>
            <TextInput
              style={styles.input}
              placeholder="Numéro de dossier"
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
          </View>
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  formColumn: {
    width: "100%",
    maxWidth: layout.maxFormWidth,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    ...type.label,
    marginBottom: spacing.xs,
  },
  input: {
    height: layout.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    fontSize: type.body.fontSize,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  readonlyInput: {
    height: layout.touchTarget,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  readonlyText: {
    fontSize: type.body.fontSize,
    color: colors.textSecondary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    fontSize: type.body.fontSize,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    height: 110,
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: spacing.md,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  btnText: {
    color: colors.onAccent,
    fontSize: type.body.fontSize,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
});
