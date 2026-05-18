import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { CheckCircle, Clock, Mail, Map as MapIcon, Phone, ShieldAlert, XCircle, Navigation } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, Vibration, View, Linking, Platform } from 'react-native';
import { auth } from "../firebaseConfig";

// --- CONFIGURATION ---
const COUNTDOWN_TIME = 10;
const BACKEND_URL = "http://192.168.100.113:3000";

export default function AccidentReport() {
  const router = useRouter();
  const [location, setLocation] = useState<any>(null);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [timer, setTimer] = useState(COUNTDOWN_TIME);
  const [alertDispatched, setAlertDispatched] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  
  const alertSent = useRef(false);
  const timerRef = useRef<any>(null);

  // 1. Get Location & Permissions
  useEffect(() => {
    let isMounted = true;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location access is required for emergency services.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (isMounted) setLocation(loc.coords);
    })();
    return () => { isMounted = false; };
  }, []);

  // 2. Countdown Logic (Fixed for Stability)
  useEffect(() => {
    if (isCountingDown && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
        Vibration.vibrate(100);
      }, 1000);
    } else if (isCountingDown && timer === 0) {
      cleanupTimer();
      sendEmergencyAlerts();
    }

    return () => cleanupTimer();
  }, [isCountingDown, timer]);

  const cleanupTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // --- ADDED: EMERGENCY ACTION HELPERS ---
  
  // Directly dial a number
  const makeEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => 
      Alert.alert("Error", "Unable to open dialer")
    );
  };

  // Open Google Maps to find nearby hospitals
  const openNearbyHospitals = () => {
    const query = "hospitals and ambulances";
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`
    });
    if (url) Linking.openURL(url);
  };

  // 3. Cancel Logic (FIXED: No screen flash, direct home)
  const cancelAlert = () => {
    cleanupTimer();
    Vibration.cancel();
    console.log("SafePulse: Accident Cancelled. Navigating home directly...");
    router.replace("/home"); 
  };

  // 4. Send Alert Logic
  const sendEmergencyAlerts = async () => {
    if (alertSent.current) return;
    alertSent.current = true;
    setIsCountingDown(false);

    try {
      const coords = {
        lat: location?.latitude || 0,
        long: location?.longitude || 0,
      };

      const response = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser?.uid,
          type: "Road Accident Alert",
          location: coords,
          status: "active",
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAlertDispatched(true);
        Vibration.vibrate([0, 500, 200, 500]); // SOS vibration pattern
      } else {
        throw new Error(data.message || "Failed to sync");
      }
    } catch (error) {
      console.log("❌ Accident Trigger Error:", error);
      alertSent.current = false; 
      Alert.alert("Alert Status", "Accident detected but server sync failed. Manual call recommended.");
    }
  };

  // 5. End Emergency Logic (Fixed Navigation Crash)
  const handleEndEmergency = async () => {
    setIsEnding(true);
    Vibration.cancel();
    try {
      if (auth.currentUser) {
        await fetch(`${BACKEND_URL}/api/sos/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: auth.currentUser.uid }),
        });
      }
    } catch (e) {
      console.log("End Error:", e);
    } finally {
      setIsEnding(false);
      setTimeout(() => {
        router.replace("/home");
      }, 100);
    }
  };

  return (
    <View style={styles.container}>
      {isCountingDown ? (
        <View style={styles.overlay}>
          <Clock size={80} color="#fff" />
          <Text style={styles.timerTitle}>IMPACT DETECTED!</Text>
          <Text style={styles.timerSub}>Notifying Emergency Services in...</Text>
          <Text style={styles.timerValue}>{timer}</Text>
          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.cancelBtn} 
            onPress={cancelAlert}
          >
            <XCircle size={24} color="#ef4444" />
            <Text style={styles.cancelText}>I AM SAFE (CANCEL)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeContainer}>
          <ShieldAlert size={80} color="#ef4444" style={{ marginBottom: 20 }} />
          <Text style={styles.mainTitle}>Accident Alert ACTIVE</Text>
          <Text style={styles.subTitle}>
            {alertDispatched ? "Emergency services have been notified." : "Establishing Connection..."}
          </Text>

          <View style={styles.statusCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#166534' }]}>
              <MapIcon size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.cardTitle}>GPS Location Shared</Text>
              <Text style={styles.cardSub}>Live tracking active</Text>
            </View>
            <CheckCircle size={24} color="#22c55e" />
          </View>

          <View style={styles.statusCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#c2410c' }]}>
              <Mail size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.cardTitle}>Medical Services Notified</Text>
              <Text style={styles.cardSub}>Hospital alerts dispatched</Text>
            </View>
            {alertDispatched && <CheckCircle size={24} color="#22c55e" />}
          </View>

          {/* ADDED: Action Buttons Row */}
          <View style={{ width: '100%', marginTop: 10 }}>
             <TouchableOpacity 
                style={[styles.callBtn, { backgroundColor: '#334155', marginBottom: 10 }]} 
                onPress={openNearbyHospitals}
              >
                <Navigation size={22} color="#fff" />
                <Text style={styles.callBtnText}>Nearby Hospitals</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.callBtn, { backgroundColor: '#b91c1c' }]} 
                onPress={() => makeEmergencyCall('1122')}
              >
                <Phone size={24} color="#fff" />
                <Text style={styles.callBtnText}>Call Ambulance (1122)</Text>
              </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.endBtn} 
            onPress={handleEndEmergency}
            disabled={isEnding}
          >
            <XCircle size={20} color="#94a3b8" />
            <Text style={styles.endBtnText}>{isEnding ? "Ending..." : "End Emergency"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(153, 27, 27, 0.98)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  timerSub: { color: '#fff', fontSize: 16, opacity: 0.8, marginTop: 5 },
  timerValue: { color: '#fff', fontSize: 120, fontWeight: '900', marginVertical: 20 },
  cancelBtn: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  cancelText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  mainTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subTitle: { color: '#94a3b8', fontSize: 16, marginTop: 10, marginBottom: 30, textAlign: 'center' },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: '#64748b', fontSize: 13 },
  callBtn: {
    flexDirection: 'row',
    width: '100%',
    padding: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  endBtn: {
    flexDirection: 'row',
    marginTop: 30,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtnText: { color: '#94a3b8', marginLeft: 8 },
});