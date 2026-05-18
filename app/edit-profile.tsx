import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { auth, db } from '../firebaseConfig'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const phoneRegex = /^03[0-9]{9}$/;

export default function EditProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        phone: '',
        address: '',
        emergencyPhone: ''
    });

    const [originalData, setOriginalData] = useState<typeof formData | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // ─── Load user data ──────────────────────────────────────────────────────
    useEffect(() => {
        const loadUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const snap = await getDoc(doc(db, "users", user.uid));
                    if (snap.exists()) {
                        const data = snap.data();
                        const loaded = {
                            firstName: data.firstName || '',
                            lastName: data.lastName || '',
                            dob: data.dob || '',
                            phone: data.phone || '',
                            address: data.address || '',
                            emergencyPhone: data.emergencyPhone || ''
                        };
                        setFormData(loaded);
                        setOriginalData(loaded);
                    }
                } catch (e) { console.log("Error loading data:", e); }
            }
            setFetching(false);
        };
        loadUserData();
    }, []);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const clearError = (field: string) => {
        setErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
    };

    const handleNameInput = (field: string, text: string) => {
        const cleaned = text.replace(/[^a-zA-Z\s]/g, '');
        setFormData(prev => ({ ...prev, [field]: cleaned }));
        if (cleaned.trim()) clearError(field);
    };

    const handlePhoneInput = (field: string, text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        setFormData(prev => ({ ...prev, [field]: cleaned }));
        if (cleaned.trim()) clearError(field);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setFormData(prev => ({ ...prev, dob: selectedDate.toLocaleDateString('en-GB') }));
            clearError('dob');
        }
    };

    // ─── Validate ────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.firstName.trim())
            newErrors.firstName = 'First name is required.';

        if (!formData.lastName.trim())
            newErrors.lastName = 'Last name is required.';

        if (!formData.dob.trim())
            newErrors.dob = 'Please select date of birth.';

        if (!formData.phone.trim())
            newErrors.phone = 'Phone number is required.';
        else if (!phoneRegex.test(formData.phone))
            newErrors.phone = 'Format must be 03xxxxxxxxx (11 digits).';

        if (!formData.address.trim())
            newErrors.address = 'Address is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ─── Has Changes ─────────────────────────────────────────────────────────
    const hasChanges = (): boolean => {
        if (!originalData) return false;
        return (Object.keys(formData) as (keyof typeof formData)[]).some(
            key => formData[key].trim() !== originalData[key].trim()
        );
    };

    // ─── Save ────────────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        const user = auth.currentUser;
        if (!user) return;

        if (!hasChanges()) {
            Alert.alert("No Changes", "You haven't made any changes yet.");
            return;
        }

        if (!validate()) return;

        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();

            await setDoc(userRef, {
                ...formData,
                fullName,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            Alert.alert("Success ✅", "Profile updated successfully!");
            router.back();

        } catch (error: any) {
            console.log("Firebase Error:", error.code);
            Alert.alert("Error", error.message);
        }
        setLoading(false);
    };

    // ─── Loading Screen ──────────────────────────────────────────────────────
    if (fetching) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );

    // ─── UI ──────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                <View style={styles.headerContainer}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Update Profile</Text>
                </View>

                <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>

                        {/* First Name */}
                        <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.firstName && styles.inputError]}
                            value={formData.firstName}
                            placeholder="Enter first name"
                            onChangeText={(txt) => handleNameInput('firstName', txt)}
                        />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

                        {/* Last Name */}
                        <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.lastName && styles.inputError]}
                            value={formData.lastName}
                            placeholder="Enter last name"
                            onChangeText={(txt) => handleNameInput('lastName', txt)}
                        />
                        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

                        {/* Date of Birth */}
                        <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity
                            style={[styles.datePickerContainer, errors.dob && styles.inputError]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={[styles.dateText, !formData.dob && { color: '#94a3b8' }]}>
                                {formData.dob || "Select date"}
                            </Text>
                            <CalendarIcon size={20} color="#1A253D" />
                        </TouchableOpacity>
                        {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                        {showDatePicker && (
                            <DateTimePicker
                                value={new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date()}
                            />
                        )}

                        {/* Phone */}
                        <Text style={styles.label}>Phone <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            keyboardType="numeric"
                            maxLength={11}
                            placeholder="03xxxxxxxxx"
                            value={formData.phone}
                            onChangeText={(txt) => handlePhoneInput('phone', txt)}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

                        {/* Address */}
                        <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, { height: 70 }, errors.address && styles.inputError]}
                            multiline
                            placeholder="Enter your address"
                            value={formData.address}
                            onChangeText={(txt) => {
                                setFormData(prev => ({ ...prev, address: txt }));
                                if (txt.trim()) clearError('address');
                            }}
                        />
                        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color="white" />
                            : <Text style={styles.saveBtnText}>Save Changes</Text>
                        }
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FE' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: {
        backgroundColor: '#1A253D', padding: 25,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 10
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    scrollView: { padding: 20 },
    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 1,
        marginTop: 20, marginBottom: 8, marginLeft: 4
    },
    card: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 8
    },
    label: { fontSize: 13, fontWeight: 'bold', color: '#1B2559', marginTop: 14 },
    required: { color: '#ef4444' },
    input: {
        backgroundColor: '#F4F7FE', padding: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#E0E5F2', marginTop: 5, color: '#1B2559'
    },
    inputError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
    errorText: { fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 2 },
    datePickerContainer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#F4F7FE', padding: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#E0E5F2', marginTop: 5
    },
    dateText: { fontSize: 15, color: '#1B2559' },
    saveBtn: {
        backgroundColor: '#2D7A31', marginTop: 28, padding: 16,
        borderRadius: 15, alignItems: 'center', elevation: 5
    },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
