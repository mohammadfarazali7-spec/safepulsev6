import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  ShieldPlus,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebaseConfig";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { userEmail, userPass } = useLocalSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [dobText, setDobText] = useState("");
  const [dobDate, setDobDate] = useState(new Date(2000, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleNameInput = (text: string, setter: (val: string) => void, field: string) => {
    const cleaned = text.replace(/[^a-zA-Z\s]/g, "");
    setter(cleaned);
    if (errors[field]) { let e = { ...errors }; delete e[field]; setErrors(e); }
  };

  const handlePhoneInput = (text: string, setter: (val: string) => void, field: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setter(cleaned);
    if (errors[field]) { let e = { ...errors }; delete e[field]; setErrors(e); }
  };

  const handleCompleteSetup = async () => {
    let tempErrors: any = {};
    if (!firstName.trim()) tempErrors.firstName = "First name is required";
    if (!lastName.trim()) tempErrors.lastName = "Last name is required";
    if (!address.trim()) tempErrors.address = "Address is required";
    if (!dobText) tempErrors.dob = "Date of birth is required";
    if (!phone.trim()) tempErrors.phone = "Phone number is required";
    else if (phone.length !== 11 || !phone.startsWith("03")) tempErrors.phone = "Invalid format (03XXXXXXXXX)";
    if (!emergencyContact.trim()) tempErrors.emergency = "Emergency contact is required";
    else if (emergencyContact.length !== 11 || !emergencyContact.startsWith("03")) tempErrors.emergency = "Invalid format (03XXXXXXXXX)";

    setErrors(tempErrors);

    if (Object.keys(tempErrors).length === 0) {
      setLoading(true);
      try {
        const emailStr = String(userEmail).toLowerCase().trim();
        const passStr = String(userPass);
        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        const userCredential = await createUserWithEmailAndPassword(auth, emailStr, passStr);
        const user = userCredential.user;
        await updateProfile(user, { displayName: fullName });
        await sendEmailVerification(user);

        const userData = {
          firstName: firstName.trim(), lastName: lastName.trim(), fullName,
          phone: phone.trim(), address: address.trim(), dob: dobText,
          emergencyContact: emergencyContact.trim(), email: emailStr,
          isEmailVerified: false, createdAt: new Date().toISOString(),
        };

        const response = await fetch("http://192.168.100.113:3000/api/save-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, userData }),
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Backend failed to save data");

        await signOut(auth);
        setLoading(false);
        Alert.alert(
          "Account Created ✅",
          "A verification link has been sent to your email. Please verify first, then log in.",
          [{ text: "Go to Login", onPress: () => router.replace("/") }],
        );
      } catch (e: any) {
        setLoading(false);
        if (e.code === "auth/email-already-in-use") Alert.alert("Email Already Registered", "This email is already in use.");
        else Alert.alert("Error", e.message || "Connection failed.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" bounces={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
              <ArrowLeft color="#fff" size={20} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <ShieldPlus size={50} color="#22c55e" />
            </View>
            <Text style={styles.title}>Personal Information</Text>
            <Text style={styles.subtitle}>Step 2 of 2: Profile Details</Text>
            <View style={styles.pagination}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>

            {/* First Name */}
            <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputGroup, errors.firstName && styles.errorBorder]}>
              <User size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                placeholderTextColor="#94a3b8"
                value={firstName}
                onChangeText={(t) => handleNameInput(t, setFirstName, "firstName")}
              />
            </View>
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

            {/* Last Name */}
            <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputGroup, errors.lastName && styles.errorBorder]}>
              <User size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your last name"
                placeholderTextColor="#94a3b8"
                value={lastName}
                onChangeText={(t) => handleNameInput(t, setLastName, "lastName")}
              />
            </View>
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

            {/* Phone */}
            <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputGroup, errors.phone && styles.errorBorder]}>
              <Phone size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="03XXXXXXXXX"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={11}
                value={phone}
                onChangeText={(t) => handlePhoneInput(t, setPhone, "phone")}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            {/* Date of Birth */}
            <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={[styles.inputGroup, errors.dob && styles.errorBorder]}
            >
              <Calendar size={18} color="#94a3b8" />
              <Text style={[styles.input, { color: dobText ? "#111827" : "#94a3b8", paddingTop: 15 }]}>
                {dobText || "Select your birth date"}
              </Text>
            </TouchableOpacity>
            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}

            {showPicker && (
              <DateTimePicker
                value={dobDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={(event, selectedDate) => {
                  setShowPicker(false);
                  if (selectedDate) {
                    setDobDate(selectedDate);
                    setDobText(selectedDate.toLocaleDateString("en-GB"));
                  }
                }}
              />
            )}

            {/* Address */}
            <Text style={styles.label}>Home Address <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputGroup, styles.textArea, errors.address && styles.errorBorder]}>
              <MapPin size={18} color="#94a3b8" style={{ marginTop: 12 }} />
              <TextInput
                style={[styles.input, { textAlignVertical: "top", paddingTop: 10 }]}
                placeholder="Street, Area, City (Karachi)"
                placeholderTextColor="#94a3b8"
                multiline
                value={address}
                onChangeText={setAddress}
              />
            </View>
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

            {/* Emergency Contact */}
            <Text style={styles.label}>Emergency Contact Number <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputGroup, errors.emergency && styles.errorBorder]}>
              <Phone size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="03XXXXXXXXX"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={11}
                value={emergencyContact}
                onChangeText={(t) => handlePhoneInput(t, setEmergencyContact, "emergency")}
              />
            </View>
            {errors.emergency && <Text style={styles.errorText}>{errors.emergency}</Text>}

            {/* Submit */}
            <TouchableOpacity style={styles.mainBtn} onPress={handleCompleteSetup} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Finish & Create Account</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#fff", paddingBottom: 60 },
  header: {
    backgroundColor: "#161E2E", padding: 25, paddingTop: 40,
    alignItems: "center", borderBottomRightRadius: 24, borderBottomLeftRadius: 24,
  },
  backCircle: {
    position: "absolute", left: 20, top: 40, width: 40, height: 40,
    borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  logoContainer: { marginBottom: 10 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#94a3b8", fontSize: 13, marginTop: 5 },
  pagination: { flexDirection: "row", marginTop: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#374151", marginHorizontal: 4 },
  activeDot: { backgroundColor: "#22c55e", width: 20 },
  form: { padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#4B5563", marginTop: 15, marginBottom: 8 },
  required: { color: "#ef4444" },
  inputGroup: {
    flexDirection: "row", alignItems: "center", borderWidth: 1,
    borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 15,
    height: 55, backgroundColor: "#f9fafb",
  },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: "#111827" },
  textArea: { height: 80, alignItems: "flex-start" },
  errorBorder: { borderColor: "#EF4444", backgroundColor: "#fef2f2" },
  errorText: { color: "#EF4444", fontSize: 11, marginTop: 5, marginLeft: 5 },
  mainBtn: {
    backgroundColor: "#2F7A33", height: 55, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginTop: 30, elevation: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
