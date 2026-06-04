import { Capacitor } from '@capacitor/core'
import { registerPushToken } from '../api/mockApi'

export async function initRemotePush(token: string) {
  if (!Capacitor.isNativePlatform()) {
    return { mode: 'web' as const }
  }

  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') {
    return { mode: 'native' as const, permissionDenied: true }
  }

  await PushNotifications.register()

  PushNotifications.addListener('registration', async (event) => {
    await registerPushToken(token, event.value, Capacitor.getPlatform())
  })

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[push] registration failed', error)
  })

  return { mode: 'native' as const, registered: true }
}
