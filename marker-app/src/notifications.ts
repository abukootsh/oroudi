import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDevice } from './api';

// رسائل تذكير ودّية تصل لمن توقف عن فتح التطبيق.
// تُجدوَل محليًا على الجهاز عند كل فتح للتطبيق (بدون خادم):
// إن فتح المستخدم التطبيق تُلغى ويُعاد جدولتها، وإن لم يفتحه وصلته.
const REMINDERS: { title: string; body: string; days: number }[] = [
  {
    title: '🛒 وحشتنا!',
    body: 'الأسعار تغيّرت من آخر زيارة — شوف وش نزل سعره اليوم قبل لا تتسوق',
    days: 3,
  },
  {
    title: '🏷️ عروض جديدة تنتظرك',
    body: 'خصومات تصل ٧٠٪ في ٩ أسواق — قارن قبل تشتري ولا تدفع أكثر',
    days: 7,
  },
];

export async function scheduleComebackReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const r of REMINDERS) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: r.days * 24 * 60 * 60,
        },
      });
    }
  } catch {
    // الإشعارات كماليّة — لا نُفشل التطبيق بسببها
  }
}

// تسجيل الجهاز في خادم عروضي ليصله الإشعار الجماعي من لوحة التحكم
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;
    await registerDevice(token);
  } catch {
    // يتطلب نسخة مبنية (EAS) — يفشل بصمت في Expo Go
  }
}
