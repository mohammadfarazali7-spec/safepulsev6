import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; // Firestore real-time listener added
import {
  AlertCircle,
  Bell,
  Home as HomeIcon,
  Map as MapIcon,
  Smartphone,
  User,
  Users
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebaseConfig"; // Added db import

// --- IMPORT ONE TAP CALL FUNCTION ---
import { initiateEmergencyCall } from "./OneTapCall"; 

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);

  // --- REAL-TIME AUTH & FIRESTORE LISTENER ---
  useEffect(() => {
    let unsubscribeFirestore: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Step 1: Pehle temporary email wala naam dikhao
        const initialName = user.displayName || user.email?.split("@")[0] || "User";
        setUserName(initialName);

        // Step 2: Firestore se live data uthao
        const userRef = doc(db, "users", user.uid);
        unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Agar database mein fullName hai to wo dikhao
            setUserName(data.fullName || initialName);
          }
          setLoading(false);
        }, (error) => {
          console.log("Firestore Error in Home:", error);
          setLoading(false);
        });
      } else {
        setUserName("Guest");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // --- MODULE 3: DISASTER SOS HANDLER ---
  const handleDisasterSOS = () => {
    Vibration.vibrate([200, 400, 200, 400]);
    router.replace("/DisasterAlert");
    console.log("Module 3: Disaster SOS Triggered");
  };

  // --- MODULE 2: MANUAL THEFT TRIGGER ---
  const handleTheftTrigger = () => {
    Vibration.vibrate([100, 200]);
    router.replace("/TheftAlert");
    console.log("Module 2: Manual Theft SOS Triggered");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#161E2E" />

      {/* --- HEADER SECTION --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetText}>Stay Safe,</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" style={{ alignSelf: 'flex-start', marginTop: 5 }} />
            ) : (
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            )}
          </View>
          <View style={styles.headerIconsContainer}>
            <TouchableOpacity 
              style={styles.iconCircle} 
              onPress={() => router.push("/Profile")}
            >
              <User size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconCircle, { marginLeft: 12 }]} onPress={() => router.push("/Gesturesettings")}>
              <Bell size={20} color="#fff" />
              <View style={styles.badge} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>SafePulse Protection Active</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* --- MAIN SOS BUTTON --- */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.sosOuter, { backgroundColor: "#dc2626" }]}
            onPress={handleDisasterSOS}
          >
            <View style={styles.sosInner}>
              <AlertCircle size={50} color="#fff" />
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSubText}>DISASTER / FIRE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- CRIME DETECTION --- */}
        <View style={styles.sectionHeader}>
          <Smartphone size={18} color="#2563eb" />
          <Text style={styles.sectionTitle}>Crime Detection</Text>
        </View>

        <TouchableOpacity 
          style={styles.theftCard} 
          onPress={handleTheftTrigger}
        >
          <View style={styles.theftIconCircle}>
            <AlertCircle size={24} color="#ef4444" />
          </View>
          <View style={styles.theftInfo}>
            <Text style={styles.theftTitle}>🚨 Theft / Snatching</Text>
            <Text style={styles.theftSub}>Manual trigger or Hardware button detection</Text>
          </View>
        </TouchableOpacity>

        {/* --- ACCIDENT DETECTION --- */}
        <View style={styles.sectionHeader}>
          <Smartphone size={18} color="#2563eb" />
          <Text style={styles.sectionTitle}>Accident Detection</Text>
        </View>

        <TouchableOpacity 
          style={styles.theftCard} 
          onPress={() => router.push("/AccidentReport")}
        >
          <View style={styles.accidentIconCircle}>
            <Text style={{ fontSize: 24 }}>🚗</Text>
          </View>
          <View style={styles.theftInfo}>
            <Text style={styles.theftTitle}>🚑 Road Accident</Text>
            <Text style={styles.theftSub}>Automatic crash & impact detection active</Text>
          </View>
        </TouchableOpacity>

        {/* --- QUICK DIAL SECTION --- */}
        <View style={styles.sectionHeader}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.sectionTitle}>Emergency Numbers</Text>
        </View>

        <View style={styles.manualGrid}>
          <TouchableOpacity 
            style={[styles.manualCard, { backgroundColor: "#ef4444" }]}
            onPress={() => initiateEmergencyCall("15")}
          >
            <Text style={styles.manualLabel}>Police</Text>
            <Text style={styles.manualCode}>15</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.manualCard, { backgroundColor: "#9333ea" }]}
            onPress={() => initiateEmergencyCall("16")}
          >
            <Text style={styles.manualLabel}>Fire</Text>
            <Text style={styles.manualCode}>16</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.manualCard, { backgroundColor: "#166534" }]}
            onPress={() => initiateEmergencyCall("115")}
          >
            <Text style={styles.manualLabel}>Edhi</Text>
            <Text style={styles.manualCode}>115</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- BOTTOM NAVIGATION TAB --- */}
      <View style={styles.bottomTab}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/home")}>
          <HomeIcon size={24} color="#2563eb" />
          <Text style={[styles.tabText, { color: "#2563eb" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/map")}>
          <MapIcon size={24} color="#94a3b8" />
          <Text style={styles.tabText}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/TrustedContacts")}>
          <Users size={24} color="#94a3b8" />
          <Text style={styles.tabText}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/Profile")}>
          <User size={24} color="#94a3b8" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#161E2E",
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: Platform.OS === "android" ? 45 : 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIconsContainer: { flexDirection: "row" },
  greetText: { color: "#94a3b8", fontSize: 14 },
  userName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textTransform: "capitalize",
    maxWidth: 200, // Long names wrap na hon
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#161E2E",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 8,
  },
  statusText: { color: "#22c55e", fontSize: 13, fontWeight: "700" },
  scrollContent: { paddingBottom: 110 },
  sosContainer: { alignItems: "center", marginVertical: 30 },
  sosOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sosInner: { alignItems: "center" },
  sosText: { color: "#fff", fontSize: 42, fontWeight: "900", marginTop: 5 },
  sosSubText: { color: "#fff", fontSize: 12, fontWeight: "bold", opacity: 0.9 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#1e293b",
  },
  theftCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    alignItems: "center",
    marginBottom: 10,
  },
  theftIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  accidentIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  theftInfo: { marginLeft: 15, flex: 1 },
  theftTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  theftSub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  manualGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  manualCard: {
    flex: 0.31,
    height: 110,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  manualLabel: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  manualCode: { color: "#fff", fontSize: 12, opacity: 0.85 },
  bottomTab: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    justifyContent: "space-around",
    width: "100%",
  },
  tabItem: { alignItems: "center" },
  tabText: { fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: "500" },
});