import { Linking } from "react-native";
import { logger } from "./logger";

/** Opens the device's dialer for a phone number — lets a doctor call a
 * nurse straight from the patient list or chart instead of copying the
 * number digit by digit. */
export function callPhone(phone: string) {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`).catch((error: any) => {
    logger.warn("callPhone: Linking.openURL failed", { error: error?.message });
  });
}
