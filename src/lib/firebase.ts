import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { MonitoringItem, ProductivityItem, sanitizeItems } from "../store/useStore";

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
  productivityData?: ProductivityItem[];
  productivityLastProcessed?: string | null;
  updatedAt?: string;
}

const CHUNK_SIZE = 150; // Max items per chunk to keep write payload small

const saveChunkedArray = async (parentPath: string, arrayName: string, dataArray: any[]) => {
  if (!dataArray || dataArray.length === 0) {
    await set(ref(rtdb, `${parentPath}/${arrayName}`), []);
    await set(ref(rtdb, `${parentPath}/${arrayName}_chunks`), null);
    return;
  }

  // If array is small enough (<= CHUNK_SIZE), write directly as array
  if (dataArray.length <= CHUNK_SIZE) {
    await set(ref(rtdb, `${parentPath}/${arrayName}`), dataArray);
    await set(ref(rtdb, `${parentPath}/${arrayName}_chunks`), null);
  } else {
    // Large array: clear monolithic path and write in chunked sub-nodes to prevent "Write too large"
    await set(ref(rtdb, `${parentPath}/${arrayName}`), null);
    const chunksCount = Math.ceil(dataArray.length / CHUNK_SIZE);
    for (let i = 0; i < chunksCount; i++) {
      const chunk = dataArray.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await set(ref(rtdb, `${parentPath}/${arrayName}_chunks/c_${i}`), chunk);
    }
  }
};

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
  
  return onValue(
    dbRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() || {};
        const isInitialized = val.isInitialized === true || 
          snapshot.hasChild('items') || 
          snapshot.hasChild('productivityData') || 
          snapshot.hasChild('lastProcessed') || 
          snapshot.hasChild('updatedAt');
        
        // Extract items (monolithic or chunked)
        let rawItems: any[] = [];
        if (Array.isArray(val.items)) {
          rawItems = val.items;
        } else if (val.items_chunks && typeof val.items_chunks === 'object') {
          Object.keys(val.items_chunks).sort().forEach(key => {
            if (Array.isArray(val.items_chunks[key])) {
              rawItems.push(...val.items_chunks[key]);
            }
          });
        }

        // Extract productivity (monolithic or chunked)
        let rawProd: any[] = [];
        if (Array.isArray(val.productivityData)) {
          rawProd = val.productivityData;
        } else if (val.productivityData_chunks && typeof val.productivityData_chunks === 'object') {
          Object.keys(val.productivityData_chunks).sort().forEach(key => {
            if (Array.isArray(val.productivityData_chunks[key])) {
              rawProd.push(...val.productivityData_chunks[key]);
            }
          });
        }

        const sanitized = sanitizeItems(rawItems);
        const lastProcessed = val.lastProcessed || null;
        const prodLastProcessed = val.productivityLastProcessed || null;
        
        onDataReceived(sanitized, lastProcessed, rawProd, prodLastProcessed, isInitialized);
      } else {
        onDataReceived([], null, [], null, false);
      }
    },
    (error) => {
      console.warn("Firebase Realtime Database subscription error:", error);
      if (onError) onError(error);
    }
  );
};

// Function to save data directly to Firebase Realtime Database safely
export const saveToFirebase = async (
  items: MonitoringItem[], 
  timestamp: string, 
  productivityData?: ProductivityItem[], 
  productivityTimestamp?: string | null
) => {
  try {
    const sanitizedMon = sanitizeItems(items);
    const sanitizedProd = productivityData || [];

    // Save metadata child nodes
    await set(ref(rtdb, `${DATA_REF_PATH}/isInitialized`), true);
    await set(ref(rtdb, `${DATA_REF_PATH}/lastProcessed`), timestamp || null);
    await set(ref(rtdb, `${DATA_REF_PATH}/productivityLastProcessed`), productivityTimestamp || null);
    await set(ref(rtdb, `${DATA_REF_PATH}/updatedAt`), new Date().toISOString());

    // Save arrays with chunking if large
    await saveChunkedArray(DATA_REF_PATH, 'items', sanitizedMon);
    await saveChunkedArray(DATA_REF_PATH, 'productivityData', sanitizedProd);
  } catch (err) {
    console.warn("Firebase Realtime Database save write limit reached or offline. Data kept in local IndexedDB.", err);
  }
};

// Function to clear data from Firebase Realtime Database
export const clearFirebaseData = async () => {
  try {
    const dbRef = ref(rtdb, DATA_REF_PATH);
    await set(dbRef, {
      items: [],
      items_chunks: null,
      lastProcessed: null,
      productivityData: [],
      productivityData_chunks: null,
      productivityLastProcessed: null,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Firebase Realtime Database clear error:", err);
  }
};

