import { useRouter } from "expo-router";
import { Activity, Lock, Mail, Shield, Eye, EyeOff } from "lucide-react-native"; // Icons add kiye
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Eye Toggle States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const router = useRouter();

  const handleNext = () => {
    let newErrors: any = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Minimum 6 characters required";
    }

    if (password !== confirmPassword) {
      newErrors.confirm = "Passwords do not match";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      router.push({
        pathname: "/personal-info",
        params: {
          userEmail: email.toLowerCase().trim(),
          userPass: password,
        },
      });
    }
  };

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={{ flexGrow: 1, backgroundColor: "#fff" }}
      keyboardShouldPersistTaps="handled"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Shield size={70} color="#22c55e" strokeWidth={1.5} />
            <View style={styles.pulsePosition}>
              <Activity size={28} color="#22c55e" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join SafePulse for emergency protection
          </Text>

          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
            <Mail size={20} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                setErrors({ ...errors, email: "" });
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password Field with Eye Toggle */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
            <Lock size={20} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(txt) => {
                setPassword(txt);
                setErrors({ ...errors, password: "" });
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Confirm Password Field with Eye Toggle */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputContainer, errors.confirm ? styles.inputError : null]}>
            <Lock size={20} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                setErrors({ ...errors, confirm: "" });
              }}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
            </TouchableOpacity>
          </View>
          {errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>Next: Personal Information</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={styles.loginRedirect}
          >
            <Text style={styles.redirectText}>
              Already have an account?{" "}
              <Text style={styles.loginText}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#161E2E",
    paddingTop: 60,
    paddingBottom: 35,
    alignItems: "center",
    borderBottomLeftRadius: 30, // Thora zyada curve kiya Login screen se match karne ke liye
    borderBottomRightRadius: 30,
  },
  iconWrapper: { position: "relative", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  pulsePosition: { position: "absolute", top: "50%", marginTop: -10 },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#94a3b8", fontSize: 14, marginTop: 8 },
  dotsContainer: { flexDirection: "row", marginTop: 25 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#334155", marginHorizontal: 5 },
  activeDot: { backgroundColor: "#22c55e", width: 22 },
  formContainer: { paddingHorizontal: 25, marginTop: 30 },
  label: { fontSize: 14, color: "#4B5563", marginBottom: 8, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56,
    marginBottom: 5,
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 2, marginBottom: 12 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: "#111827", fontSize: 15 },
  nextBtn: { backgroundColor: "#2F7A33", height: 56, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 20, elevation: 4 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loginRedirect: { marginTop: 25, marginBottom: 30, alignItems: "center" },
  redirectText: { color: "#64748b", fontSize: 14 },
  loginText: { color: "#2563eb", fontWeight: "bold" },
});