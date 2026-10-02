import { StyleSheet, View, TextInput, ScrollView, Text, Pressable } from "react-native";
import { useState } from "react";
import { observer } from "mobx-react";
import { rootStore } from "../../store/rootStore";
import DateTimePickerUIBloc from "../../components/DateTimePickerUIBloc";
import { logger } from "../../lib/logger";
import { IconMaternity } from "../../components/Icons";
import { colors, spacing, radius, type, layout } from "../../theme";
import { parseDossierNumber } from "../../lib/validation";

export type Props = {
  navigation: any;
};

export const ScreenAddPartogramme: React.FC<Props> = observer(
  ({ navigation }) => {
    const [userInfoStore] = useState(rootStore.userInfoStore);
    const [commentary, onChangeCommentary] = useState("");
    const [patientFirstName, onChangePatientFirstName] = useState("");
    const [patientLastName, onChangePatientLastName] = useState("");
    // Starts empty — left blank, a real collision-free number is claimed
    // (atomic, global — see claim_next_dossier_number) at submit time
    // instead of pre-filled here. Typed over, whatever she enters is used
    // instead (parseDossierNumber + the 23505 handling in
    // createButtonPressed catches a number that's already taken). This is
    // the ONLY place a number gets claimed — once set it follows the
    // patient everywhere (transfer, reclaim, reassign) unchanged, see
    // partogrammeStore.ts's transfer methods.
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

    const createButtonPressed = async () => {
      let finalNoFile: number;
      if (noFile.trim() === "") {
        setErrorMessage(null);
        setIsSubmitting(true);
        try {
          finalNoFile = await rootStore.partogrammeStore.transportLayer.claimNextDossierNumber();
        } catch (error: any) {
          logger.warn("AddPartogramme: claimNextDossierNumber failed", { error: error?.message });
          setIsSubmitting(false);
          setErrorMessage("Impossible d'attribuer un numéro de dossier automatiquement. Veuillez en saisir un manuellement.");
          return;
        }
      } else {
        const parsed = parseDossierNumber(noFile);
        if (parsed === null) {
          setErrorMessage("Le numéro de dossier doit être un nombre entier positif.");
          return;
        }
        finalNoFile = parsed;
        setErrorMessage(null);
        setIsSubmitting(true);
      }
      rootStore.partogrammeStore
        .createPartogramme(
          admissionDateTime.toISOString(),
          commentary,
          patientFirstName,
          patientLastName,
          finalNoFile,
          "ADMITTED",
          workStartDateTime.toISOString(),
        )
        .then(() => {
          setIsSubmitting(false);
          navigation.navigate("Screen_Menu");
        })
        .catch((error) => {
          logger.warn("createPartogramme failed", { noFile: finalNoFile, error: error?.message, code: error?.code });
          setIsSubmitting(false);
          if (error?.code === "23505") {
            setErrorMessage("Ce numéro de dossier est déjà utilisé. Veuillez en choisir un autre.");
          } else {
            setErrorMessage("Impossible de créer le partogramme. Veuillez réessayer.");
          }
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
              {userInfoStore.userInfo.nurseType === "MATERNITY" && (
                <IconMaternity size={18} color={colors.text} />
              )}
              <Text style={styles.readonlyText} numberOfLines={1}>
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
              value={noFile}
              onChangeText={onChangeNoFile}
              placeholder="Laisser vide pour attribution automatique"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  readonlyText: {
    flex: 1,
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
