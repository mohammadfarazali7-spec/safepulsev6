import { useRouter } from "expo-router";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { Activity, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react-native";
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
import { auth } from "../firebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // --- NEW: Helper function to resend ONLY verification link ---
  const handleResendVerification = async (user: any) => {
    try {
      setLoading(true);
      await sendEmailVerification(user);
      setLoading(false);
      Alert.alert(
        "Link Sent",
        "A verification link has been sent to your email. Please check your inbox.",
      );
    } catch (e: any) {
      setLoading(false);
      Alert.alert(
        "Error",
        "Could not send verification email. Please try again later.",
      );
    }
  };

  // --- 1. Login Logic with Verification Check ---
  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.toLowerCase().trim(),
        password,
      );

      const user = userCredential.user;

      // Verification Check Logic
      if (!user.emailVerified) {
        setLoading(false);
        Alert.alert(
          "Email Not Verified",
          "Your email address has not been verified yet. Please check your inbox for the verification link.",
          [
            // FIX: handleForgotPassword ki jagah handleResendVerification use kiya
            {
              text: "Resend Email",
              onPress: () => handleResendVerification(user),
            },
            { text: "OK" },
          ],
        );
        await signOut(auth);
        return;
      }

      setLoading(false);
      router.replace("/home");
    } catch (e: any) {
      setLoading(false);
      if (
        e.code === "auth/user-not-found" ||
        e.code === "auth/wrong-password" ||
        e.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (e.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  // --- 2. Forgot Password Logic (Sirf password reset ke liye) ---
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      setLoading(false);
      Alert.alert(
        "Link Sent",
        "A password reset link has been sent to your email address. Please check your inbox.",
      );
    } catch (e: any) {
      setLoading(false);
      if (e.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
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
            <Shield size={80} color="#22c55e" strokeWidth={1.5} />
            <View style={styles.pulsePosition}>
              <Activity size={32} color="#22c55e" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.logoText}>SafePulse</Text>
          <Text style={styles.tagline}>Your Emergency Safety Companion</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>

          <Text style={styles.label}>Email Address</Text>
          <View
            style={[
              styles.inputContainer,
              error.toLowerCase().includes("email") && styles.inputError,
            ]}
          >
            <Mail size={20} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                setError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.inputContainer,
              error.toLowerCase().includes("password") && styles.inputError,
            ]}
          >
            <Lock size={20} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(txt) => {
                setPassword(txt);
                setError("");
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color="#94a3b8" />
              ) : (
                <Eye size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotContainer}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.signupBtnText}>Create New Account</Text>
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
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  iconWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  pulsePosition: { position: "absolute", top: "50%", marginTop: -12 },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  tagline: { color: "#94a3b8", fontSize: 14, marginTop: 5 },
  formContainer: { paddingHorizontal: 25, marginTop: 25 },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 25,
  },
  label: { fontSize: 14, color: "#4B5563", marginBottom: 8, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 15,
  },
  inputError: { borderColor: "#EF4444" },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 15,
    marginTop: -10,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: "#111827" },
  forgotContainer: { alignSelf: "flex-end", marginBottom: 20 },
  forgotText: { color: "#2563EB", fontSize: 13, fontWeight: "600" },
  loginBtn: {
    backgroundColor: "#2F7A33",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  signupBtn: {
    backgroundColor: "#2563EB",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  signupBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
