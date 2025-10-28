import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';
import { getAnalytics } from 'firebase/analytics';
// Removed App Check and ReCAPTCHA imports to simplify authentication

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// Initialize Performance Monitoring and Analytics (only in production)
let performance: any = null;
let analytics: any = null;

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true') {
  performance = getPerformance(app);
}

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
  analytics = getAnalytics(app);
}

// App Check and ReCAPTCHA removed for simplified authentication

export { performance, analytics };

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  const hostname = 'localhost';
  
  try {
    // Connect to Auth emulator
    connectAuthEmulator(auth, `http://${hostname}:9099`);
  } catch (error) {
    // Emulator already connected
  }
  
  try {
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, hostname, 8080);
  } catch (error) {
    // Emulator already connected
  }
  
  try {
    // Connect to Realtime Database emulator
    connectDatabaseEmulator(rtdb, hostname, 9000);
  } catch (error) {
    // Emulator already connected
  }
  
  try {
    // Connect to Storage emulator
    connectStorageEmulator(storage, hostname, 9199);
  } catch (error) {
    // Emulator already connected
  }
}

export default app;