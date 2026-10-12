import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/** Light feedback for selection changes. A no-op on web and when unsupported. */
export function tapFeedback() {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

/** Confirmation feedback after a successful save. */
export function successFeedback() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}
