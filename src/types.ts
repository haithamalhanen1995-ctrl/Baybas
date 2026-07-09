export interface LicenseKey {
  id: string;
  key: string;
  type: '24h' | '7d' | '30d' | 'lifetime';
  status: 'active' | 'expired' | 'unused';
  hwid: string | null;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  notes?: string;
  username?: string;
  isLocked?: boolean;
}

export interface SupportTicket {
  id: string;
  username: string;
  platform: 'Telegram' | 'WhatsApp';
  contact: string;
  bypassType: string;
  emulator: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface BypassConfig {
  gameLoopActive: boolean;
  ldPlayerActive: boolean;
  mumuPlayerActive: boolean;
  antiCheatState: 'active' | 'passive' | 'stealth';
  securityProtocol: string;
  gameVersion: string;
  bypassStatus: 'stable' | 'updating' | 'offline';
  clientVersion: string;
}

export interface LiveActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}
