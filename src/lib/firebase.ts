import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { MonitoringItem, sanitizeItems } from "../store/useStore";

const firebaseConfig = {
  apiKey: "AIzaSyBiaeSRACxA7HgumCqaCI7HscbWXzLjfzI",
  authDomain: "quality-vision-9ee3f.firebaseapp.com",
  projectId: "quality-vision-9ee3f",
  storageBucket: "quality-vision-9ee3f.firebasestorage.app",
  messagingSenderId: "993323490999",
  appId: "1:993323490999:web:bbc2d33982ffecdb2c7732",
  databaseURL: "https://quality-vision-9ee3f-default-rtdb.firebaseio.com"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);

const DATA_REF_PATH = "quality_vision_database";

export interface FirebaseDatabasePayload {
  items: MonitoringItem[];
  lastProcessed: string | null;
  updatedAt?: string;
}

// Function to subscribe to Realtime Database changes
export const subscribeToFirebaseData = (
  onDataReceived: (items: MonitoringItem[], lastProcessed: string | null) => void,
  onError?: (err: any) => void
) => {
  const dbRef = ref(rtdb, DATA_REF_PATH);
  
  return onValue(
    dbRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const rawItems = val.items || [];
        const sanitized = sanitizeItems(rawItems);
        const lastProcessed = val.lastProcessed || null;
        onDataReceived(sanitized, lastProcessed);
      } else {
        onDataReceived([], null);
      }
    },
    (error) => {
      console.error("Firebase Realtime Database subscription error:", error);
      if (onError) onError(error);
    }
  );
};

// Function to save data directly to Firebase Realtime Database
export const saveToFirebase = async (items: MonitoringItem[], timestamp: string) => {
  const dbRef = ref(rtdb, DATA_REF_PATH);
  const payload: FirebaseDatabasePayload = {
    items: sanitizeItems(items),
    lastProcessed: timestamp,
    updatedAt: new Date().toISOString()
  };
  await set(dbRef, payload);
};

// Function to clear data from Firebase Realtime Database
export const clearFirebaseData = async () => {
  const dbRef = ref(rtdb, DATA_REF_PATH);
  await set(dbRef, {
    items: [],
    lastProcessed: null,
    updatedAt: new Date().toISOString()
  });
};
