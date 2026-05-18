import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    verifyBeforeUpdateEmail,
    updatePassword
} from 'firebase/auth';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Password Input Component (outside main component to prevent keyboard dismiss) ───
type PasswordInputProps = {
    value: string;
    onChange: (t: string) => void;
    placeholder: string;
    show: boolean;
    onToggle: () => void;
    error?: string;
    field: string;
    clearErr: (f: string) => void;
};

function PasswordInput({ value, onChange, placeholder, show, onToggle, error, field, clearErr }: PasswordInputProps) {
    return (
        <>
            <View style={[styles.passwordRow, error ? styles.inputError : null]}>
                <Lock size={17} color="#94a3b8" style={{ marginLeft: 12 }} />
                <TextInput
                    style={styles.passwordInput}
                    value={value}
                    placeholder={placeholder}
                    secureTextEntry={!show}
                    onChangeText={(t) => { onChange(t); if (t.trim()) clearErr(field); }}
                    placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={onToggle} style={{ paddingHorizontal: 12 }}>
                    {show
                        ? <EyeOff size={18} color="#94a3b8" />
                        : <Eye size={18} color="#94a3b8" />
                    }
                </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </>
    );
}

export default function UpdateSecurityScreen() {
    const router = useRouter();

    // ─── Email Change State ───────────────────────────────────────────────────
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [showEmailPassword, setShowEmailPassword] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailErrors, setEmailErrors] = useState<{ [key: string]: string }>({});

    // ─── Password Change State ────────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passErrors, setPassErrors] = useState<{ [key: string]: string }>({});

    const user = auth.currentUser;

    // ─── Clear Errors ─────────────────────────────────────────────────────────
    const clearEmailError = (field: string) => {
        setEmailErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
    };
    const clearPassError = (field: string) => {
        setPassErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
    };

    // ─── Validate Email Form ──────────────────────────────────────────────────
    const validateEmail = (): boolean => {
        const errs: { [key: string]: string } = {};

        if (!newEmail.trim())
            errs.newEmail = 'New email address is required.';
        else if (!emailRegex.test(newEmail))
            errs.newEmail = 'Please enter a valid email address.';
        else if (newEmail.toLowerCase() === user?.email?.toLowerCase())
            errs.newEmail = 'New email must be different from current email.';

        if (!emailPassword.trim())
            errs.emailPassword = 'Current password is required to change email.';

        setEmailErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ─── Validate Password Form ───────────────────────────────────────────────
    const validatePassword = (): boolean => {
        const errs: { [key: string]: string } = {};

        if (!currentPassword.trim())
            errs.currentPassword = 'Current password is required.';

        if (!newPassword.trim())
            errs.newPassword = 'New password is required.';
        else if (newPassword.length < 8)
            errs.newPassword = 'Password must be at least 8 characters.';
        else if (!/[A-Z]/.test(newPassword))
            errs.newPassword = 'Password must contain at least one uppercase letter.';
        else if (!/[0-9]/.test(newPassword))
            errs.newPassword = 'Password must contain at least one number.';
        else if (newPassword === currentPassword)
            errs.newPassword = 'New password must be different from current password.';

        if (!confirmPassword.trim())
            errs.confirmPassword = 'Please confirm your new password.';
        else if (confirmPassword !== newPassword)
            errs.confirmPassword = 'Passwords do not match.';

        setPassErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ─── Handle Email Update ──────────────────────────────────────────────────
    const handleEmailUpdate = async () => {
        if (!user) return;
        if (!validateEmail()) return;

        setEmailLoading(true);
        try {
            // Re-authenticate first
            const credential = EmailAuthProvider.credential(user.email!, emailPassword);
            await reauthenticateWithCredential(user, credential);

            // Send verification to new email
            await verifyBeforeUpdateEmail(user, newEmail.toLowerCase());

            // Update Firestore with new email immediately
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                email: newEmail.toLowerCase(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setEmailLoading(false);
            Alert.alert(
                'Verification Sent 📧',
                `A verification link has been sent to ${newEmail}. Please verify to complete the email change. You will be logged out.`,
                [{
                    text: 'OK',
                    onPress: async () => {
                        await auth.signOut();
                        router.replace('/');
                    }
                }]
            );
        } catch (error: any) {
            setEmailLoading(false);
            console.log('Email Error:', error.code);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
                setEmailErrors(prev => ({ ...prev, emailPassword: 'Incorrect password.' }));
            else if (error.code === 'auth/email-already-in-use')
                setEmailErrors(prev => ({ ...prev, newEmail: 'This email is already in use.' }));
            else if (error.code === 'auth/too-many-requests')
                Alert.alert('Too Many Attempts', 'Please try again later.');
            else
                Alert.alert('Error', error.message);
        }
    };

    // ─── Handle Password Update ───────────────────────────────────────────────
    const handlePasswordUpdate = async () => {
        if (!user) return;
        if (!validatePassword()) return;

        setPassLoading(true);
        try {
            // Re-authenticate first
            const credential = EmailAuthProvider.credential(user.email!, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setPassLoading(false);
            Alert.alert(
                'Password Updated ✅',
                'Your password has been changed successfully. Please log in again.',
                [{
                    text: 'OK',
                    onPress: async () => {
                        await auth.signOut();
                        router.replace('/');
                    }
                }]
            );
        } catch (error: any) {
            setPassLoading(false);
            console.log('Password Error:', error.code);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
                setPassErrors(prev => ({ ...prev, currentPassword: 'Incorrect current password.' }));
            else if (error.code === 'auth/too-many-requests')
                Alert.alert('Too Many Attempts', 'Please try again later.');
            else
                Alert.alert('Error', error.message);
        }
    };

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTextRow}>
                        <ShieldCheck size={22} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.headerTitle}>Login & Security</Text>
                    </View>
                    <Text style={styles.headerSub}>Manage your email and password</Text>
                </View>

                <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

                    {/* ── Change Email Card ── */}
                    <Text style={styles.sectionLabel}>CHANGE EMAIL</Text>
                    <View style={[styles.card, { borderColor: '#bfdbfe' }]}>

                        {/* Info Banner */}
                        <View style={styles.infoBanner}>
                            <Mail size={14} color="#1d4ed8" />
                            <Text style={styles.infoText}>
                                A verification link will be sent to your new email. Your current session will end after submission.
                            </Text>
                        </View>

                        {/* Current Email (read-only) */}
                        <Text style={styles.label}>Current Email</Text>
                        <View style={styles.readonlyField}>
                            <Mail size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                            <Text style={styles.readonlyText}>{user?.email || '—'}</Text>
                        </View>

                        {/* New Email */}
                        <Text style={styles.label}>New Email Address <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, emailErrors.newEmail && styles.inputError]}
                            value={newEmail}
                            placeholder="Enter new email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#94a3b8"
                            onChangeText={(t) => { setNewEmail(t); if (emailRegex.test(t)) clearEmailError('newEmail'); }}
                        />
                        {emailErrors.newEmail && <Text style={styles.errorText}>{emailErrors.newEmail}</Text>}

                        {/* Password for email change */}
                        <Text style={styles.label}>Current Password <Text style={styles.required}>*</Text></Text>
                        <PasswordInput
                            value={emailPassword}
                            onChange={setEmailPassword}
                            placeholder="Enter current password"
                            show={showEmailPassword}
                            onToggle={() => setShowEmailPassword(p => !p)}
                            error={emailErrors.emailPassword}
                            field="emailPassword"
                            clearErr={clearEmailError}
                        />

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                            onPress={handleEmailUpdate}
                            disabled={emailLoading}
                        >
                            {emailLoading
                                ? <ActivityIndicator color="white" />
                                : <Text style={styles.actionBtnText}>Update Email</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    {/* ── Change Password Card ── */}
                    <Text style={styles.sectionLabel}>CHANGE PASSWORD</Text>
                    <View style={[styles.card, { borderColor: '#bbf7d0' }]}>

                        {/* Info Banner */}
                        <View style={[styles.infoBanner, { backgroundColor: '#f0fdf4' }]}>
                            <Lock size={14} color="#16a34a" />
                            <Text style={[styles.infoText, { color: '#166534' }]}>
                                Use at least 8 characters with one uppercase letter and one number. You will be logged out after changing.
                            </Text>
                        </View>

                        {/* Current Password */}
                        <Text style={styles.label}>Current Password <Text style={styles.required}>*</Text></Text>
                        <PasswordInput
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            placeholder="Enter current password"
                            show={showCurrentPass}
                            onToggle={() => setShowCurrentPass(p => !p)}
                            error={passErrors.currentPassword}
                            field="currentPassword"
                            clearErr={clearPassError}
                        />

                        {/* New Password */}
                        <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
                        <PasswordInput
                            value={newPassword}
                            onChange={setNewPassword}
                            placeholder="Enter new password"
                            show={showNewPass}
                            onToggle={() => setShowNewPass(p => !p)}
                            error={passErrors.newPassword}
                            field="newPassword"
                            clearErr={clearPassError}
                        />

                        {/* Confirm Password */}
                        <Text style={styles.label}>Confirm New Password <Text style={styles.required}>*</Text></Text>
                        <PasswordInput
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="Re-enter new password"
                            show={showConfirmPass}
                            onToggle={() => setShowConfirmPass(p => !p)}
                            error={passErrors.confirmPassword}
                            field="confirmPassword"
                            clearErr={clearPassError}
                        />

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
                            onPress={handlePasswordUpdate}
                            disabled={passLoading}
                        >
                            {passLoading
                                ? <ActivityIndicator color="white" />
                                : <Text style={styles.actionBtnText}>Update Password</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FE' },

    // Header
    header: {
        backgroundColor: '#1A253D', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 28,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 14
    },
    headerTextRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

    scroll: { padding: 20 },

    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: '#64748b',
        letterSpacing: 1, marginTop: 20, marginBottom: 8, marginLeft: 2
    },

    // Cards
    card: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        borderWidth: 1.5, elevation: 3,
        shadowColor: '#000', shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
        marginBottom: 8
    },

    // Info banner
    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#eff6ff', borderRadius: 10,
        padding: 10, marginBottom: 12, gap: 8
    },
    infoText: { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 18 },

    // Read-only current email
    readonlyField: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#e2e8f0', marginTop: 5
    },
    readonlyText: { color: '#64748b', fontSize: 14 },

    // Form
    label: { fontSize: 13, fontWeight: 'bold', color: '#1B2559', marginTop: 14 },
    required: { color: '#ef4444' },
    input: {
        backgroundColor: '#F4F7FE', padding: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#E0E5F2', marginTop: 5, color: '#1B2559'
    },
    inputError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
    errorText: { fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 2 },

    // Password field
    passwordRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4F7FE', borderRadius: 10,
        borderWidth: 1, borderColor: '#E0E5F2', marginTop: 5
    },
    passwordInput: { flex: 1, padding: 12, color: '#1B2559' },

    // Buttons
    actionBtn: {
        marginTop: 20, padding: 14, borderRadius: 12,
        alignItems: 'center', elevation: 3
    },
    actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
