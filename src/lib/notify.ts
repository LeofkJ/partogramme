import { Alert, Platform, ToastAndroid } from "react-native";
import type { Notify } from "./notifyTypes";

// iOS/Android implementation. Web builds resolve notify.web.ts instead.
export const notify: Notify = {
  error(title, message) {
    Alert.alert(title, message);
  },

  success(message) {
    if (Platform.OS === "android") {
      ToastAndroid.showWithGravity(
        message,
        ToastAndroid.LONG,
        ToastAndroid.CENTER,
      );
    }
    // iOS stays quiet on success: errors are loud, the default outcome is not.
  },

  confirm({
    title = "Confirmation",
    message,
    confirmText = "OK",
    cancelText = "Annuler",
    destructive = false,
  }) {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: "cancel", onPress: () => resolve(false) },
          {
            text: confirmText,
            style: destructive ? "destructive" : "default",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  },
};
