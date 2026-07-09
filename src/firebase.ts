import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { LicenseKey, SupportTicket, BypassConfig, LiveActivity } from './types';
import { initialLicenseKeys, initialSupportTickets, initialBypassConfig, initialLiveActivities } from './data';

// Real Firebase Configuration
const firebaseConfig = {
  projectId: "braided-alcove-ln56p",
  appId: "1:210817527777:web:4a337f6f610770063c2ca0",
  apiKey: "AIzaSyC1LMUM-YzLoQdbImD4o0g_qhMmfQQc01w",
  authDomain: "braided-alcove-ln56p.firebaseapp.com",
  storageBucket: "braided-alcove-ln56p.firebasestorage.app",
  messagingSenderId: "210817527777"
};

const databaseId = "ai-studio-pubgbypasspremiu-f3299092-19b0-4e74-a0de-c5cf0e31f3eb";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the exact custom database ID
export const db = getFirestore(app, databaseId);

// Initialize Auth
export const auth = getAuth(app);

// ------------------ ERROR HANDLING ------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ------------------ CONNECTION VALIDATION ------------------
async function testConnection() {
  try {
    const testDocRef = doc(db, 'bypassConfig', 'global');
    await getDocFromServer(testDocRef);
    console.log('Firebase connection verified successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: client is offline.");
    } else {
      console.warn("Connection test completed with state:", error);
    }
  }
}
testConnection();

// ------------------ SEEDING DATA IF EMPTY ------------------
export async function seedDatabaseIfEmpty() {
  try {
    // 1. Seed License Keys
    const keysCol = collection(db, 'licenseKeys');
    let keysSnapshot;
    try {
      keysSnapshot = await getDocs(keysCol);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'licenseKeys');
    }

    if (keysSnapshot.empty) {
      console.log('Seeding initial license keys...');
      const batch = writeBatch(db);
      initialLicenseKeys.forEach((k) => {
        const keyDocRef = doc(keysCol, k.id);
        batch.set(keyDocRef, k);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'licenseKeys');
      }
    }

    // 2. Seed Support Tickets
    const ticketsCol = collection(db, 'supportTickets');
    let ticketsSnapshot;
    try {
      ticketsSnapshot = await getDocs(ticketsCol);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'supportTickets');
    }

    if (ticketsSnapshot.empty) {
      console.log('Seeding initial support tickets...');
      const batch = writeBatch(db);
      initialSupportTickets.forEach((t) => {
        const ticketDocRef = doc(ticketsCol, t.id);
        batch.set(ticketDocRef, t);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'supportTickets');
      }
    }

    // 3. Seed Bypass Config
    const configDocRef = doc(db, 'bypassConfig', 'global');
    let configSnapshot;
    try {
      configSnapshot = await getDocs(collection(db, 'bypassConfig'));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'bypassConfig');
    }

    if (configSnapshot.empty) {
      console.log('Seeding initial bypass configuration...');
      try {
        await setDoc(configDocRef, initialBypassConfig);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'bypassConfig/global');
      }
    }

    // 4. Seed Live Activities
    const activitiesCol = collection(db, 'liveActivities');
    let activitiesSnapshot;
    try {
      activitiesSnapshot = await getDocs(activitiesCol);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'liveActivities');
    }

    if (activitiesSnapshot.empty) {
      console.log('Seeding initial live activities...');
      const batch = writeBatch(db);
      initialLiveActivities.forEach((act) => {
        const actDocRef = doc(activitiesCol, act.id);
        batch.set(actDocRef, act);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'liveActivities');
      }
    }
  } catch (error) {
    console.error('Error seeding Firestore database:', error);
  }
}

// ------------------ LICENSE KEYS OPERATIONS ------------------
export function subscribeLicenseKeys(callback: (keys: LicenseKey[]) => void) {
  const q = query(collection(db, 'licenseKeys'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const keys: LicenseKey[] = [];
    snapshot.forEach((doc) => {
      keys.push(doc.data() as LicenseKey);
    });
    callback(keys);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'licenseKeys');
  });
}

export async function saveLicenseKey(key: LicenseKey) {
  const docRef = doc(db, 'licenseKeys', key.id);
  try {
    await setDoc(docRef, key);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'licenseKeys/' + key.id);
  }
}

export async function deleteLicenseKey(id: string) {
  const docRef = doc(db, 'licenseKeys', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'licenseKeys/' + id);
  }
}

// ------------------ SUPPORT TICKETS OPERATIONS ------------------
export function subscribeSupportTickets(callback: (tickets: SupportTicket[]) => void) {
  const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const tickets: SupportTicket[] = [];
    snapshot.forEach((doc) => {
      tickets.push(doc.data() as SupportTicket);
    });
    callback(tickets);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'supportTickets');
  });
}

export async function saveSupportTicket(ticket: SupportTicket) {
  const docRef = doc(db, 'supportTickets', ticket.id);
  try {
    await setDoc(docRef, ticket);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'supportTickets/' + ticket.id);
  }
}

export async function deleteSupportTicket(id: string) {
  const docRef = doc(db, 'supportTickets', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'supportTickets/' + id);
  }
}

// ------------------ BYPASS CONFIG OPERATIONS ------------------
export function subscribeBypassConfig(callback: (config: BypassConfig) => void) {
  const docRef = doc(db, 'bypassConfig', 'global');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as BypassConfig);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'bypassConfig/global');
  });
}

export async function saveBypassConfig(config: BypassConfig) {
  const docRef = doc(db, 'bypassConfig', 'global');
  try {
    await setDoc(docRef, config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bypassConfig/global');
  }
}

// ------------------ LIVE ACTIVITIES OPERATIONS ------------------
export function subscribeLiveActivities(callback: (activities: LiveActivity[]) => void) {
  const q = query(collection(db, 'liveActivities'), orderBy('id', 'desc'), limit(40));
  return onSnapshot(q, (snapshot) => {
    const activities: LiveActivity[] = [];
    snapshot.forEach((doc) => {
      activities.push(doc.data() as LiveActivity);
    });
    callback(activities);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'liveActivities');
  });
}

export async function saveLiveActivity(activity: LiveActivity) {
  const docRef = doc(db, 'liveActivities', activity.id);
  try {
    await setDoc(docRef, activity);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'liveActivities/' + activity.id);
  }
}

