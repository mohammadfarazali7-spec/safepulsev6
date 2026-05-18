import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { CheckCircle, Flame, Mail, Map, MapPin, Phone } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// CONFIGURATION
const BACKEND_URL = "http://192.168.100.113:3000";

export default function DisasterAlert() {
    const router = useRouter();
    const auth = getAuth();

    // --- UI & STATE MANAGEMENT ---
    const [countdown, setCountdown] = useState(5);
    const [isActivated, setIsActivated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLiveOnMap, setIsLiveOnMap] = useState(false);

    const isProcessingTrigger = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (countdown > 0 && !isActivated) {
            timerRef.current = setTimeout(() => {
                setCountdown((prev) => prev - 1);
                Vibration.vibrate(100);
            }, 1000);
        } 
        else if (countdown === 0 && !isActivated) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (!isProcessingTrigger.current) {
                setIsActivated(true);
                triggerDisasterFlow();
            }
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [countdown, isActivated]);

    // NEW: Open Nearby Services on Maps
    const openEmergencyMap = (query: string) => {
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

    // NEW: Direct Call Function
    const makeEmergencyCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };

    const handleCancel = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        Vibration.cancel();
        router.replace("/home");
    };

    const triggerDisasterFlow = async () => {
        if (isProcessingTrigger.current) return;

        isProcessingTrigger.current = true;
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) return;

            let { status } = await Location.requestForegroundPermissionsAsync();
            let coords = { lat: 24.8607, long: 67.0011 }; // Karachi Backup

            if (status === "granted") {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                coords = {
                    lat: location.coords.latitude,
                    long: location.coords.longitude,
                };
            }

            const response = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    type: "Disaster SOS (Fire/Flood/Earthquake)",
                    location: coords,
                    status: "active",
                    timestamp: new Date().toISOString(),
                }),
            });

            const data = await response.json();
            if (data.success) {
                setIsLiveOnMap(true);
                Vibration.vibrate([500, 200, 500, 200]);
            }
        } catch (error) {
            console.log("❌ Disaster SOS Error:", error);
            isProcessingTrigger.current = false;
            Alert.alert("Sync Error", "Could not broadcast disaster alert. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEndEmergency = async () => {
        Vibration.vibrate(100);
        try {
            const user = auth.currentUser;
            if (user) {
                await fetch(`${BACKEND_URL}/api/sos/end`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.uid }),
                });
            }
            router.replace("/home");
        } catch (error) {
            router.replace("/home");
        }
    };

    if (!isActivated) {
        return (
            <View style={[styles.countdownContainer, { backgroundColor: "#f97316" }]}>
                <Text style={styles.timerNumber}>{countdown}</Text>
                <Text style={styles.timerTitle}>Disaster SOS Activating</Text>
                <Text style={styles.timerSub}>Fire • Earthquake • Flood</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                    <Text style={[styles.cancelBtnText, { color: "#f97316" }]}>Cancel Alert</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.alertHeader}>
                    <Flame size={70} color="#f97316" />
                    <Text style={styles.alertTitle}>Disaster SOS ACTIVE</Text>
                    <View style={styles.subTextContainer}>
                        <Text style={[styles.alertSub, isLiveOnMap && { color: "#22c55e" }]}>
                            {isLiveOnMap ? "● Broadcasting to Civil Defense Map" : "Synchronizing Disaster Data..."}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContainer}>
                    <View style={styles.statusItem}>
                        <View style={[styles.iconCircle, { backgroundColor: "rgba(249, 115, 22, 0.2)" }]}>
                            <MapPin size={24} color="#f97316" />
                        </View>
                        <View style={styles.statusTextContainer}>
                            <Text style={styles.statusTitle}>Live GPS Shared</Text>
                            <Text style={styles.statusSubText}>Tracking active for Civil Defense</Text>
                        </View>
                        {isLiveOnMap ? <CheckCircle size={20} color="#22c55e" /> : <ActivityIndicator size="small" color="#94a3b8" />}
                    </View>

                    <View style={styles.statusItem}>
                        <View style={[styles.iconCircle, { backgroundColor: "rgba(249, 115, 22, 0.2)" }]}>
                            <Mail size={24} color="#f97316" />
                        </View>
                        <View style={styles.statusTextContainer}>
                            <Text style={styles.statusTitle}>Emergency Dispatched</Text>
                            <Text style={styles.statusSubText}>Disaster alert sent to contacts</Text>
                        </View>
                        <CheckCircle size={20} color="#22c55e" />
                    </View>
                </View>

                {/* --- NEW FUNCTIONAL BUTTONS --- */}
                <TouchableOpacity 
                    style={[styles.callButton, { backgroundColor: "#f97316", marginBottom: 12 }]} 
                    onPress={() => openEmergencyMap("fire station")}
                >
                    <MapPin size={20} color="#fff" />
                    <Text style={styles.buttonText}>Nearby Fire Stations</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.callButton, { backgroundColor: "#3b82f6", marginBottom: 12 }]} 
                    onPress={() => openEmergencyMap("ambulance")}
                >
                    <Phone size={20} color="#fff" />
                    <Text style={styles.buttonText}>Nearby Ambulance</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.callButton, { backgroundColor: "#ef4444", marginBottom: 25 }]} 
                    onPress={() => makeEmergencyCall("16")}
                >
                    <Phone size={20} color="#fff" />
                    <Text style={styles.buttonText}>Call Fire Dept (16)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.endButton} onPress={handleEndEmergency}>
                    <Text style={styles.endButtonText}>✕ I am Safe / End Alert</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    countdownContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    timerNumber: { fontSize: 130, fontWeight: "900", color: "#fff" },
    timerTitle: { fontSize: 26, fontWeight: "bold", color: "#fff", marginTop: 20 },
    timerSub: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 50 },
    cancelBtn: { backgroundColor: "#fff", paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15, width: '80%', alignItems: 'center' },
    cancelBtnText: { fontWeight: "bold", fontSize: 18, letterSpacing: 1 },
    container: { flex: 1, backgroundColor: "#0f172a" },
    scrollContent: { padding: 25, alignItems: "center" },
    alertHeader: { alignItems: "center", marginVertical: 35 },
    alertTitle: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 15 },
    subTextContainer: { height: 35, justifyContent: "center" },
    alertSub: { color: "#94a3b8", fontSize: 16, fontWeight: '500' },
    cardContainer: { width: "100%", marginBottom: 25 },
    statusItem: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.03)", padding: 18, borderRadius: 20, alignItems: "center", marginBottom: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    iconCircle: { width: 55, height: 55, borderRadius: 27.5, justifyContent: "center", alignItems: "center" },
    statusTextContainer: { flex: 1, marginLeft: 15 },
    statusTitle: { color: "#fff", fontSize: 17, fontWeight: "bold" },
    statusSubText: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
    callButton: { flexDirection: "row", width: "100%", padding: 18, borderRadius: 15, justifyContent: "center", alignItems: "center", elevation: 5 },
    buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16, marginLeft: 10, letterSpacing: 1 },
    endButton: { width: "100%", padding: 18, borderRadius: 15, borderWidth: 1, borderColor: "#334155", alignItems: "center" },
    endButtonText: { color: "#94a3b8", fontWeight: "bold", fontSize: 15 },
});