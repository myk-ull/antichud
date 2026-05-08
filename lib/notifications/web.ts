const DEFAULT_TITLE = 'The table is open';
const DEFAULT_BODY = 'Tap to log what you ate. Antichud is measuring, not judging.';

const intervals = new Map<string, ReturnType<typeof setInterval>>();

function hasNotificationApi(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestPermission(): Promise<boolean> {
  if (!hasNotificationApi()) return false;
  try {
    const result = await window.Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export async function isPermissionGranted(): Promise<boolean> {
  if (!hasNotificationApi()) return false;
  try {
    return window.Notification.permission === 'granted';
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
  if (!hasNotificationApi()) return null;
  if (window.Notification.permission !== 'granted') return null;
  const id = `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fixedTitle = title ?? DEFAULT_TITLE;
  const fixedBody = body ?? DEFAULT_BODY;
  const handle = setInterval(() => {
    try {
      new window.Notification(fixedTitle, { body: fixedBody });
    } catch {
      // swallow — never throw from public API
    }
  }, intervalMin * 60_000);
  intervals.set(id, handle);
  return id;
}

export async function cancelAllReminders(): Promise<void> {
  for (const handle of intervals.values()) {
    clearInterval(handle);
  }
  intervals.clear();
}
