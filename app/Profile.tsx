import { usePathname, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; 
import {
    CheckCircle,
    ChevronRight,
    Home as HomeIcon,
    Lock,
    LogOut,
    MapPin,
    User,
    Users,
    FileText, // Naya icon Personal Info ke liye
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebaseConfig";

export default function ProfileScreen() {
    const router = useRouter();
    const pathname = usePathname();

    const [userName, setUserName] = useState("Loading...");
    const [userEmail, setUserEmail] = useState("");
    const [avatarInitial, setAvatarInitial] = useState("?");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeFirestore: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserEmail(user.email || "");
                
                const userRef = doc(db, "users", user.uid);
                unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const fullName = data.fullName || user.email?.split("@")[0] || "User";
                        setUserName(fullName);
                        setAvatarInitial(fullName.charAt(0).toUpperCase());
                    } else {
                        const fallbackName = user.displayName || user.email?.split("@")[0] || "User";
                        setUserName(fallbackName);
                        setAvatarInitial(fallbackName.charAt(0).toUpperCase());
                    }
                    setLoading(false);
                }, (error) => {
                    console.log("Firestore Error:", error);
                    setLoading(false);
                });
            } else {
                router.replace("/");
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) unsubscribeFirestore();
        };
    }, []);

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    try {
                        await auth.signOut();
                        router.replace("/");
                    } catch (error) {
                        Alert.alert("Error", "Could not log out.");
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.avatarText}>{avatarInitial}</Text>
                        )}
                    </View>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.userEmail}>{userEmail}</Text>
                </View>

                {/* ACCOUNT SECTION */}
                <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>

                {/* UPDATE PERSONAL INFO - Ab yahan Trusted Contacts ki jagah ye hai */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push("/edit-profile")}
                >
                    <View style={[styles.iconBg, { backgroundColor: "#eff6ff" }]}>
                        <FileText size={22} color="#2563eb" />
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.mainText}>Personal Information</Text>
                        <Text style={styles.subText}>Name, Phone, DOB, and Address</Text>
                    </View>
                    <ChevronRight size={20} color="#d1d5db" />
                </TouchableOpacity>

                {/* LOGIN & SECURITY - Isme Email/Password change logic rakhein */}
                <TouchableOpacity
                    style={styles.card}
                   onPress={() => router.push("/UpdateSecurity")}
                >
                    <View style={[styles.iconBg, { backgroundColor: "#f0fdf4" }]}>
                        <Lock size={22} color="#16a34a" />
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.mainText}>Login & Security</Text>
                        <Text style={styles.subText}>Update Email and Password</Text>
                    </View>
                    <ChevronRight size={20} color="#d1d5db" />
                </TouchableOpacity>

                {/* SYSTEM STATUS */}
                <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
                <View style={styles.syncCard}>
                    <View style={styles.syncHeader}>
                        <Text style={styles.syncTitle}>Connection</Text>
                        <View style={styles.statusBadge}>
                            <CheckCircle size={14} color="#16a34a" />
                            <Text style={styles.statusText}>Live Sync</Text>
                        </View>
                    </View>
                    <View style={styles.syncRow}>
                        <Text style={styles.syncLabel}>Database</Text>
                        <Text style={styles.syncVal}>Firebase Cloud</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="white" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* BOTTOM NAV */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push("/home")}>
                    <HomeIcon size={24} color={pathname === "/home" ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.navText, pathname === "/home" && { color: "#2563eb" }]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push("/map")}>
                    <MapPin size={24} color={pathname === "/map" ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.navText, pathname === "/map" && { color: "#2563eb" }]}>Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push("/TrustedContacts")}>
                    <Users size={24} color={pathname === "/TrustedContacts" ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.navText, pathname === "/TrustedContacts" && { color: "#2563eb" }]}>Contacts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Profile")}>
                    <User size={24} color={pathname === "/Profile" ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.navText, pathname === "/Profile" && { color: "#2563eb" }]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    header: { backgroundColor: "#1e293b", padding: 40, alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center", marginBottom: 10 },
    avatarText: { color: "white", fontSize: 32, fontWeight: "bold" },
    userName: { color: "white", fontSize: 22, fontWeight: "bold", textTransform: "capitalize" },
    userEmail: { color: "#94a3b8", fontSize: 14 },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: "#64748b", marginLeft: 25, marginTop: 25, marginBottom: 10 },
    card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", marginHorizontal: 20, padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
    iconBg: { width: 45, height: 45, borderRadius: 22, justifyContent: "center", alignItems: "center" },
    cardText: { flex: 1, marginLeft: 15 },
    mainText: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
    subText: { fontSize: 12, color: "#64748b" },
    syncCard: { backgroundColor: "white", marginHorizontal: 20, padding: 20, borderRadius: 15, borderWidth: 1, borderColor: "#e2e8f0" },
    syncHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
    syncTitle: { fontWeight: "bold", fontSize: 16 },
    statusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    statusText: { color: "#166534", fontSize: 10, fontWeight: "bold", marginLeft: 4 },
    syncRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    syncLabel: { color: "#64748b", fontSize: 13 },
    syncVal: { color: "#16a34a", fontWeight: "bold", fontSize: 13 },
    logoutBtn: { backgroundColor: "#ef4444", marginHorizontal: 20, marginTop: 30, padding: 15, borderRadius: 15, flexDirection: "row", justifyContent: "center", alignItems: "center" },
    logoutText: { color: "white", fontWeight: "bold", marginLeft: 10 },
    bottomNav: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "white", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: Platform.OS === "ios" ? 25 : 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
    navItem: { alignItems: "center" },
    navText: { fontSize: 10, color: "#94a3b8", marginTop: 4, fontWeight: "600" },
});