import { LicenseKey, SupportTicket, BypassConfig, LiveActivity } from './types';

export const initialLicenseKeys: LicenseKey[] = [
  {
    id: '1',
    key: 'BYPASS-VIP-99X2-KF82',
    type: '30d',
    status: 'active',
    hwid: 'DESKTOP-8F39A8C',
    createdAt: '2026-07-01 14:30',
    activatedAt: '2026-07-02 09:12',
    expiresAt: '2026-08-01 09:12',
    notes: 'العميل هيثم - نشط ومستقر'
  },
  {
    id: '2',
    key: 'BYPASS-VIP-11A9-PL77',
    type: '24h',
    status: 'unused',
    hwid: null,
    createdAt: '2026-07-08 18:22',
    notes: 'مفتاح تجريبي صالح للبيع'
  },
  {
    id: '3',
    key: 'BYPASS-VIP-55B2-QQ11',
    type: '7d',
    status: 'expired',
    hwid: 'DESKTOP-LQ9921D',
    createdAt: '2026-06-20 10:00',
    activatedAt: '2026-06-20 10:15',
    expiresAt: '2026-06-27 10:15',
    notes: 'عميل منتهي الصلاحية'
  },
  {
    id: '4',
    key: 'BYPASS-VIP-88P3-LK09',
    type: 'lifetime',
    status: 'active',
    hwid: 'DESKTOP-992FF3A',
    createdAt: '2026-05-15 12:00',
    activatedAt: '2026-05-15 13:40',
    expiresAt: 'بدون انتهاء',
    notes: 'مفتاح VIP ذهبي دائم'
  }
];

export const initialSupportTickets: SupportTicket[] = [
  {
    id: '1',
    username: 'Alhanen_95',
    platform: 'Telegram',
    contact: '@Alhanen_95',
    bypassType: 'النسخة العالمية 3.2',
    emulator: 'GameLoop',
    status: 'completed',
    createdAt: '2026-07-08 15:40'
  },
  {
    id: '2',
    username: 'Abu_Jamil',
    platform: 'WhatsApp',
    contact: '+9647701234567',
    bypassType: 'النسخة الكورية',
    emulator: 'LDPlayer',
    status: 'pending',
    createdAt: '2026-07-08 19:12'
  }
];

export const initialBypassConfig: BypassConfig = {
  gameLoopActive: true,
  ldPlayerActive: true,
  mumuPlayerActive: true,
  antiCheatState: 'stealth',
  securityProtocol: 'SSL-V4/MemGuard-V2',
  gameVersion: '3.2 (64-Bit)',
  bypassStatus: 'stable',
  clientVersion: 'v2.8.4-Bypass'
};

export const initialLiveActivities: LiveActivity[] = [
  {
    id: '1',
    user: 'مستخدم 982*',
    action: 'تفعيل مفتاح 24 ساعة بنجاح على GameLoop',
    time: 'منذ دقيقة',
    status: 'success'
  },
  {
    id: '2',
    user: 'مستخدم 112*',
    action: 'محاولة تسجيل دخول من جهاز جديد تم رفضها (تطابق HWID)',
    time: 'منذ 5 دقائق',
    status: 'warning'
  },
  {
    id: '3',
    user: 'السيرفر الرئيسي',
    action: 'تحديث بروتوكول التخطي الفرعي للحماية ضد الكشف الحركي',
    time: 'منذ 12 دقيقة',
    status: 'info'
  },
  {
    id: '4',
    user: 'مستخدم 404*',
    action: 'تفعيل مفتاح شهري على محاكي SmartGaGa',
    time: 'منذ 22 دقيقة',
    status: 'success'
  }
];
