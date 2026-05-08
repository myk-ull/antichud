import * as Notifications from 'expo-notifications';

const DEFAULT_TITLE = 'The table is open';
const DEFAULT_BODY = 'Tap to log what you ate. Antichud is measuring, not judging.';

let handlerConfigured = false;

function ensureHandler(): void {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

export async function requestPermission(): Promise<boolean> {
  ensureHandler();
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const result = await Notifications.requestPermissionsAsync();
    return Boolean(result.granted);
  } catch {
    return false;
  }
}

export async function isPermissionGranted(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    return Boolean(existing.granted);
  } catch {
    return false;
  }
}

export async function scheduleReminder(
  intervalMin: number,
  body?: string,
  title?: string,
): Promise<string | null> {
  if (intervalMin <= 0) return null;
  const granted = await isPermissionGranted();
  if (!granted) return null;
  ensureHandler();
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title ?? DEFAULT_TITLE,
        body: body ?? DEFAULT_BODY,
      },
      trigger: {
        seconds: intervalMin * 60,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // swallow — never throw from public API
  }
}
