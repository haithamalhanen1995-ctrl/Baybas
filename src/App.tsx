import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Shield, 
  Cpu, 
  Key, 
  Terminal, 
  Download, 
  RefreshCw, 
  Users, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Copy, 
  Trash2, 
  Clock, 
  Sliders, 
  ExternalLink,
  Laptop,
  Check,
  Server,
  Heart,
  MessageCircle,
  Search,
  Lock,
  Unlock,
  Ban,
  User
} from 'lucide-react';
import { LicenseKey, SupportTicket, BypassConfig, LiveActivity } from './types';
import { initialLicenseKeys, initialSupportTickets, initialBypassConfig, initialLiveActivities } from './data';
import { 
  seedDatabaseIfEmpty,
  subscribeLicenseKeys,
  saveLicenseKey,
  deleteLicenseKey,
  subscribeSupportTickets,
  saveSupportTicket,
  deleteSupportTicket,
  subscribeBypassConfig,
  saveBypassConfig,
  subscribeLiveActivities,
  saveLiveActivity
} from './firebase';

export default function App() {
  // State management (Now dynamically populated by Firestore real-time listeners)
  const [activeTab, setActiveTab] = useState<'store' | 'admin' | 'diagnostics' | 'developers'>('store');
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>(initialLicenseKeys);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(initialSupportTickets);
  const [bypassConfig, setBypassConfig] = useState<BypassConfig>(initialBypassConfig);
  const [activities, setActivities] = useState<LiveActivity[]>(initialLiveActivities);

  // Active User session tracker
  const [activeUserSession, setActiveUserSession] = useState<LicenseKey | null>(() => {
    const saved = localStorage.getItem('active_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Admin Search & Filter states
  const [adminSearch, setAdminSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'unused' | 'active' | 'expired' | '30d'>('all');

  // Manual Subscription Registration states (For Administrator)
  const [manualName, setManualName] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [manualType, setManualType] = useState<'24h' | '7d' | '30d' | 'lifetime'>('30d');
  const [manualHWID, setManualHWID] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Form states
  const [redeemKeyInput, setRedeemKeyInput] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // New Ticket states
  const [ticketName, setTicketName] = useState('');
  const [ticketContact, setTicketContact] = useState('');
  const [ticketPlatform, setTicketPlatform] = useState<'Telegram' | 'WhatsApp'>('Telegram');
  const [ticketEmulator, setTicketEmulator] = useState('GameLoop');
  const [ticketVersion, setTicketVersion] = useState('مفتاح بايباس شهري (30 يوم)');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Admin Key Generator states
  const [genType, setGenType] = useState<'24h' | '7d' | '30d' | 'lifetime'>('30d');
  const [genCount, setGenCount] = useState(1);
  const [genNotes, setGenNotes] = useState('');
  const [generatedResult, setGeneratedResult] = useState<string[]>([]);

  // Admin Key Testing states
  const [testKeyInput, setTestKeyInput] = useState('');
  const [testResult, setTestResult] = useState<LicenseKey | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testPerformed, setTestPerformed] = useState(false);

  // Developer integration test states
  const [devTestKey, setDevTestKey] = useState('');
  const [devTestHwid, setDevTestHwid] = useState('DESKTOP-TEST-DEVICE');
  const [devTestResponse, setDevTestResponse] = useState<any | null>(null);
  const [devTestLoading, setDevTestLoading] = useState(false);
  const [devSelectedTab, setDevSelectedTab] = useState<'cpp' | 'python' | 'kotlin' | 'curl'>('curl');

  const handleDevApiTest = async (e: FormEvent) => {
    e.preventDefault();
    if (!devTestKey.trim()) {
      showToast('يرجى إدخال مفتاح الترخيص المطلوب فحصه تجريبياً!');
      return;
    }
    setDevTestLoading(true);
    setDevTestResponse(null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: devTestKey.trim(),
          hwid: devTestHwid.trim()
        })
      });
      const data = await res.json();
      setDevTestResponse(data);
      if (data.success) {
        showToast('تم التحقق من الترخيص بنجاح عبر الـ API السحابي!');
      } else {
        showToast(`فشل التحقق: ${data.message}`);
      }
    } catch (err: any) {
      setDevTestResponse({ success: false, error: err.message || err });
      showToast('حدث خطأ أثناء الاتصال بالـ API.');
    } finally {
      setDevTestLoading(false);
    }
  };

  // Simulation status states
  const [ping, setPing] = useState(42);
  const [activeUsersCount, setActiveUsersCount] = useState(1482);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize Firestore collections in real-time
  useEffect(() => {
    // Seed standard database with preset keys/configs if empty
    seedDatabaseIfEmpty();

    // Subscribe to collections with real-time listeners
    const unsubKeys = subscribeLicenseKeys((keys) => {
      setLicenseKeys(keys);
    });

    const unsubTickets = subscribeSupportTickets((tickets) => {
      setSupportTickets(tickets);
    });

    const unsubConfig = subscribeBypassConfig((config) => {
      setBypassConfig(config);
    });

    const unsubActivities = subscribeLiveActivities((acts) => {
      setActivities(acts);
    });

    return () => {
      unsubKeys();
      unsubTickets();
      unsubConfig();
      unsubActivities();
    };
  }, []);

  // Sync active user session to localstorage for tab refresh persistence
  useEffect(() => {
    if (activeUserSession) {
      localStorage.setItem('active_user_session', JSON.stringify(activeUserSession));
      
      // Realtime session check: if the active key is banned/expired/HWID reset in the cloud, sync state
      const currentCloudKey = licenseKeys.find(k => k.id === activeUserSession.id);
      if (currentCloudKey) {
        if (currentCloudKey.status !== 'active' || currentCloudKey.notes?.includes('🛑 [محظور]')) {
          setActiveUserSession(null);
          showToast('تم إلغاء أو حظر اشتراكك الحالي من قبل الإدارة السحابية!');
        } else if (currentCloudKey.hwid === null) {
          setActiveUserSession(null);
          showToast('تمت إعادة تعيين معرّف جهازك من السحابة، يرجى إعادة تسجيل الدخول.');
        } else if (JSON.stringify(currentCloudKey) !== JSON.stringify(activeUserSession)) {
          setActiveUserSession(currentCloudKey);
        }
      }
    } else {
      localStorage.removeItem('active_user_session');
    }
  }, [activeUserSession, licenseKeys]);

  // Synchronize the testResult state if licenseKeys changes in real-time
  useEffect(() => {
    if (testResult) {
      const updated = licenseKeys.find(k => k.id === testResult.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(testResult)) {
        setTestResult(updated);
      }
    }
  }, [licenseKeys, testResult]);

  // Handle live updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate ping slightly
      setPing(prev => Math.max(28, Math.min(65, prev + (Math.random() > 0.5 ? 2 : -2))));
      // Fluctuate active users
      setActiveUsersCount(prev => prev + (Math.random() > 0.5 ? Math.floor(Math.random() * 4) + 1 : -Math.floor(Math.random() * 3)));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to trigger a temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Helper function to copy content to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('تم نسخ الرمز إلى الحافظة بنجاح!');
  };

  // Redeem a license key simulation (Now writing directly to Firestore!)
  const handleRedeemKey = async (e: FormEvent) => {
    e.preventDefault();
    setRedeemSuccess(null);
    setRedeemError(null);

    const trimmed = redeemKeyInput.trim();
    if (!trimmed) {
      setRedeemError('الرجاء إدخال رمز التفعيل أولاً.');
      return;
    }

    const keyIndex = licenseKeys.findIndex(k => k.key.toUpperCase() === trimmed.toUpperCase());
    if (keyIndex === -1) {
      setRedeemError('رمز التفعيل هذا غير صالح أو خاطئ. تأكد من تطابق الرمز بالكامل.');
      return;
    }

    const targetKey = licenseKeys[keyIndex];
    if (targetKey.status === 'expired') {
      setRedeemError('عذراً، هذا المفتاح منتهي الصلاحية بالفعل.');
      return;
    }

    if (targetKey.notes?.includes('🛑 [محظور]')) {
      setRedeemError('عذراً، هذا المفتاح محظور وموقف بالكامل من الإدارة السحابية.');
      return;
    }

    if (targetKey.status === 'active' && targetKey.hwid) {
      setRedeemError(`هذا المفتاح مستخدم بالفعل ومربوط بجهاز (HWID: ${targetKey.hwid}). الرجاء طلب إعادة تعيين HWID من الإدارة.`);
      return;
    }

    // Successfully redeem key in cloud
    const generatedHWID = 'DESKTOP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    const activatedKey: LicenseKey = {
      ...targetKey,
      status: 'active',
      hwid: generatedHWID,
      activatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      expiresAt: targetKey.type === '24h' 
        ? new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16)
        : targetKey.type === '7d'
        ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16)
        : targetKey.type === '30d'
        ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16)
        : 'بدون انتهاء',
      username: 'المشترك الحالي',
      isLocked: true
    };

    await saveLicenseKey(activatedKey);
    setActiveUserSession(activatedKey);
    setRedeemSuccess(`تم تفعيل الاشتراك بنجاح! نوع الاشتراك: ${getTranslatedType(targetKey.type)}. تم ربطه بالجهاز الحالي بنجاح.`);
    
    // Add real cloud activity log
    const newAct: LiveActivity = {
      id: Date.now().toString(),
      user: 'أنت (تفعيل)',
      action: `تفعيل مفتاح ${getTranslatedType(targetKey.type)} جديد بنجاح على محاكي المتصفح`,
      time: 'الآن',
      status: 'success'
    };
    await saveLiveActivity(newAct);
    setRedeemKeyInput('');
  };

  // Logout/Unbind current session
  const handleLogoutSession = () => {
    setActiveUserSession(null);
    showToast('تم تسجيل الخروج وفصل جلسة العمل بنجاح.');
  };

  // Submit Support request (Persisting directly to Firestore!)
  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketName || !ticketContact) {
      alert('الرجاء ملء حقول الاسم وسيلة التواصل.');
      return;
    }

    const newTicket: SupportTicket = {
      id: Date.now().toString(),
      username: ticketName,
      platform: ticketPlatform,
      contact: ticketContact,
      bypassType: ticketVersion,
      emulator: ticketEmulator,
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    await saveSupportTicket(newTicket);
    setTicketSuccess(true);
    setTicketName('');
    setTicketContact('');

    const newAct: LiveActivity = {
      id: Date.now().toString(),
      user: ticketName,
      action: `قدم طلباً جديداً عبر ${ticketPlatform} لمحاكي ${ticketEmulator}`,
      time: 'الآن',
      status: 'info'
    };
    await saveLiveActivity(newAct);

    setTimeout(() => {
      setTicketSuccess(false);
    }, 5000);
  };

  // Generate Keys Admin action (Writing to cloud!)
  const handleGenerateKeys = async (e: FormEvent) => {
    e.preventDefault();
    const newKeysList: string[] = [];

    for (let i = 0; i < genCount; i++) {
      const segment1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const fullKey = `BYPASS-VIP-${segment1}-${segment2}`;
      
      const newKeyObj: LicenseKey = {
        id: (Date.now() + i).toString(),
        key: fullKey,
        type: genType,
        status: 'unused',
        hwid: null,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        notes: genNotes || 'مفتاح مولد آلياً'
      };

      await saveLicenseKey(newKeyObj);
      newKeysList.push(fullKey);
    }

    setGeneratedResult(newKeysList);
    setGenNotes('');
    showToast(`تم توليد ${genCount} مفتاح سحابي بنجاح!`);

    const newAct: LiveActivity = {
      id: Date.now().toString(),
      user: 'الأدمن',
      action: `قام بتوليد ${genCount} مفتاح من فئة ${getTranslatedType(genType)} سحابي جديد`,
      time: 'الآن',
      status: 'info'
    };
    await saveLiveActivity(newAct);
  };

  // Admin registers a subscription directly to cloud
  const handleAddManualSubscription = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualKey) {
      showToast('الرجاء كتابة اسم العميل ومفتاح الاشتراك!');
      return;
    }

    try {
      // Check if key is unique
      const keyExists = licenseKeys.some(k => k.key.toUpperCase() === manualKey.trim().toUpperCase());
      if (keyExists) {
        showToast('خطأ: رمز الترخيص هذا موجود بالفعل في قاعدة البيانات!');
        return;
      }

      const simulatedHWID = manualHWID.trim() || 'DESKTOP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const activeDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
      
      const newKeyObj: LicenseKey = {
        id: Date.now().toString(),
        key: manualKey.trim().toUpperCase(),
        type: manualType,
        status: 'active',
        hwid: simulatedHWID,
        createdAt: activeDate,
        activatedAt: activeDate,
        expiresAt: manualType === '24h' 
          ? new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16)
          : manualType === '7d'
          ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16)
          : manualType === '30d'
          ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16)
          : 'بدون انتهاء',
        notes: manualNotes.trim() || `تفعيل يدوي للعميل ${manualName}`,
        username: manualName.trim(),
        isLocked: true
      };

      await saveLicenseKey(newKeyObj);
      setManualName('');
      setManualKey('');
      setManualHWID('');
      setManualNotes('');
      showToast(`تم تفعيل وتسجيل الاشتراك للعميل ${manualName} بنجاح في السحابة!`);

      const newAct: LiveActivity = {
        id: Date.now().toString(),
        user: 'الأدمن',
        action: `تفعيل اشتراك فوري يدوي للمشترك ${manualName} وسحبه سحابياً`,
        time: 'الآن',
        status: 'success'
      };
      await saveLiveActivity(newAct).catch(err => console.warn("Failed to write manual live activity:", err));
    } catch (error: any) {
      console.error("Error adding manual subscription:", error);
      showToast(`فشل في تسجيل العميل: ${error.message || error}`);
    }
  };

  // Admin resets HWID in cloud
  const handleResetHWID = async (id: string) => {
    try {
      const target = licenseKeys.find(k => k.id === id);
      if (target) {
        const updatedKey: LicenseKey = { 
          ...target, 
          hwid: null, 
          activatedAt: undefined, 
          expiresAt: undefined, 
          status: 'unused', 
          isLocked: false 
        };
        await saveLicenseKey(updatedKey);
        showToast('تمت إعادة تعيين معرّف الجهاز (HWID) بنجاح في السحابة!');
      }
    } catch (error: any) {
      console.error("Error resetting HWID:", error);
      showToast(`فشل في إعادة تعيين HWID: ${error.message || error}`);
    }
  };

  // Admin extends subscription duration in cloud
  const handleExtendSubscription = async (id: string, days: number = 30) => {
    try {
      const target = licenseKeys.find(k => k.id === id);
      if (target) {
        let currentExpiry = target.expiresAt;
        let newExpiryDate: Date;
        if (currentExpiry && currentExpiry !== 'بدون انتهاء') {
          const parts = currentExpiry.split(' ');
          const datePart = parts[0];
          newExpiryDate = new Date(new Date(datePart).getTime() + days * 24 * 3600 * 1000);
        } else {
          newExpiryDate = new Date(Date.now() + days * 24 * 3600 * 1000);
        }
        const newExpiryStr = newExpiryDate.toISOString().replace('T', ' ').substring(0, 16);
        
        const updatedKey: LicenseKey = { 
          ...target, 
          status: 'active', 
          expiresAt: target.type === 'lifetime' ? 'بدون انتهاء' : newExpiryStr 
        };
        await saveLicenseKey(updatedKey);
        showToast(`تم تمديد اشتراك العميل بنجاح لمدة ${days} يوماً إضافياً سحابياً!`);
      }
    } catch (error: any) {
      console.error("Error extending subscription:", error);
      showToast(`فشل في تمديد الاشتراك: ${error.message || error}`);
    }
  };

  // Admin toggles lock state for HWID in cloud
  const handleToggleLockKey = async (id: string) => {
    try {
      const target = licenseKeys.find(k => k.id === id);
      if (target) {
        const nextState = !target.isLocked;
        const updatedKey: LicenseKey = { ...target, isLocked: nextState };
        await saveLicenseKey(updatedKey);
        showToast(nextState ? 'تم قفل جهاز العميل بنجاح لمنع نقل الترخيص سحابياً.' : 'تم إلغاء قفل جهاز العميل سحابياً.');
      }
    } catch (error: any) {
      console.error("Error toggling lock state:", error);
      showToast(`فشل في تغيير حالة قفل الجهاز: ${error.message || error}`);
    }
  };

  // Admin toggles ban state for key in cloud
  const handleToggleBanKey = async (id: string) => {
    try {
      const target = licenseKeys.find(k => k.id === id);
      if (target) {
        const isBanned = target.notes?.includes('🛑 [محظور]');
        let newNotes = target.notes || '';
        let updatedKey: LicenseKey;
        if (isBanned) {
          newNotes = newNotes.replace('🛑 [محظور] ', '');
          updatedKey = { ...target, status: 'active', notes: newNotes };
          await saveLicenseKey(updatedKey);
          showToast('تم إلغاء حظر العميل بنجاح وتم تنشيط اشتراكه سحابياً.');
        } else {
          newNotes = '🛑 [محظور] ' + newNotes;
          updatedKey = { ...target, status: 'expired', notes: newNotes };
          await saveLicenseKey(updatedKey);
          showToast('تم حظر هذا العميل وإيقاف ترخيصه فورياً سحابياً!');
        }
      }
    } catch (error: any) {
      console.error("Error toggling ban state:", error);
      showToast(`فشل في تبديل حالة حظر العميل: ${error.message || error}`);
    }
  };

  // Admin deletes key from cloud
  const handleDeleteKey = async (id: string) => {
    try {
      await deleteLicenseKey(id);
      showToast('تم حذف المفتاح من قاعدة البيانات السحابية.');
    } catch (error: any) {
      console.error("Error deleting key:", error);
      showToast(`فشل في حذف المفتاح: ${error.message || error}`);
    }
  };

  // Admin tests a license key to see if it is valid and returns its state
  const handleTestKey = (e: FormEvent) => {
    e.preventDefault();
    setTestError(null);
    setTestResult(null);
    setTestPerformed(true);

    if (!testKeyInput.trim()) {
      setTestError('الرجاء إدخال المفتاح المطلوب فحصه!');
      return;
    }

    const trimmedKey = testKeyInput.trim();
    // Search both key.key and key.id
    const found = licenseKeys.find(k => k.key === trimmedKey || k.id === trimmedKey);
    if (found) {
      setTestResult(found);
    } else {
      setTestError('المفتاح غير موجود في قاعدة البيانات السحابية (غير صالح أو تم حذفه).');
    }
  };

  // Change emulator states in cloud
  const toggleEmulatorState = async (emu: 'gameLoop' | 'ldPlayer' | 'mumuPlayer') => {
    const updated = { ...bypassConfig };
    if (emu === 'gameLoop') updated.gameLoopActive = !updated.gameLoopActive;
    if (emu === 'ldPlayer') updated.ldPlayerActive = !updated.ldPlayerActive;
    if (emu === 'mumuPlayer') updated.mumuPlayerActive = !updated.mumuPlayerActive;
    await saveBypassConfig(updated);
    showToast('تم تحديث حالة التوافق في خادم الحماية السحابي.');
  };

  // Toggle anti cheat level state in cloud
  const handleBypassSafetyChange = async (status: 'stable' | 'updating' | 'offline') => {
    const updated = { ...bypassConfig, bypassStatus: status };
    await saveBypassConfig(updated);
    showToast(`تم تحويل حالة البايباس السحابية العامة إلى: ${status === 'stable' ? 'آمن ومستقر' : status === 'updating' ? 'قيد التحديث' : 'متوقف مؤقتاً'}`);
  };

  const handleUpdateConfigField = async (field: keyof BypassConfig, value: any) => {
    const updated = { ...bypassConfig, [field]: value };
    await saveBypassConfig(updated);
  };

  const getTranslatedType = (type: string) => {
    switch (type) {
      case '24h': return 'يومي (24 ساعة)';
      case '7d': return 'أسبوعي (7 أيام)';
      case '30d': return 'شهري (30 يوم)';
      case 'lifetime': return 'دائم مدى الحياة';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] relative overflow-x-hidden font-sans pb-16 selection:bg-purple-600 selection:text-white">
      
      {/* Absolute background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-5 z-50 bg-[#151f32] border-r-4 border-purple-500 text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 glow-purple transition-all duration-300 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Top Protection & Realtime Header Info Bar */}
      <div className="bg-[#0b1322] border-b border-[#1e2d44] py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>الخادم الرئيسي:</span>
              <span className="text-emerald-400 font-mono font-bold">متصل (Online)</span>
            </span>
            <span className="w-1 h-1 bg-gray-700 rounded-full hidden sm:inline" />
            <span className="flex items-center gap-1.5 text-gray-400">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>إصدار اللعبة:</span>
              <span className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{bypassConfig.gameVersion}</span>
            </span>
            <span className="w-1 h-1 bg-gray-700 rounded-full hidden sm:inline" />
            <span className="flex items-center gap-1.5 text-gray-400">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>بروتوكول التشفير:</span>
              <span className="text-purple-300 font-mono text-[10px]">{bypassConfig.securityProtocol}</span>
            </span>
          </div>

          <div className="flex items-center gap-5 flex-wrap justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-gray-400">زمن الاستجابة:</span>
              <span className="font-mono text-emerald-400 font-bold">{ping}ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-gray-400">المشتركون النشطون حالياً:</span>
              <span className="font-mono text-white font-bold">{activeUsersCount.toLocaleString()} لاعب</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Beautiful Header Navigation */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="bg-[#0f172a]/90 backdrop-blur border border-[#1e293b] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">بايباس ببجي الممتاز</h1>
                <span className="bg-purple-900/60 border border-purple-500/50 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">VIP EDITION</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">لوحة التحكم السحابية وإدارة مفاتيح تخطي محاكيات الكمبيوتر</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-[#090d16] p-1.5 rounded-xl border border-[#1e2d44] w-full md:w-auto flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('store')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'store' 
                  ? 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>بوابة المشتركين والخدمات</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'admin' 
                  ? 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>إدارة المفاتيح والأعضاء</span>
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {licenseKeys.filter(k => k.status === 'unused').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'diagnostics' 
                  ? 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>التحكم في السيرفر والمحاكاة</span>
            </button>
            <button
              onClick={() => setActiveTab('developers')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'developers' 
                  ? 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>ربط وتطوير البايباس</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Core Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">

        {/* Dynamic Status Banner */}
        <div className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
          bypassConfig.bypassStatus === 'stable'
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : bypassConfig.bypassStatus === 'updating'
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            : 'bg-red-950/20 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                bypassConfig.bypassStatus === 'stable' ? 'bg-emerald-400' : bypassConfig.bypassStatus === 'updating' ? 'bg-amber-400' : 'bg-red-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                bypassConfig.bypassStatus === 'stable' ? 'bg-emerald-500' : bypassConfig.bypassStatus === 'updating' ? 'bg-amber-500' : 'bg-red-500'
              }`}></span>
            </span>
            <div>
              <p className="font-bold text-sm">
                حالة نظام البايباس الكلية: {
                  bypassConfig.bypassStatus === 'stable' 
                    ? 'آمن ومستقر 100% (تجاوز نشط بدون حظر)' 
                    : bypassConfig.bypassStatus === 'updating' 
                    ? 'قيد التحديث والصيانة الوقائية (يرجى الانتظار)' 
                    : 'متوقف مؤقتاً لأعمال الصيانة الكبرى'
                }
              </p>
              <p className="text-xs text-gray-400 mt-0.5">تاريخ الفحص التلقائي الأخير: اليوم، 19:15 مساءً</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">التوافق النشط:</span>
            <div className="flex gap-1.5">
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${bypassConfig.gameLoopActive ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'bg-gray-800 text-gray-500'}`}>GameLoop</span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${bypassConfig.ldPlayerActive ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'bg-gray-800 text-gray-500'}`}>LDPlayer</span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${bypassConfig.mumuPlayerActive ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'bg-gray-800 text-gray-500'}`}>MuMu Player</span>
            </div>
          </div>
        </div>

        {/* ----------------- TAB 1: STORE & USER PANEL ----------------- */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle Columns: Details card & key validation */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Main Service description card (directly matches uploaded image details) */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-600/10 to-transparent rounded-full pointer-events-none" />
                
                <h3 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <span>تفاصيل ووصف خدمة بايباس ببجي</span>
                </h3>

                <div className="text-gray-300 space-y-4 text-sm leading-relaxed">
                  <p className="bg-purple-950/20 border-r-4 border-purple-500 p-4 rounded text-purple-200">
                    <strong>#ملاحظة هامة:</strong> لتفعيل الخدمة الفورية يرجى إدخال رمز تفعيل الاشتراك الخاص بك أدناه، أو مراسلتنا فوراً على الواتساب أو التليجرام للحصول على مفتاح فوري.
                  </p>
                  
                  <p className="font-semibold text-white text-base">
                    استمتع بتجربة لعب لا مثيل لها مع أقوى حلول التخطي المتطورة في الوطن العربي.
                  </p>

                  <p>
                    تم تصميم أدوات الحماية السحابية والتخطي الخاصة بنا بعناية فائقة لتوفير أداء استثنائي وتوافق تام مع أشهر المحاكيات العالمية: 
                    <strong className="text-purple-300"> GameLoop, LDPlayer, MuMu Player, و SmartGaGa</strong>.
                  </p>

                  <p>
                    يوفر إطار عملنا السيرفر عالي الأمان اتصالاً مستقراً 100% مع الحفاظ المطلق على خصوصية اللاعب ومعلومات الحساب، وحمايته من التعرف الكاشف لمحاكاة الجوال.
                  </p>

                  <div className="border-t border-[#1e2d44] pt-4 mt-6">
                    <h4 className="font-bold text-white mb-3">المميزات الرئيسية للبايباس:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                        <div>
                          <strong className="text-white text-xs block">توافق شامل ومحسّن</strong>
                          <span className="text-xs text-gray-400">تحسين كامل للعمل مع محاكيات MuMu Player, LDPlayer, GameLoop.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                        <div>
                          <strong className="text-white text-xs block">حماية بروتوكولية معززة</strong>
                          <span className="text-xs text-gray-400">خوارزميات تشفير الذاكرة لضمان بيئة لعب آمنة تماماً ضد البلاغات والكشف.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                        <div>
                          <strong className="text-white text-xs block">أداء مستقر بدون تقطيع</strong>
                          <span className="text-xs text-gray-400">تحسين سرعة الاستجابة ومعدل الإطارات (FPS) لضمان تجربة لعب سلسة للغاية.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                        <div>
                          <strong className="text-white text-xs block">تركيز كامل على التخفي</strong>
                          <span className="text-xs text-gray-400">تقنيات متطورة تحاكي سلوك لاعب الهاتف الحقيقي بدقة لمنع كشف أنماط اللعب.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <a 
                    href="https://t.me/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 min-w-[150px] bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all text-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>تواصل عبر التليجرام</span>
                  </a>
                  <a 
                    href="https://wa.me/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 min-w-[150px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>تواصل عبر الواتساب</span>
                  </a>
                </div>
              </div>

              {/* Active Session Panel */}
              {activeUserSession && (
                <div className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden glow-emerald">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-600/10 to-transparent rounded-full pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1e2d44] pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">ترخيص نشط ومحمي</span>
                        <h4 className="font-bold text-base text-white mt-0.5">تفاصيل اشتراكك الحالي (VIP Session)</h4>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogoutSession}
                      className="bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      فصل الجلسة / خروج
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#1e2d44]">
                      <span className="text-gray-400 block mb-1">رمز الاشتراك المستخدم:</span>
                      <span className="font-mono text-purple-300 font-bold select-all bg-slate-900 px-2 py-0.5 rounded inline-block">{activeUserSession.key}</span>
                    </div>
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#1e2d44]">
                      <span className="text-gray-400 block mb-1">فئة ومستوى العضوية:</span>
                      <span className="text-white font-bold">{getTranslatedType(activeUserSession.type)}</span>
                    </div>
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#1e2d44]">
                      <span className="text-gray-400 block mb-1">جهازك المسجل (HWID):</span>
                      <span className="font-mono text-emerald-400 font-bold select-all bg-slate-900 px-2 py-0.5 rounded inline-block">{activeUserSession.hwid}</span>
                    </div>
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#1e2d44]">
                      <span className="text-gray-400 block mb-1">تاريخ تفعيل الاشتراك:</span>
                      <span className="text-gray-200">{activeUserSession.activatedAt}</span>
                    </div>
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#1e2d44]">
                      <span className="text-gray-400 block mb-1">تاريخ انتهاء الاشتراك:</span>
                      <span className="text-red-400 font-bold">{activeUserSession.expiresAt}</span>
                    </div>
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#1e2d44] flex flex-col justify-center">
                      <span className="text-gray-400 block mb-1">حالة التخطي (Anti-Ban):</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>فعال وآمن 100%</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-emerald-300">اللودر الذكي جاهز للاستخدام على جهازك:</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => showToast('جاري تشغيل اللودر المدمج ومزامنة ملفات التخطي...')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                        <span>تشغيل البايباس الفوري</span>
                      </button>
                      <button 
                        onClick={() => showToast('تم تحديث جدار حماية الذاكرة لـ PUBG Mobile بنجاح!')}
                        className="bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs px-3 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        تحديث الحماية (MemGuard)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activation Card / Redemption Center */}
              <div id="activation-card" className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl relative">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  <span>تفعيل مفتاح اشتراك البايباس VIP</span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  أدخل رمز ترخيص البايباس الخاص بك لتفعيل رخصة اللعب فورياً وربط جهازك (HWID) بخادم الحماية.
                </p>

                <form onSubmit={handleRedeemKey} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">رمز التفعيل (License Key)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="مثال: BYPASS-VIP-XXXX-YYYY"
                        value={redeemKeyInput}
                        onChange={(e) => setRedeemKeyInput(e.target.value)}
                        className="flex-1 bg-[#090d16] border border-[#1e2d44] rounded-xl px-4 py-3 text-sm font-mono text-center tracking-wider text-white focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <button 
                        type="submit"
                        className="bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all shrink-0"
                      >
                        تفعيل الترخيص
                      </button>
                    </div>
                  </div>

                  {redeemSuccess && (
                    <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">تم التفعيل بنجاح!</p>
                        <p className="mt-1">{redeemSuccess}</p>
                      </div>
                    </div>
                  )}

                  {redeemError && (
                    <div className="p-4 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">فشل التفعيل</p>
                        <p className="mt-1">{redeemError}</p>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Client Center: Instruction and files download simulator */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-400" />
                  <span>مركز تحميل أداة التخطي والتعليمات</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#090d16] border border-[#1e2d44] p-4 rounded-xl space-y-2">
                    <span className="text-[10px] bg-purple-900/40 text-purple-300 font-bold px-2 py-0.5 rounded">اللودر الرئيسي</span>
                    <h4 className="font-bold text-sm text-white">PUBG_Bypass_Loader_v2.8.msi</h4>
                    <p className="text-xs text-gray-400">إصدار التثبيت الذكي مع جدار الحماية ضد البلاغات والاتصال الآمن.</p>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">الحجم: 14.8 MB</span>
                      <button 
                        onClick={() => showToast('بدأ تحميل ملف اللودر في المتصفح...')}
                        className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل اللودر</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#090d16] border border-[#1e2d44] p-4 rounded-xl space-y-2">
                    <span className="text-[10px] bg-purple-900/40 text-purple-300 font-bold px-2 py-0.5 rounded">دليل التثبيت الآمن</span>
                    <h4 className="font-bold text-sm text-white">دليل التشغيل بالفيديو والصور.zip</h4>
                    <p className="text-xs text-gray-400">خطوة بخطوة لشرح ضبط المحاكيات ومنع كشف الجهاز لـ PUBG.</p>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">الحجم: 32.1 MB</span>
                      <button 
                        onClick={() => showToast('بدأ تحميل دليل التشغيل...')}
                        className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل الدليل</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-slate-900/40 border border-[#1e2d44] rounded-xl text-xs space-y-2">
                  <h4 className="font-bold text-white flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>تعليمات التشغيل الآمن لمنع الحظر:</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>قم بتحميل وتثبيت اللودر كمسؤول (Run as administrator).</li>
                    <li>افتح اللودر، وأدخل مفتاح الاشتراك (الذي تم تفعيله أعلاه) ثم اضغط "اتصال".</li>
                    <li>قم بفتح المحاكي المطلوب (GameLoop / LDPlayer) فقط بعد تأكيد اللودر نجاح الاتصال.</li>
                    <li>لا تغير إعدادات كارت الشاشة أو الـ Core أثناء اللعب منعاً لكشف الفوارق الحركية.</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* Right Column: Pricing Plans & Support Submission Card */}
            <div className="space-y-6">
              
              {/* Subscription Plans Card */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-1.5">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  <span>خطط بايباس ببجي المتاحة للطلب</span>
                </h3>

                <div className="space-y-3">
                  
                  {/* Plan 1 */}
                  <div className="bg-[#090d16] border border-[#1e2d44] p-4 rounded-xl relative hover:border-purple-500/50 transition-all">
                    <span className="absolute top-3 left-3 bg-slate-800 text-gray-300 text-[9px] px-1.5 py-0.5 rounded font-bold">الأكثر تجربة</span>
                    <h4 className="font-extrabold text-sm text-white">مفتاح بايباس يومي (24 ساعة)</h4>
                    <p className="text-xs text-gray-400 mt-1">تخطي كامل لجميع كشوفات المحاكي واللعب ضد لاعبين الجوال.</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-purple-400 font-mono font-bold text-sm">$4.99 / يوم</span>
                      <button 
                        onClick={() => {
                          setTicketVersion('مفتاح بايباس يومي (24 ساعة)');
                          setTicketPlatform('Telegram');
                          const element = document.getElementById('request-form');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                          showToast('تم تحديد الخطة اليومية للطلب!');
                        }}
                        className="bg-purple-900/40 hover:bg-purple-600 text-purple-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-purple-500/20"
                      >
                        طلب مفتاح
                      </button>
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div className="bg-[#090d16] border border-purple-500/40 p-4 rounded-xl relative glow-purple hover:border-purple-500 transition-all">
                    <span className="absolute top-3 left-3 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">الأكثر طلباً</span>
                    <h4 className="font-extrabold text-sm text-white">مفتاح بايباس أسبوعي (7 أيام)</h4>
                    <p className="text-xs text-gray-400 mt-1">مفتاح VIP للعب الممتد مع تحديث تلقائي أسبوعي للحماية ضد البلاغات.</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-purple-400 font-mono font-bold text-sm">$19.99 / أسبوع</span>
                      <button 
                        onClick={() => {
                          setTicketVersion('مفتاح بايباس أسبوعي (7 أيام)');
                          setTicketPlatform('Telegram');
                          const element = document.getElementById('request-form');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                          showToast('تم تحديد الخطة الأسبوعية للطلب!');
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow"
                      >
                        طلب مفتاح
                      </button>
                    </div>
                  </div>

                  {/* Plan 3 */}
                  <div className="bg-[#090d16] border border-[#1e2d44] p-4 rounded-xl relative hover:border-purple-500/50 transition-all">
                    <h4 className="font-extrabold text-sm text-white">مفتاح بايباس شهري (30 يوم)</h4>
                    <p className="text-xs text-gray-400 mt-1">توفير رائع للاعبين المحترفين وصانعي المحتوى مع ميزة حظر إعادة التفعيل للجهاز.</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-purple-400 font-mono font-bold text-sm">$49.99 / شهر</span>
                      <button 
                        onClick={() => {
                          setTicketVersion('مفتاح بايباس شهري (30 يوم)');
                          setTicketPlatform('Telegram');
                          const element = document.getElementById('request-form');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                          showToast('تم تحديد الخطة الشهرية للطلب!');
                        }}
                        className="bg-purple-900/40 hover:bg-purple-600 text-purple-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-purple-500/20"
                      >
                        طلب مفتاح
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Support & Request Form Card */}
              <div id="request-form" className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                  <Send className="w-5 h-5 text-purple-400" />
                  <span>طلب شراء فوري أو دعم فني</span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  املأ هذا النموذج ليقوم المشرف بالتواصل معك وتجهيز مفتاح البايباس فورياً.
                </p>

                {ticketSuccess ? (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs space-y-2 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                    <p className="font-bold">تم إرسال طلبك بنجاح!</p>
                    <p>سيقوم مشرف المبيعات بالتواصل معك فورياً لتسليمك مفتاح التفعيل.</p>
                  </div>
                ) : (
                  <form onSubmit={handleCreateTicket} className="space-y-3.5">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">اسم المستخدم الخاص بك</label>
                      <input 
                        type="text" 
                        placeholder="مثال: علي الحربي"
                        required
                        value={ticketName}
                        onChange={(e) => setTicketName(e.target.value)}
                        className="w-full bg-[#090d16] border border-[#1e2d44] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">وسيلة التواصل</label>
                        <select 
                          value={ticketPlatform} 
                          onChange={(e) => setTicketPlatform(e.target.value as 'Telegram' | 'WhatsApp')}
                          className="w-full bg-[#090d16] border border-[#1e2d44] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="Telegram">تليجرام (Telegram)</option>
                          <option value="WhatsApp">واتساب (WhatsApp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">رقم الهاتف أو المعرّف</label>
                        <input 
                          type="text" 
                          placeholder={ticketPlatform === 'Telegram' ? '@username' : '00964...'}
                          required
                          value={ticketContact}
                          onChange={(e) => setTicketContact(e.target.value)}
                          className="w-full bg-[#090d16] border border-[#1e2d44] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">المحاكي المستخدم</label>
                      <select 
                        value={ticketEmulator}
                        onChange={(e) => setTicketEmulator(e.target.value)}
                        className="w-full bg-[#090d16] border border-[#1e2d44] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="GameLoop">محاكي GameLoop</option>
                        <option value="LDPlayer">محاكي LDPlayer</option>
                        <option value="MuMu Player">محاكي MuMu Player</option>
                        <option value="SmartGaGa">محاكي SmartGaGa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">الخطة المطلوبة لشراء مفتاح</label>
                      <select 
                        value={ticketVersion}
                        onChange={(e) => setTicketVersion(e.target.value)}
                        className="w-full bg-[#090d16] border border-[#1e2d44] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="مفتاح بايباس يومي (24 ساعة)">مفتاح بايباس يومي (24 ساعة) - $4.99</option>
                        <option value="مفتاح بايباس أسبوعي (7 أيام)">مفتاح بايباس أسبوعي (7 أيام) - $19.99</option>
                        <option value="مفتاح بايباس شهري (30 يوم)">مفتاح بايباس شهري (30 يوم) - $49.99</option>
                        <option value="مفتاح بايباس دائم مدى الحياة">مفتاح بايباس دائم مدى الحياة - $149.99</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال طلب الشراء فورياً</span>
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ----------------- TAB 2: ADMIN PANEL ----------------- */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            
            {/* Upper: Statistics Cards & Forms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* Key Generator Form */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-[#1e2d44] pb-2.5">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>توليد مفاتيح VIP تلقائياً</span>
                </h3>

                <form onSubmit={handleGenerateKeys} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">فئة المفتاح المراد توليده</label>
                    <select 
                      value={genType}
                      onChange={(e) => setGenType(e.target.value as any)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="24h">يومي (24 ساعة)</option>
                      <option value="7d">أسبوعي (7 أيام)</option>
                      <option value="30d">شهري (30 يوم)</option>
                      <option value="lifetime">دائم مدى الحياة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">الكمية المطلوبة (الحد الأقصى: 20)</label>
                    <input 
                      type="number"
                      min="1"
                      max="20"
                      value={genCount}
                      onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ملاحظة للترخيص</label>
                    <input 
                      type="text"
                      placeholder="مثال: بيع للعميل أحمد"
                      value={genNotes}
                      onChange={(e) => setGenNotes(e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                  >
                    توليد وحفظ المفاتيح السحابية
                  </button>
                </form>

                {/* Last generated result list */}
                {generatedResult.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-purple-300">المفاتيح المولدة حديثاً (يرجى نسخها):</p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {generatedResult.map((k, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#090d16] border border-[#1e2d44] px-2 py-1.5 rounded text-xs font-mono">
                          <span className="text-white select-all text-[11px]">{k}</span>
                          <button 
                            onClick={() => copyToClipboard(k)}
                            className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>نسخ</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Manual Registration Form (REQUESTED) */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-[#1e2d44] pb-2.5">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>تسجيل وتفعيل مشترك يدوي فورياً</span>
                </h3>

                <form onSubmit={handleAddManualSubscription} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">اسم العميل الثلاثي</label>
                    <input 
                      type="text"
                      placeholder="مثال: يوسف خالد التميمي"
                      required
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">رمز الاشتراك المقترح (أو تفريد تلقائي)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="BYPASS-VIP-XXXX-YYYY"
                        required
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        className="flex-1 bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const s1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                          const s2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                          setManualKey(`BYPASS-VIP-${s1}-${s2}`);
                        }}
                        className="bg-slate-800 text-gray-300 px-2.5 rounded-xl text-xs hover:bg-slate-700 transition-all cursor-pointer"
                        title="توليد رمز اشتراك فريد للعميل"
                      >
                        توليد رمز
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">فئة ومستوى العضوية</label>
                      <select 
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value as any)}
                        className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="24h">يومي (24 ساعة)</option>
                        <option value="7d">أسبوعي (7 أيام)</option>
                        <option value="30d">شهري (30 يوم)</option>
                        <option value="lifetime">دائم مدى الحياة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">تثبيت معرّف HWID (اختياري)</label>
                      <input 
                        type="text"
                        placeholder="اتركه فارغاً للتثبيت التلقائي"
                        value={manualHWID}
                        onChange={(e) => setManualHWID(e.target.value)}
                        className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-2 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ملاحظات العميل والتسديد</label>
                    <input 
                      type="text"
                      placeholder="مثال: تم الدفع شهرياً كاش بالدولار"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                  >
                    إرسال وتسجيل العميل الفوري
                  </button>
                </form>
              </div>

              {/* Server Stats Card */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-[#1e2d44] pb-2.5">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>تحليلات وإحصائيات المفاتيح</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 my-auto">
                  <div className="bg-[#090d16] border border-[#1e2d44] p-3 rounded-xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">غير مبيعة (Unused)</span>
                    <span className="text-xl font-bold font-mono text-purple-400">
                      {licenseKeys.filter(k => k.status === 'unused').length}
                    </span>
                  </div>
                  <div className="bg-[#090d16] border border-[#1e2d44] p-3 rounded-xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">النشطة والمسجلة</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {licenseKeys.filter(k => k.status === 'active').length}
                    </span>
                  </div>
                  <div className="bg-[#090d16] border border-[#1e2d44] p-3 rounded-xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">منتهية أو محظورة</span>
                    <span className="text-xl font-bold font-mono text-red-400">
                      {licenseKeys.filter(k => k.status === 'expired').length}
                    </span>
                  </div>
                  <div className="bg-[#090d16] border border-[#1e2d44] p-3 rounded-xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">إجمالي التراخيص</span>
                    <span className="text-xl font-bold font-mono text-white">
                      {licenseKeys.length}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e2d44] flex items-center justify-between text-xs mt-4">
                  <span className="text-gray-400">سحاب الحماية:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span>متصل وبحالة ممتازة</span>
                  </span>
                </div>
              </div>

              {/* Quick License Key Tester Card */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-[#1e2d44] pb-2.5">
                    <Search className="w-4 h-4 text-purple-400" />
                    <span>أداة فحص واختبار التراخيص سحابياً</span>
                  </h3>
                  
                  <form onSubmit={handleTestKey} className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">أدخل مفتاح الاشتراك أو المعرف للفحص</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="BYPASS-VIP-..."
                          value={testKeyInput}
                          onChange={(e) => setTestKeyInput(e.target.value)}
                          className="flex-1 bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono text-center"
                        />
                        <button 
                          type="submit"
                          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          فحص
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="mt-4 space-y-2">
                    {!testPerformed && (
                      <div className="text-center text-xs text-gray-500 py-4 bg-slate-900/20 border border-[#1e2d44] rounded-xl border-dashed">
                        أدخل مفتاح اشتراك أعلاه واضغط فحص للتحقق من الصلاحية، الـ HWID والحظر فورياً.
                      </div>
                    )}

                    {testPerformed && testError && (
                      <div className="p-3 bg-red-950/25 border border-red-500/30 rounded-xl text-center text-xs text-red-400 font-semibold animate-pulse">
                        {testError}
                      </div>
                    )}

                    {testPerformed && testResult && (
                      <div className="p-3 bg-[#090d16] border border-[#1e2d44] rounded-xl space-y-2.5 text-xs text-right" dir="rtl">
                        <div className="flex items-center justify-between border-b border-[#1e2d44] pb-1.5">
                          <span className="text-gray-400 font-semibold">المشترك:</span>
                          <span className="text-white font-bold">{testResult.username || 'عميل محتمل (غير مبيّع)'}</span>
                        </div>

                        <div className="flex items-center justify-between border-b border-[#1e2d44] pb-1.5">
                          <span className="text-gray-400 font-semibold">فئة الاشتراك:</span>
                          <span className="text-purple-300 font-bold">{getTranslatedType(testResult.type)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between border-b border-[#1e2d44] pb-1.5">
                          <span className="text-gray-400 font-semibold">الحالة الأمنية:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            testResult.notes?.includes('🛑 [محظور]')
                              ? 'bg-red-950 text-red-400 border border-red-500/30'
                              : testResult.status === 'active' 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                                : testResult.status === 'expired' 
                                  ? 'bg-red-950 text-red-400 border border-red-500/30' 
                                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          }`}>
                            {testResult.notes?.includes('🛑 [محظور]') 
                              ? '🛑 محظور وموقوف' 
                              : testResult.status === 'active' 
                                ? '🟢 نشط ومفعّل' 
                                : testResult.status === 'expired' 
                                  ? '🔴 منتهي الصلاحية' 
                                  : '🟡 متاح وغير مستخدم بعد'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-b border-[#1e2d44] pb-1.5">
                          <span className="text-gray-400 font-semibold">معرّف الجهاز:</span>
                          <span className="text-white font-mono text-[10px] select-all truncate max-w-[140px]" title={testResult.hwid || 'غير مرتبط'}>
                            {testResult.hwid || 'غير مرتبط بجهاز'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-b border-[#1e2d44] pb-1.5">
                          <span className="text-gray-400 font-semibold">تاريخ الانتهاء:</span>
                          <span className="text-amber-400 font-mono text-[10px]">
                            {testResult.expiresAt || 'بانتظار التفعيل الأول'}
                          </span>
                        </div>

                        {testResult.notes && (
                          <div className="border-b border-[#1e2d44] pb-1.5">
                            <span className="text-gray-400 font-semibold block mb-1 text-right">ملاحظات الترخيص:</span>
                            <span className="text-gray-300 text-[10px] block text-right break-words bg-slate-900/50 p-2 rounded border border-[#1e2d44]">
                              {testResult.notes}
                            </span>
                          </div>
                        )}

                        {/* Fast Actions inside Tester panel */}
                        <div className="pt-2 flex flex-wrap gap-1.5 justify-center">
                          {testResult.hwid && (
                            <button 
                              onClick={() => handleResetHWID(testResult.id)}
                              className="bg-amber-900/30 hover:bg-amber-800 text-amber-300 hover:text-white text-[10px] px-2 py-1 rounded border border-amber-500/30 font-bold transition-all cursor-pointer"
                              title="إعادة تعيين الجهاز وتصفير الـ HWID"
                            >
                              إعادة تعيين HWID
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleToggleBanKey(testResult.id)}
                            className={`text-[10px] px-2 py-1 rounded font-bold transition-all cursor-pointer border ${
                              testResult.notes?.includes('🛑 [محظور]')
                                ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border-emerald-500/30'
                                : 'bg-red-950 text-red-400 hover:bg-red-900 border-red-500/30'
                            }`}
                          >
                            {testResult.notes?.includes('🛑 [محظور]') ? 'إلغاء الحظر' : 'حظر العميل'}
                          </button>

                          {testResult.status === 'active' && (
                            <button 
                              onClick={() => handleExtendSubscription(testResult.id, 30)}
                              className="bg-purple-900/30 hover:bg-purple-800 text-purple-300 hover:text-white text-[10px] px-2 py-1 rounded border border-purple-500/20 font-bold transition-all cursor-pointer"
                            >
                              تمديد +30 يوم
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* License Keys Database Table Card */}
            <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-[#1e2d44] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-400" />
                    <span>إدارة الاشتراكات والتراخيص والـ VIP</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">البحث، الفرز، تمديد الاشتراك، قفل/إلغاء قفل جهاز المشترك، حظر المشتركين.</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setLicenseKeys(initialLicenseKeys);
                      showToast('تمت استعادة البيانات الافتراضية لقائمة التراخيص.');
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    استعادة الافتراضية
                  </button>
                </div>
              </div>

              {/* Advanced Controls Bar: Realtime Search and Subscription Categories Filter */}
              <div className="p-4 bg-[#090d16] border-b border-[#1e2d44] flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Input Box */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-500 absolute top-1/2 right-3 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="ابحث بالاسم، المفتاح، معرّف الجهاز..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#1e2d44] rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-sans"
                  />
                </div>

                {/* Categories Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                  <span className="text-xs text-gray-400 self-center ml-2">فرز الفئة:</span>
                  <button 
                    onClick={() => setAdminFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      adminFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-[#0f172a] text-gray-400 hover:text-white'
                    }`}
                  >
                    الكل ({licenseKeys.length})
                  </button>
                  <button 
                    onClick={() => setAdminFilter('unused')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      adminFilter === 'unused' ? 'bg-purple-600 text-white' : 'bg-[#0f172a] text-gray-400 hover:text-white'
                    }`}
                  >
                    المتاحة للبيع ({licenseKeys.filter(k => k.status === 'unused').length})
                  </button>
                  <button 
                    onClick={() => setAdminFilter('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      adminFilter === 'active' ? 'bg-purple-600 text-white' : 'bg-[#0f172a] text-gray-400 hover:text-white'
                    }`}
                  >
                    النشطة ({licenseKeys.filter(k => k.status === 'active').length})
                  </button>
                  <button 
                    onClick={() => setAdminFilter('30d')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      adminFilter === '30d' ? 'bg-emerald-600 text-white border border-emerald-500/30' : 'bg-[#0f172a] text-gray-400 hover:text-white'
                    }`}
                  >
                    الاشتراكات الشهرية 💎 ({licenseKeys.filter(k => k.type === '30d').length})
                  </button>
                  <button 
                    onClick={() => setAdminFilter('expired')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      adminFilter === 'expired' ? 'bg-purple-600 text-white' : 'bg-[#0f172a] text-gray-400 hover:text-white'
                    }`}
                  >
                    المنتهية/المحظورة ({licenseKeys.filter(k => k.status === 'expired').length})
                  </button>
                </div>
              </div>

              {/* Table rendering the filtered results */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#090d16] text-gray-400 text-xs border-b border-[#1e2d44]">
                      <th className="p-4 font-bold">اسم المشترك للخدمة</th>
                      <th className="p-4 font-bold">مفتاح التفعيل (License Key)</th>
                      <th className="p-4 font-bold">الفئة والمدة</th>
                      <th className="p-4 font-bold">حالة الجهاز (HWID Lock)</th>
                      <th className="p-4 font-bold">تاريخ انتهاء الصلاحية</th>
                      <th className="p-4 font-bold">ملاحظات الإدارة</th>
                      <th className="p-4 font-bold text-center">أدوات التحكم الشاملة والميزات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2d44] text-xs">
                    {licenseKeys
                      .filter(item => {
                        const searchLower = adminSearch.toLowerCase();
                        const matchesSearch = 
                          item.key.toLowerCase().includes(searchLower) ||
                          (item.username && item.username.toLowerCase().includes(searchLower)) ||
                          (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
                          (item.hwid && item.hwid.toLowerCase().includes(searchLower));

                        if (!matchesSearch) return false;

                        if (adminFilter === 'unused') return item.status === 'unused';
                        if (adminFilter === 'active') return item.status === 'active';
                        if (adminFilter === 'expired') return item.status === 'expired';
                        if (adminFilter === '30d') return item.type === '30d';

                        return true;
                      })
                      .map((item) => {
                        const isBanned = item.notes?.includes('🛑 [محظور]');
                        return (
                          <tr key={item.id} className={`hover:bg-slate-900/40 transition-all ${isBanned ? 'bg-red-950/10' : ''}`}>
                            {/* Member Name */}
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  item.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-850 text-slate-400'
                                }`}>
                                  {item.username ? item.username.charAt(0) : 'G'}
                                </div>
                                <div>
                                  <span className="font-semibold text-white block">{item.username || 'عميل محتمل (مفتاح للبيع)'}</span>
                                  {item.activatedAt && (
                                    <span className="text-[10px] text-gray-500 block">بدأ: {item.activatedAt}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* License Key */}
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-purple-300 select-all block bg-slate-900 px-2 py-1 rounded w-fit text-[11px] font-bold">{item.key}</span>
                                <button 
                                  onClick={() => copyToClipboard(item.key)}
                                  className="text-gray-500 hover:text-white p-1 cursor-pointer"
                                  title="نسخ مفتاح التفعيل"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Subscription Duration Type */}
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded text-[11px] font-bold inline-block ${
                                item.type === '30d' 
                                  ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/20' 
                                  : item.type === 'lifetime'
                                  ? 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                                  : 'bg-slate-800 text-gray-300'
                              }`}>
                                {getTranslatedType(item.type)}
                              </span>
                            </td>

                            {/* HWID Device Lock status */}
                            <td className="p-4">
                              {item.hwid ? (
                                <div className="space-y-1">
                                  <span className="font-mono text-gray-300 block bg-slate-850 px-1.5 py-0.5 rounded w-fit text-[10px]">{item.hwid}</span>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => handleToggleLockKey(item.id)}
                                      className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                                        item.isLocked 
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' 
                                          : 'bg-amber-950 text-amber-400 border border-amber-500/20'
                                      }`}
                                      title="انقر لتبديل حالة قفل معرّف الجهاز"
                                    >
                                      {item.isLocked ? (
                                        <>
                                          <Lock className="w-2.5 h-2.5" />
                                          <span>جهاز مقفل</span>
                                        </>
                                      ) : (
                                        <>
                                          <Unlock className="w-2.5 h-2.5" />
                                          <span>قفل ملغى</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">غير مرتبط بعد</span>
                              )}
                            </td>

                            {/* Expiry Date */}
                            <td className="p-4">
                              {item.status === 'active' ? (
                                <div className="space-y-1">
                                  <span className="text-red-400 font-bold block">{item.expiresAt}</span>
                                  <span className="text-[10px] text-gray-400 block font-semibold">
                                    {item.type === 'lifetime' ? 'مفتوح مدى الحياة' : 'حالة الصلاحية جارية'}
                                  </span>
                                </div>
                              ) : item.status === 'unused' ? (
                                <span className="text-purple-400">بانتظار الاستخدام</span>
                              ) : (
                                <span className="text-red-500 font-semibold">منتهية أو موقوفة</span>
                              )}
                            </td>

                            {/* Notes */}
                            <td className="p-4 text-gray-300">
                              <span className="block max-w-[140px] truncate" title={item.notes}>{item.notes || '-'}</span>
                            </td>

                            {/* Expanded Control Actions */}
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Extend Subscription Button (REQUESTED) */}
                                {item.status === 'active' && (
                                  <button
                                    onClick={() => handleExtendSubscription(item.id, 30)}
                                    className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 hover:text-white px-2 py-1.5 rounded border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer"
                                    title="تمديد اشتراك العميل لمدة 30 يوم إضافية فورياً"
                                  >
                                    تمديد +30 يوم 💎
                                  </button>
                                )}

                                {/* Ban/Suspension Action Button (REQUESTED) */}
                                <button
                                  onClick={() => handleToggleBanKey(item.id)}
                                  className={`p-1.5 rounded transition-all cursor-pointer ${
                                    isBanned 
                                      ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400' 
                                      : 'bg-red-950/50 hover:bg-red-900 text-red-400'
                                  }`}
                                  title={isBanned ? 'إلغاء حظر المشترك وإعادة التفعيل' : 'حظر وإيقاف اشتراك العميل فوراً'}
                                >
                                  {isBanned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>

                                {/* Reset HWID Button */}
                                {item.hwid && (
                                  <button
                                    onClick={() => handleResetHWID(item.id)}
                                    className="bg-amber-900/40 hover:bg-amber-800 text-amber-300 hover:text-white px-2 py-1.5 rounded border border-amber-500/30 font-bold text-[10px] transition-all cursor-pointer"
                                    title="إعادة تعيين HWID لتغيير المحاكي أو الحاسوب"
                                  >
                                    إعادة تعيين HWID
                                  </button>
                                )}

                                {/* Delete key permanently */}
                                <button
                                  onClick={() => handleDeleteKey(item.id)}
                                  className="bg-red-950/30 hover:bg-red-900/80 text-red-400 hover:text-white p-1.5 rounded transition-all cursor-pointer"
                                  title="حذف المفتاح نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customers Live Requests & Technical Support Tickets Grid */}
            <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" />
                <span>طلبات الشراء والاشتراكات الواردة من العملاء</span>
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                تظهر هنا فوراً الطلبات المقدمة من نموذج بوابة الدعم الفني والمبيعات الخارجي. تواصل معهم لتسليم المفاتيح.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-[#090d16] border border-[#1e2d44] p-4 rounded-xl space-y-3 relative">
                    <span className={`absolute top-4 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ticket.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400 animate-pulse'
                    }`}>
                      {ticket.status === 'completed' ? 'تم تسليم المفتاح' : 'قيد الانتظار لمفاتيح'}
                    </span>

                    <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span>{ticket.username}</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-gray-400">
                      <div>المحاكي: <span className="text-white font-medium">{ticket.emulator}</span></div>
                      <div>الإصدار: <span className="text-white font-medium">{ticket.bypassType}</span></div>
                      <div className="col-span-2 mt-1">
                        وسيلة الاتصال ({ticket.platform}): 
                        <span className="text-purple-300 font-mono font-bold block mt-0.5 bg-slate-900 px-2 py-1 rounded w-fit select-all">{ticket.contact}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1e2d44] flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">تم الطلب: {ticket.createdAt}</span>
                      <div className="flex gap-2">
                        {ticket.status === 'pending' && (
                          <button 
                            onClick={async () => {
                              const updatedTicket: SupportTicket = { ...ticket, status: 'completed' };
                              await saveSupportTicket(updatedTicket);
                              showToast('تم تمييز الطلب كمسلّم بنجاح في السحابة!');
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                          >
                            تحديد كمسلّم
                          </button>
                        )}
                        <button 
                          onClick={async () => {
                            await deleteSupportTicket(ticket.id);
                            showToast('تم حذف الطلب من قاعدة البيانات السحابية.');
                          }}
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          حذف الطلب
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ----------------- TAB 3: DIAGNOSTICS & SIMULATOR ----------------- */}
        {activeTab === 'diagnostics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Server configuration adjusters */}
            <div className="space-y-6">
              
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>ضبط حالة الحماية والبايباس</span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  تعديل هذه الإعدادات يحاكي التحديثات الفورية التي تظهر للمشتركين لضمان بقائهم في مأمن من الكشف.
                </p>

                <div className="space-y-4">
                  
                  {/* Status switcher */}
                  <div className="space-y-1.5">
                    <label className="block text-xs text-gray-400 font-medium">الحالة العامة للبايباس</label>
                    <div className="grid grid-cols-3 gap-1 bg-[#090d16] p-1 rounded-xl border border-[#1e2d44]">
                      <button 
                        type="button"
                        onClick={() => handleBypassSafetyChange('stable')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          bypassConfig.bypassStatus === 'stable' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        مستقر وآمن
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleBypassSafetyChange('updating')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          bypassConfig.bypassStatus === 'updating' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        قيد التحديث
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleBypassSafetyChange('offline')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          bypassConfig.bypassStatus === 'offline' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        متوقف مؤقتاً
                      </button>
                    </div>
                  </div>

                  {/* Anti cheat version simulated adjuster */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">إصدار اللعبة المدعوم</label>
                    <input 
                      type="text" 
                      value={bypassConfig.gameVersion}
                      onChange={(e) => setBypassConfig({ ...bypassConfig, gameVersion: e.target.value })}
                      onBlur={(e) => handleUpdateConfigField('gameVersion', e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Security protocol level */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">بروتوكول تشفير اللودر</label>
                    <input 
                      type="text" 
                      value={bypassConfig.securityProtocol}
                      onChange={(e) => setBypassConfig({ ...bypassConfig, securityProtocol: e.target.value })}
                      onBlur={(e) => handleUpdateConfigField('securityProtocol', e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Emulator support switches */}
                  <div className="border-t border-[#1e2d44] pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-white">تفعيل توافق المحاكيات:</h4>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">محاكي GameLoop الرسمي</span>
                      <button 
                        onClick={() => toggleEmulatorState('gameLoop')}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${bypassConfig.gameLoopActive ? 'bg-purple-600' : 'bg-gray-700'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${bypassConfig.gameLoopActive ? 'translate-x-0' : '-translate-x-6'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">محاكي LDPlayer الصيني والعالمي</span>
                      <button 
                        onClick={() => toggleEmulatorState('ldPlayer')}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${bypassConfig.ldPlayerActive ? 'bg-purple-600' : 'bg-gray-700'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${bypassConfig.ldPlayerActive ? 'translate-x-0' : '-translate-x-6'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">محاكي MuMu Player النقي</span>
                      <button 
                        onClick={() => toggleEmulatorState('mumuPlayer')}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${bypassConfig.mumuPlayerActive ? 'bg-purple-600' : 'bg-gray-700'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${bypassConfig.mumuPlayerActive ? 'translate-x-0' : '-translate-x-6'}`} />
                      </button>
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* Right/Middle Column: Realtime Diagnostics Logs console & Activity tracking */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Dynamic activity terminal console */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl flex flex-col h-[340px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Terminal className="w-5 h-5 text-purple-400" />
                    <span>مراقب الاتصال ومسار العمليات في الخادم</span>
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-gray-400">Heartbeat Live</span>
                  </div>
                </div>

                {/* Simulated black terminal screen */}
                <div className="flex-1 bg-[#090d16] rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-y-auto space-y-1.5 border border-purple-900/30 scrollbar">
                  <div>[SYSTEM] [{new Date().toISOString().substring(11, 19)}] خادم فحص الحماية السحابي نشط...</div>
                  <div>[INFO] [{new Date().toISOString().substring(11, 19)}] جاري الاستماع للطلبات الواردة على المنفذ الآمن 443</div>
                  <div>[BYPASS] [{new Date().toISOString().substring(11, 19)}] تم استلام نبضات الجهاز (Heartbeat Check) لعدد {activeUsersCount} لاعب بنجاح</div>
                  <div>[MEMGUARD] [{new Date().toISOString().substring(11, 19)}] تشفير عناوين الذاكرة نشط ومحدث باستمرار لتجاوز مسارات الـ Anticheat</div>
                  <div>[SECURITY] [{new Date().toISOString().substring(11, 19)}] معرّف الجهاز (HWID Validation): تطابق تام 100% لجميع المفاتيح النشطة</div>
                  <div className="text-purple-400">[SIMULATION] خادم التحكم المتكامل جاهز ومستقر بنسبة 99.98%</div>
                  <div className="text-gray-500">--- نهاية خطوط السجلات النشطة حالياً ---</div>
                </div>
              </div>

              {/* Live activity feed from buyers/users */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-1.5">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <span>تحديثات العمليات والتفعيلات المباشرة</span>
                </h3>

                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-3 bg-[#090d16] border border-[#1e2d44] rounded-xl text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          act.status === 'success' ? 'bg-emerald-500' : act.status === 'warning' ? 'bg-amber-500' : 'bg-purple-500'
                        }`} />
                        <div>
                          <strong className="text-white block">{act.user}</strong>
                          <span className="text-gray-400 text-[11px]">{act.action}</span>
                        </div>
                      </div>
                      <span className="text-gray-500 text-[10px] font-mono">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ----------------- TAB 4: DEVELOPERS & INTEGRATION ----------------- */}
        {activeTab === 'developers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-8">
            
            {/* Column 1: API Endpoint & Tester */}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-600/10 to-transparent rounded-full pointer-events-none" />
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-1.5">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  <span>عنوان الاتصال المباشر (API Endpoint)</span>
                </h3>
                
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  يقوم هذا الرابط باستقبال الطلبات من أي أداة أو تطبيق بايباس مبرمج خارجي، والتحقق من صلاحية الاشتراك فوراً في قاعدة بيانات Firestore الخاصة بك.
                </p>

                <div className="bg-[#090d16] border border-[#1e2d44] rounded-xl p-3 font-mono text-xs text-white mb-4 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-purple-400 select-all truncate font-semibold">
                    {window.location.origin}/api/verify
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/verify`);
                      showToast('تم نسخ رابط الـ API بنجاح!');
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded text-gray-400 hover:text-white transition"
                    title="نسخ الرابط"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="border-t border-[#1e2d44] pt-4">
                  <h4 className="text-xs font-bold text-purple-300 mb-3">طريقة إرسال الطلب (HTTP POST):</h4>
                  <div className="bg-[#090d16] rounded-xl p-3 font-mono text-[10px] text-gray-300 space-y-1">
                    <div><span className="text-pink-400">Method:</span> <span className="text-emerald-400 font-bold">POST</span></div>
                    <div><span className="text-pink-400">Header:</span> <span className="text-amber-400">"Content-Type: application/json"</span></div>
                    <div><span className="text-pink-400">JSON Body:</span></div>
                    <div className="pl-4 text-purple-300">{"{"}</div>
                    <div className="pl-8"><span className="text-emerald-400">"key"</span>: <span className="text-blue-400">"مفتاح_الترخيص"</span>,</div>
                    <div className="pl-8"><span className="text-emerald-400">"hwid"</span>: <span className="text-blue-400">"معرّف_الجهاز_الفريد"</span></div>
                    <div className="pl-4 text-purple-300">{"}"}</div>
                  </div>
                </div>
              </div>

              {/* API Live Tester Card */}
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>محاكي الفحص السحابي السريع</span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  اختبر الاتصال بالـ API السحابي فورياً للتأكد من ربط قاعدة بياناتك بشكل سليم.
                </p>

                <form onSubmit={handleDevApiTest} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">مفتاح الترخيص (Key):</label>
                    <input 
                      type="text" 
                      placeholder="مثال: BYPASS-VIP-99X2-KF82"
                      value={devTestKey}
                      onChange={(e) => setDevTestKey(e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">معرّف الجهاز (HWID):</label>
                    <input 
                      type="text" 
                      value={devTestHwid}
                      onChange={(e) => setDevTestHwid(e.target.value)}
                      className="w-full bg-[#090d16] border border-[#1e2d44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={devTestLoading}
                    className="w-full bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2"
                  >
                    {devTestLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>إرسال طلب فحص الـ API الحقيقي</span>
                  </button>
                </form>

                {devTestResponse && (
                  <div className="mt-4 border-t border-[#1e2d44] pt-4 animate-fadeIn">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">رد الخادم الحقيقي (Response JSON):</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${devTestResponse.success ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                        {devTestResponse.success ? 'SUCCESS (200)' : 'FAILED'}
                      </span>
                    </div>
                    <pre className="bg-[#090d16] border border-[#1e2d44] rounded-xl p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-[160px] scrollbar">
                      {JSON.stringify(devTestResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

            </div>

            {/* Column 2 & 3: Code Integration Snippets */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-[#0f172a] border border-[#1e2d44] rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <Cpu className="w-5 h-5 text-purple-400" />
                      <span>أكواد جاهزة للنسخ داخل أداة البايباس الخاصة بك</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">انسخ هذه الأكواد البرمجية مباشرة إلى تطبيقك أو أداتك البرمجية للتحقق الذكي</p>
                  </div>

                  {/* Code Snippet Language Selector */}
                  <div className="flex items-center bg-[#090d16] border border-[#1e2d44] rounded-lg p-1 text-[10px] sm:text-[11px] font-bold self-start xl:self-auto overflow-x-auto max-w-full">
                    <button 
                      onClick={() => setDevSelectedTab('curl')}
                      className={`px-2.5 py-1.5 rounded transition shrink-0 ${devSelectedTab === 'curl' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Curl / Terminal
                    </button>
                    <button 
                      onClick={() => setDevSelectedTab('cpp')}
                      className={`px-2.5 py-1.5 rounded transition shrink-0 ${devSelectedTab === 'cpp' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      C++ (Game Hack)
                    </button>
                    <button 
                      onClick={() => setDevSelectedTab('python')}
                      className={`px-2.5 py-1.5 rounded transition shrink-0 ${devSelectedTab === 'python' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Python
                    </button>
                    <button 
                      onClick={() => setDevSelectedTab('kotlin')}
                      className={`px-2.5 py-1.5 rounded transition shrink-0 ${devSelectedTab === 'kotlin' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Kotlin / Android
                    </button>
                  </div>
                </div>

                {/* Displaying Code Snippet based on Selection */}
                <div className="relative">
                  {/* Copy code button */}
                  <button 
                    onClick={() => {
                      const code = getCodeSnippet(devSelectedTab, window.location.origin);
                      navigator.clipboard.writeText(code);
                      showToast('تم نسخ الكود البرمجي بنجاح!');
                    }}
                    className="absolute top-3 left-3 bg-[#151f32] border border-[#1e2d44] hover:bg-slate-800 hover:text-white text-gray-400 p-2 rounded-lg transition duration-200 z-10"
                    title="انسخ الكود بالكامل"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <pre className="bg-[#090d16] border border-[#1e2d44] rounded-xl p-5 font-mono text-xs text-gray-300 overflow-x-auto max-h-[460px] scrollbar leading-relaxed pr-8">
                    <code>{getCodeSnippet(devSelectedTab, window.location.origin)}</code>
                  </pre>
                </div>

                <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl mt-5 text-xs text-purple-200">
                  <h4 className="font-bold flex items-center gap-1.5 text-purple-300 mb-1.5">
                    <Shield className="w-4 h-4" />
                    <span>آلية الحماية والتحقق من الـ HWID (معرّف الجهاز):</span>
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300 leading-relaxed pr-3">
                    <li>عند تفعيل المفتاح لأول مرة، يقوم الخادم بربطه تلقائياً بالمعرّف الفريد <strong className="text-purple-300">HWID</strong> المرسل من جهاز اللاعب.</li>
                    <li>في المرات القادمة، يرفض الخادم تفعيل المفتاح إذا كان الـ HWID المرسل لا يتطابق مع المعرّف المخزن سحابياً.</li>
                    <li>تمنع هذه الميزة العبقرية المشتركين من نسخ المفتاح ونشره بين أصدقائهم، وتضمن بقاء كل اشتراك لشخص واحد فقط!</li>
                    <li>يمكن للمشرف (أنت) إعادة تعيين الـ HWID بنقرة واحدة من لوحة "إدارة المفاتيح والأعضاء" إذا رغب المشترك في تغيير جهازه.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer information */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 text-center text-xs text-gray-500">
        <p>© 2026 بايباس ببجي الممتاز. جميع الحقوق محفوظة لخدمات التخطي والحماية السحابية.</p>
        <p className="mt-1">مصمم لتوفير أرقى حماية وتخطي لمحاكيات الكمبيوتر مع الحفاظ على أعلى معايير الخصوصية والأمان.</p>
      </footer>

    </div>
  );
}

function getCodeSnippet(lang: 'cpp' | 'python' | 'kotlin' | 'curl', host: string): string {
  const apiLink = `${host}/api/verify`;
  
  if (lang === 'curl') {
    return `# التحقق من الترخيص عبر الطرفية Bash/Curl\ncurl -X POST "${apiLink}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "key": "BYPASS-VIP-99X2-KF82",\n    "hwid": "ANDROID-UNIQUE-HWID-999"\n  }'`;
  }
  
  if (lang === 'python') {
    return `# التحقق من الترخيص باستخدام Python 3\nimport requests\nimport json\n\nAPI_URL = "${apiLink}"\nLICENSE_KEY = "BYPASS-VIP-99X2-KF82"\nDEVICE_HWID = "DESKTOP-MY-UNIQUE-HWID" # يمكن استخراج معرّف المعالج أو الماذر بورد\n\npayload = {\n    "key": LICENSE_KEY,\n    "hwid": DEVICE_HWID\n}\n\ntry:\n    response = requests.post(API_URL, json=payload, headers={"Content-Type": "application/json"})\n    result = response.json()\n    \n    if result.get("success"):\n        print("[+] تم التفعيل بنجاح / Successfully Activated!")\n        print(f"[+] اسم المشترك: {result['key']['username']}")\n        print(f"[+] تاريخ الانتهاء: {result['key']['expiresAt']}")\n        print(f"[+] حالة الحماية العامة: {result['bypassConfig']['bypassStatus']}")\n        # تفعيل أدوات البايباس الخاصة بك هنا\n    else:\n        print(f"[-] فشل التفعيل: {result.get('message')}")\nexcept Exception as e:\n    print(f"[-] خطأ اتصال: {e}")`;
  }
  
  if (lang === 'kotlin') {
    return `// التحقق من الترخيص للأندرويد باستخدام Kotlin / OkHttp\nimport okhttp3.MediaType.Companion.toMediaType\nimport okhttp3.OkHttpClient\nimport okhttp3.Request\nimport okhttp3.RequestBody.Companion.toRequestBody\nimport org.json.JSONObject\nimport java.io.IOException\n\nval client = OkHttpClient()\nval mediaType = "application/json; charset=utf-8".toMediaType()\n\nfun verifyLicense(licenseKey: String, deviceHwid: String) {\n    val url = "${apiLink}"\n    val json = JSONObject()\n    json.put("key", licenseKey)\n    json.put("hwid", deviceHwid)\n\n    val body = json.toString().toRequestBody(mediaType)\n    val request = Request.Builder()\n        .url(url)\n        .post(body)\n        .addHeader("Content-Type", "application/json")\n        .build()\n\n    client.newCall(request).enqueue(object : okhttp3.Callback {\n        override fun onFailure(call: okhttp3.Call, e: IOException) {\n            println("[-] خطأ في الاتصال بالخادم السحابي: \\\${e.message}")\n        }\n\n        override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {\n            val responseData = response.body?.string() ?: ""\n            val jsonResponse = JSONObject(responseData)\n            \n            if (jsonResponse.optBoolean("success")) {\n                val keyObj = jsonResponse.getJSONObject("key")\n                val username = keyObj.getString("username")\n                val expiresAt = keyObj.getString("expiresAt")\n                \n                println("[+] تم التحقق بنجاح! المشترك: \\\${username}، الانتهاء: \\\${expiresAt}")\n                // هنا يتم تشغيل بايباس الحماية داخل اللعبة\n            } else {\n                val errMsg = jsonResponse.optString("message", "مفتاح غير صالح")\n                println("[-] فشل التحقق من الاشتراك: \\\${errMsg}")\n            }\n        }\n    })\n}`;
  }
  
  if (lang === 'cpp') {
    return `// التحقق من الترخيص داخل هاك أو بايباس ببجي المكتوب بلغة C++\n#include <iostream>\n#include <string>\n#include <curl/curl.h> // يجب تثبيت مكتبة libcurl\n\n// دالة لمعالجة رد خادم الـ API\nsize_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {\n    ((std::string*)userp)->append((char*)contents, size * nmemb);\n    return size * nmemb;\n}\n\nbool VerifyLicenseCloud(const std::string& licenseKey, const std::string& hwid) {\n    CURL* curl;\n    CURLcode res;\n    std::string readBuffer;\n\n    curl = curl_easy_init();\n    if(curl) {\n        std::string url = "${apiLink}";\n        struct curl_slist* headers = NULL;\n        headers = curl_slist_append(headers, "Content-Type: application/json");\n\n        // صياغة بيانات الـ JSON\n        std::string jsonPayload = "{\\"key\\": \\"" + licenseKey + "\\", \\"hwid\\": \\"" + hwid + "\\"}";\n\n        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());\n        curl_easy_setopt(curl, CURLOPT_POST, 1L);\n        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);\n        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonPayload.c_str());\n        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);\n        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);\n\n        res = curl_easy_perform(curl);\n        curl_easy_cleanup(curl);\n\n        if(res == CURLE_OK) {\n            std::cout << "[+] رد الخادم السحابي: " << readBuffer << std::endl;\n            if (readBuffer.find("\\"success\\":true") != std::string::npos) {\n                return true; // الترخيص صالح ومتصل!\n            }\n        }\n    }\n    return false; // الترخيص غير صالح أو غير متصل\n}`;
  }
  
  return '';
}
