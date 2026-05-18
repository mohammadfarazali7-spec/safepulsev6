import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
    AlertTriangle,
    CheckCircle,
    Mail,
    MapPin,
    Phone,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
    Linking,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// CONFIGURATION
const BACKEND_URL = "http://192.168.100.113:3000";

export default function TheftAlert() {
  const router = useRouter();
  const auth = getAuth();

  // States
  const [countdown, setCountdown] = useState(5);
  const [isActivated, setIsActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLiveOnMap, setIsLiveOnMap] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // CRITICAL FIX: Lock mechanism to prevent multiple API calls
  const isProcessingTrigger = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 1. Run countdown logic
    if (countdown > 0 && !isActivated) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
        Vibration.vibrate(100); // Ticking feedback
      }, 1000);
    } 
    // 2. Trigger API flow when countdown hits zero
    else if (countdown === 0 && !isActivated) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Final safety check before triggering
      if (!isProcessingTrigger.current) {
        setIsActivated(true);
        triggerEmergencyFlow();
      }
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, isActivated]);

  // NEW: Search Nearby Police Stations on Maps
  const openPoliceMap = () => {
    const query = "police station";
    const url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
    });
    if (url) {
        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Error", "Could not open Maps app");
            }
        });
    }
  };

  // NEW: Direct Call to Police (15)
  const callPolice = () => {
    Linking.openURL('tel:15');
  };

  const handleCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Vibration.cancel();
    router.replace("/home");
  };

  const triggerEmergencyFlow = async () => {
    // PREVENT DUPLICATES: If already sending, stop here.
    if (isProcessingTrigger.current) return;

    isProcessingTrigger.current = true;
    setLoading(true);

    console.log("🚀 Theft SOS Triggered: Sending single request...");

    try {
      const user = auth.currentUser;
      if (!user) {
        isProcessingTrigger.current = false;
        return;
      }

      // 1. Get Current Location
      let { status } = await Location.requestForegroundPermissionsAsync();
      let coords = { lat: 24.8607, long: 67.0011 }; // Default Karachi center

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        coords = {
          lat: location.coords.latitude,
          long: location.coords.longitude,
        };
      }

      // 2. Call Backend API
      const response = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          type: "Theft / Snatching Alert",
          location: coords,
          status: "active",
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLiveOnMap(true);
        Vibration.vibrate([500, 200, 500]); // Confirmation vibration
        console.log("✅ SOS Synced Successfully with ID:", data.alertId);
      } else {
        throw new Error(data.message || "Failed to sync");
      }
    } catch (error) {
      console.log("❌ SOS Trigger Error:", error);
      isProcessingTrigger.current = false; // Allow retry on failure
      Alert.alert(
        "Connection Error",
        "Could not sync alert. Please check your internet."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEndEmergency = async () => {
    setIsEnding(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await fetch(`${BACKEND_URL}/api/sos/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        });
      }
      isProcessingTrigger.current = false;
      router.replace("/home");
    } catch (error) {
      console.log("❌ End Emergency Error:", error);
      router.replace("/home");
    }
  };

  // --- SCREEN 1: RED COUNTDOWN OVERLAY ---
  if (!isActivated) {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.timerNumber}>{countdown}</Text>
        <Text style={styles.timerTitle}>Activating Emergency Alert</Text>
        <Text style={styles.timerSub}>Press cancel if this was a mistake</Text>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel Alert</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- SCREEN 2: ACTIVE STATUS ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.alertHeader}>
          <AlertTriangle size={60} color="#ef4444" />
          <Text style={styles.alertTitle}>Theft Alert ACTIVE</Text>
          <View style={styles.subTextContainer}>
            <Text
              style={[styles.alertSub, isLiveOnMap && { color: "#22c55e" }]}
            >
              {loading
                ? "Establishing Connection..."
                : isLiveOnMap
                  ? "● Live Broadcast on Security Map"
                  : "Syncing Data..."}
            </Text>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.statusItem}>
            <View style={[styles.iconCircle, { backgroundColor: "#166534" }]}>
              <MapPin size={24} color="#fff" />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>GPS Location Shared</Text>
              <Text style={styles.statusSubText}>Live tracking active</Text>
            </View>
            {isLiveOnMap ? (
              <CheckCircle size={20} color="#22c55e" />
            ) : (
              <ActivityIndicator size="small" color="#94a3b8" />
            )}
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.iconCircle, { backgroundColor: "#ea580c" }]}>
              <Mail size={24} color="#fff" />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Contacts Notified</Text>
              <Text style={styles.statusSubText}>Email alerts dispatched</Text>
            </View>
            <CheckCircle size={20} color="#22c55e" />
          </View>
        </View>

        {/* --- UPDATED EMERGENCY ACTIONS --- */}
        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: "#3b82f6", marginBottom: 12 }]}
          onPress={openPoliceMap}
        >
          <MapPin size={20} color="#fff" />
          <Text style={styles.buttonText}>Nearby Police Stations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callButton}
          onPress={callPolice}
        >
          <Phone size={20} color="#fff" />
          <Text style={styles.buttonText}>Call Police (15)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.endButton, isEnding && { opacity: 0.6 }]}
          onPress={handleEndEmergency}
          disabled={isEnding}
        >
          {isEnding ? (
            <ActivityIndicator color="#94a3b8" />
          ) : (
            <Text style={styles.endButtonText}>✕ End Emergency</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  countdownContainer: {
    flex: 1,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  timerNumber: { fontSize: 120, fontWeight: "bold", color: "#fff" },
  timerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
  },
  timerSub: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 40 },
  cancelBtn: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  cancelBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 18 },
  container: { flex: 1, backgroundColor: "#0f172a" },
  scrollContent: { padding: 20, alignItems: "center" },
  alertHeader: { alignItems: "center", marginVertical: 30 },
  alertTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
  },
  subTextContainer: { height: 30, justifyContent: "center" },
  alertSub: { color: "#94a3b8", fontSize: 16 },
  cardContainer: { width: "100%", marginBottom: 30 },
  statusItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTextContainer: { flex: 1, marginLeft: 15 },
  statusTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  statusSubText: { color: "#94a3b8", fontSize: 12 },
  callButton: {
    backgroundColor: "#166534",
    flexDirection: "row",
    width: "100%",
    padding: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
  endButton: {
    width: "100%",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  endButtonText: { color: "#94a3b8", fontWeight: "bold" },
});