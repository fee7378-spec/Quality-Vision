import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { MonitoringItem, ProductivityItem, sanitizeItems } from "../store/useStore";

const firebaseConfig = {
  apiKey: "AIzaSyBjCPdeqk5xU6KVEn58h1yoS4mueTqz7Og",
  authDomain: "banco-qualityvision.firebaseapp.com",
  databaseURL: "https://banco-qualityvision-default-rtdb.firebaseio.com",
  projectId: "banco-qualityvision",
  storageBucket: "banco-qualityvision.firebasestorage.app",
  messagingSenderId: "556621005632",
  appId: "1:556621005632:web:8927153415da576495f0a5",
  measurementId: "G-WK3F73395C"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);

const DATA_REF_PATH = "quality_vision_database";

export interface FirebaseDatabasePayload {
  items: MonitoringItem[];
  lastProcessed: string | null;
  productivityData?: ProductivityItem[];
  productivityLastProcessed?: string | null;
}

// Function to subscribe to Realtime Database changes
export const subscribeToFirebaseData = (
  onDataReceived: (
    items: MonitoringItem[], 
    lastProcessed: string | null,
    productivityData?: ProductivityItem[],
    productivityLastProcessed?: string | null,
    isInitialized?: boolean
  ) => void,
  onError?: (err: any) => void
) => {
  const dbRef = ref(rtdb, DATA_REF_PATH);
  
  const unsubscribe = onValue(
    dbRef,
    (snapshot) => {
      const val = snapshot.val();
      if (val) {
        let items: MonitoringItem[] = [];
        let productivityData: ProductivityItem[] = [];

        if (Array.isArray(val.items)) {
          items = val.items;
        } else if (val.items && typeof val.items === 'object') {
          items = Object.values(val.items);
        }

        if (Array.isArray(val.productivityData)) {
          productivityData = val.productivityData;
        } else if (val.productivityData && typeof val.productivityData === 'object') {
          productivityData = Object.values(val.productivityData);
        }

        const sanitized = sanitizeItems(items);
        onDataReceived(
          sanitized, 
          val.lastProcessed || null, 
          productivityData, 
          val.productivityLastProcessed || null,
          true
        );
      } else {
        // Database is empty at this node
        onDataReceived([], null, [], null, false);
      }
    },
    (error) => {
      console.warn("Firebase Realtime Database subscription error:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
};

// Function to save data directly to Firebase Realtime Database safely
export const saveToFirebase = async (
  items: MonitoringItem[], 
  timestamp: string, 
  productivityData?: ProductivityItem[], 
  productivityTimestamp?: string | null
) => {
  const sanitizedMon = sanitizeItems(items);
  const sanitizedProd = productivityData || [];

  const dbRef = ref(rtdb, DATA_REF_PATH);
  const payload: FirebaseDatabasePayload = {
    items: sanitizedMon,
    lastProcessed: timestamp || null,
    productivityData: sanitizedProd,
    productivityLastProcessed: productivityTimestamp || null
  };

  try {
    await set(dbRef, payload);
  } catch (err) {
    console.warn("Firebase Realtime Database save write error or offline:", err);
  }
};

// Function to clear data from Firebase Realtime Database
export const clearFirebaseData = async () => {
  const dbRef = ref(rtdb, DATA_REF_PATH);
  try {
    await set(dbRef, {
      items: [],
      lastProcessed: null,
      productivityData: [],
      productivityLastProcessed: null
    });
  } catch (err) {
    console.warn("Firebase Realtime Database clear error:", err);
  }
};
