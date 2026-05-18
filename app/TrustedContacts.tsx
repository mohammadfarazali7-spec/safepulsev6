import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    Bell,
    Home as HomeIcon,
    MapPin,
    Pencil,
    Plus,
    Star,
    Trash2,
    User as UserIcon,
    Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

export default function TrustedContacts() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);

  const BACKEND_URL = "http://192.168.100.113:3000";

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) setUserData(docSnap.data());
        });

        const q = query(collection(db, "contacts"), where("userId", "==", currentUser.uid));
        const snapUnsubscribe = onSnapshot(q, (snapshot) => {
          const contactsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          const sortedContacts = contactsList.sort((a: any, b: any) =>
            (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0)
          );
          setContacts(sortedContacts);
          setLoading(false);
        });

        return () => { unsubProfile(); snapUnsubscribe(); };
      } else {
        setLoading(false);
      }
    });
    return () => authUnsubscribe();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newName.trim() || !newPhone.trim() || !newEmail.trim()) {
      Alert.alert("Missing Info", "Please enter name, phone, and email.");
      return;
    }
    if (!emailRegex.test(newEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (!editingId && contacts.length >= 3) {
      Alert.alert("Limit Reached", "Max 3 contacts allowed.");
      return;
    }

    try {
      setLoading(true);
      const contactData = {
        userId: user.uid,
        name: newName.trim(),
        phone: newPhone,
        email: newEmail.trim(),
        isPriority: false,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${BACKEND_URL}/api/save-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: editingId, contactData }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", editingId ? "Contact updated!" : "Contact added!");
        resetForm();
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      Alert.alert("Error", "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${BACKEND_URL}/api/delete-contact/${id}`, { method: "DELETE" });
            const result = await response.json();
            if (!result.success) throw new Error();
          } catch (e) {
            Alert.alert("Error", "Could not delete.");
          }
        },
      },
    ]);
  };

  const sendRealTimeAlert = async (name: string, phone: string) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      let initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = initialLocation.coords;

      const myName = userData?.fullName || user?.displayName || "SafePulse User";
      const myPhone = userData?.phone || "N/A";
      const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message = `🚨 SafePulse EMERGENCY! 🚨\n\nName: ${myName}\nContact: ${myPhone}\n\nStatus: IN DANGER. Live tracking is active. Check here: ${mapLink}`;

      // ── FIX: correct international format for WhatsApp ──
      let formattedPhone = phone.trim();
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "92" + formattedPhone.substring(1); // 03xx → 923xx
      } else if (!formattedPhone.startsWith("92")) {
        formattedPhone = "92" + formattedPhone;
      }
      // remove any spaces or dashes
      formattedPhone = formattedPhone.replace(/[\s\-]/g, "");

      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        const smsUrl = Platform.OS === "ios"
          ? `sms:${formattedPhone}&body=${encodeURIComponent(message)}`
          : `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
      }

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
        async (newLocation) => {
          if (user) {
            const { latitude: lat, longitude: lng } = newLocation.coords;
            const userLocRef = doc(db, "user_locations", user.uid);
            await setDoc(userLocRef, {
              latitude: lat, longitude: lng,
              lastUpdated: new Date().toISOString(),
              status: "EMERGENCY", userId: user.uid, userName: myName,
            }, { merge: true });
          }
        },
      );
      Alert.alert("Alert Sent", "Live tracking has been activated.");
    } catch (error) {
      Alert.alert("Error", "Failed to send alert.");
    }
  };

  const resetForm = () => {
    setNewName(""); setNewPhone(""); setNewEmail("");
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (item: any) => {
    setNewName(item.name); setNewPhone(item.phone);
    setNewEmail(item.email || ""); setEditingId(item.id);
    setShowForm(true);
  };

  const togglePriority = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "contacts", id), { isPriority: !currentStatus });
    } catch (e) {
      Alert.alert("Error", "Update failed.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
        <Text style={styles.headerSubtitle}>SafePulse: {contacts.length}/3 Saved</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={[styles.addContactBtn, contacts.length >= 3 && !editingId && { backgroundColor: "#94a3b8" }]}
          onPress={() => contacts.length < 3 ? setShowForm(true) : Alert.alert("Limit Reached", "Delete a contact first.")}
        >
          <Plus size={22} color="#fff" />
          <Text style={styles.addBtnText}>Add Contact</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.inputCard}>

            {/* ── FIX: labels + placeholderTextColor so fields are visible ── */}
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ahmed Khan"
              placeholderTextColor="#94a3b8"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="03xxxxxxxxx"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={11}
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
            />

            <View style={styles.row}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingId ? "Update" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : (
          contacts.map((item) => (
            <View key={item.id} style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>{item.email}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.testAlertBtn} onPress={() => sendRealTimeAlert(item.name, item.phone)}>
                  <Bell size={16} color="#3b82f6" />
                  <Text style={styles.testAlertText}>Send Alert</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.priorityBtn, item.isPriority && styles.priorityActive]}
                  onPress={() => togglePriority(item.id, item.isPriority)}
                >
                  <Star size={16} color={item.isPriority ? "#f59e0b" : "#64748b"} fill={item.isPriority ? "#f59e0b" : "transparent"} />
                  <Text style={[styles.priorityText, item.isPriority && { color: "#f59e0b" }]}>Priority</Text>
                </TouchableOpacity>

                <View style={styles.iconActions}>
                  <TouchableOpacity onPress={() => startEdit(item)}>
                    <Pencil size={18} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteContact(item.id)}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/home")}>
          <HomeIcon size={24} color="#94a3b8" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/map")}>
          <MapPin size={24} color="#94a3b8" />
          <Text style={styles.navText}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Users size={24} color="#2563eb" />
          <Text style={[styles.navText, { color: "#2563eb" }]}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Profile")}>
          <UserIcon size={24} color="#94a3b8" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#161E2E", padding: 25, paddingTop: 60,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "bold" },
  headerSubtitle: { color: "#94a3b8", fontSize: 14, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  addContactBtn: {
    backgroundColor: "#2563eb", flexDirection: "row",
    justifyContent: "center", alignItems: "center",
    padding: 16, borderRadius: 15, marginBottom: 20,
  },
  addBtnText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  inputCard: { backgroundColor: "#fff", padding: 20, borderRadius: 15, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#1e293b", marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10,
    padding: 12, marginBottom: 6, color: "#1e293b", backgroundColor: "#f8fafc",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  saveBtn: { backgroundColor: "#166534", padding: 12, borderRadius: 10, flex: 0.48, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
  cancelBtn: { backgroundColor: "#f1f5f9", padding: 12, borderRadius: 10, flex: 0.48, alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontWeight: "bold" },
  contactCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 15 },
  contactHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 20 },
  contactInfo: { marginLeft: 15 },
  contactName: { fontSize: 17, fontWeight: "bold" },
  contactPhone: { fontSize: 13, color: "#64748b" },
  actionRow: { flexDirection: "row", marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9", alignItems: "center" },
  testAlertBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", padding: 8, borderRadius: 10, marginRight: 8 },
  testAlertText: { color: "#3b82f6", fontSize: 11, fontWeight: "bold", marginLeft: 4 },
  priorityBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", padding: 8, borderRadius: 10 },
  priorityActive: { backgroundColor: "#fffbeb" },
  priorityText: { color: "#64748b", fontSize: 11, fontWeight: "bold", marginLeft: 4 },
  iconActions: { flexDirection: "row", marginLeft: "auto", gap: 15 },
  navBar: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-around", paddingVertical: 15 },
  navItem: { alignItems: "center" },
  navText: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
});
