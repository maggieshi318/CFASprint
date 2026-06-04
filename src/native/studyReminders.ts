import { Capacitor } from '@capacitor/core'

const STUDY_REMINDER_ID = 1001

export type ReminderSyncResult =
  | { mode: 'web'; scheduled: false }
  | { mode: 'native'; scheduled: boolean; permissionDenied?: boolean }

export async function syncStudyReminder(enabled: boolean, reminderTime: string): Promise<ReminderSyncResult> {
  if (!Capacitor.isNativePlatform()) {
    return { mode: 'web', scheduled: false }
  }

  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: STUDY_REMINDER_ID }] })

  if (!enabled) {
    return { mode: 'native', scheduled: false }
  }

  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') {
    return { mode: 'native', scheduled: false, permissionDenied: true }
  }

  const [hourRaw, minuteRaw] = reminderTime.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('Invalid reminder time')
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: STUDY_REMINDER_ID,
        title: 'CFA Sprint',
        body: 'Time for your daily CFA Level I practice. Open the app and keep your streak going.',
        schedule: {
          on: { hour, minute },
          every: 'day',
          allowWhileIdle: true,
        },
      },
    ],
  })

  return { mode: 'native', scheduled: true }
}

export async function bootstrapStudyReminder(enabled: boolean, reminderTime: string) {
  try {
    return await syncStudyReminder(enabled, reminderTime)
  } catch {
    return { mode: 'web' as const, scheduled: false }
  }
}
