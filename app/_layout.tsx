import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { Stack, usePathname, useRouter } from "expo-router";
import { Accelerometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Firebase RTDB tools for live tracking
import { ref, update } from "firebase/database";
import { auth, realTimeDb } from "../firebaseConfig";

// ─── Gesture Settings Keys (same as GestureSettings.tsx) ─────────────────────
const STORAGE_KEYS = {
    SHAKE_ENABLED: 'gesture_shake_enabled',
    VOLUME_ENABLED: 'gesture_volume_enabled',
};

// --- BACKGROUND TASK CONFIGURATION ---
const BACKGROUND_TRACKING_TASK = 'background-tracking-task';

TaskManager.defineTask(BACKGROUND_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("Background Task Error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    const userId = auth.currentUser?.uid;

    if (userId && location) {
      const userLocRef = ref(realTimeDb, `liveLocations/${userId}`);
      update(userLocRef, {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        lastUpdated: Date.now(),
      }).catch(err => console.log("RTDB Sync Error:", err));
    }
  }
});

// --- APP LOGIC WRAPPER ---
function AppLogicWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const isNavigating = useRef(false); 
  const lastPress = useRef(0);         
  const pressCount = useRef(0);

  // ─── Gesture Settings State ───────────────────────────────────────────────
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [volumeEnabled, setVolumeEnabled] = useState(false);

  // ─── Load settings from AsyncStorage (re-read on every screen change) ─────
  useEffect(() => {
    const loadGestureSettings = async () => {
      try {
        const shake = await AsyncStorage.getItem(STORAGE_KEYS.SHAKE_ENABLED);
        const volume = await AsyncStorage.getItem(STORAGE_KEYS.VOLUME_ENABLED);
        setShakeEnabled(shake === 'true');
        setVolumeEnabled(volume === 'true');
      } catch (e) {
        console.log("Gesture settings load error:", e);
      }
    };
    loadGestureSettings();
  }, [pathname]); // pathname change hone pe dobara padhega — settings change hoti hain toh reflect ho

  /** [SECTION 1: BACKGROUND LOCATION SHIELD] **/
  useEffect(() => {
    const startBackgroundShield = async () => {
      if (!auth.currentUser) return; 

      try {
        const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
        const { status: backStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (foreStatus === 'granted' && backStatus === 'granted') {
          await Location.startLocationUpdatesAsync(BACKGROUND_TRACKING_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
            deferredUpdatesInterval: 5000,
            foregroundService: {
              notificationTitle: "SafePulse Shield Active",
              notificationBody: "Monitoring for emergencies in the background.",
              notificationColor: "#EF4444",
            },
          });
        }
      } catch (err) {
        console.log("Location Task Error:", err);
      }
    };
    startBackgroundShield();
  }, [auth.currentUser]); 

  /** [SECTION 2: SENSOR LOGIC] **/
  useEffect(() => {
    const disabledScreens = ["/", "/login", "/signup", "/index"];
    if (!auth.currentUser || disabledScreens.includes(pathname)) return; 

    // --- A. ACCIDENT DETECTION (Shake) ---
    // shakeEnabled OFF hai toh accelerometer subscribe hi nahi karo
    let accelSubscription: { remove: () => void } | null = null;

    if (shakeEnabled) {
      Accelerometer.setUpdateInterval(100);
      accelSubscription = Accelerometer.addListener((data) => {
        if (!data) return;
        const { x, y, z } = data;
        const totalForce = Math.sqrt(x * x + y * y + z * z);

        if (totalForce > 4.5 && !isNavigating.current && pathname !== "/AccidentReport") { 
          isNavigating.current = true;
          Vibration.vibrate(500);
          router.replace("/AccidentReport");
          setTimeout(() => { isNavigating.current = false; }, 10000);
        }
      });
    }

    // --- B. VOLUME STABILIZER (always runs — yeh sirf volume limit karta hai, trigger nahi) ---
    const volumeCheckInterval = setInterval(async () => {
      try {
        const current = await VolumeManager.getVolume();
        if (current.volume > 0.95) {
          await VolumeManager.setVolume(0.90, { type: 'music', showUI: false });
        } else if (current.volume < 0.05) {
          await VolumeManager.setVolume(0.10, { type: 'music', showUI: false });
        }
      } catch (e) {
        console.log("Volume Monitor Error:", e);
      }
    }, 1500);

    // --- C. THEFT SOS LISTENER (Volume Button) ---
    // volumeEnabled OFF hai toh volume listener trigger nahi karega
    let volSubscription: { remove: () => void } | null = null;

    volSubscription = VolumeManager.addVolumeListener((result) => {
      const now = Date.now();
      const alertScreens = ["/TheftAlert", "/AccidentReport", "/DisasterAlert"];
      if (isNavigating.current || alertScreens.includes(pathname)) return;

      // Volume limits (hamesha apply honge, setting se independent)
      if (result.volume >= 0.97) {
        VolumeManager.setVolume(0.85, { type: 'music', showUI: false }); 
      } else if (result.volume <= 0.03) {
        VolumeManager.setVolume(0.15, { type: 'music', showUI: false });
      }

      // ─── Trigger sirf tab jab volumeEnabled ON ho ──────────────────────────
      if (!volumeEnabled) return; // OFF hai toh press count track bhi nahi karo

      if (now - lastPress.current < 2000) { 
        pressCount.current += 1;
      } else {
        pressCount.current = 1; 
      }
      lastPress.current = now;

      if (pressCount.current >= 4) {
        pressCount.current = 0;
        isNavigating.current = true;
        Vibration.vibrate([100, 200, 100, 200]); 
        router.replace("/TheftAlert");
        setTimeout(() => { isNavigating.current = false; }, 10000);
      }
    });

    return () => {
      clearInterval(volumeCheckInterval);
      if (accelSubscription) accelSubscription.remove();
      if (volSubscription) volSubscription.remove();
    };
  }, [pathname, auth.currentUser, shakeEnabled, volumeEnabled]); // ← settings change hone pe re-run

  return <>{children}</>;
}

export default function RootLayout() {
  useKeepAwake(); 

  return (
    <AppLogicWrapper>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="TheftAlert" />
        <Stack.Screen name="AccidentReport" />
        <Stack.Screen name="DisasterAlert" /> 
        <Stack.Screen name="map" />
        <Stack.Screen name="TrustedContacts" />
        <Stack.Screen name="Profile" />
        <Stack.Screen name="Gesturesettings" />
        <Stack.Screen name="UpdateSecurity" />
        <Stack.Screen name="edit-profile" />
      </Stack>
    </AppLogicWrapper>
  );
}
