import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Realtime Database import add kiya gaya hai
import { getDatabase } from "firebase/database"; 

// SafePulse Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfsOuaUBOZvtK7WqW6Ce6lGnJHwjDyVZo",
  authDomain: "safepulsedb-52c0d.firebaseapp.com",
  // Realtime Database URL jo image mein tha
  databaseURL: "https://safepulsedb-52c0d-default-rtdb.firebaseio.com/", 
  projectId: "safepulsedb-52c0d",
  storageBucket: "safepulsedb-52c0d.firebasestorage.app",
  messagingSenderId: "85931283455",
  appId: "1:85931283455:web:b87a4f01869a53e0f88dca",
  measurementId: "G-LLKWZSR2FC",
};

// 1. Initialize Firebase App (Hot Reload Fix)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Auth with Persistence
const authInstance = (() => {
  try {
    return getAuth(app);
  } catch (e) {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
})();

export const auth = authInstance;

// 3. Initialize Firestore (For static data)
export const db = getFirestore(app);

// 4. Initialize Realtime Database (For Live Tracking/SOS)
export const realTimeDb = getDatabase(app);

export default app;