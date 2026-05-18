import React, { useEffect, useState } from 'react';
import {
    View, Text, Switch, StyleSheet, TouchableOpacity,
    ScrollView, Platform, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ChevronLeft, Smartphone, Volume2, ShieldCheck, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Storage Keys (home.tsx bhi inhi keys se padhega) ────────────────────────
export const STORAGE_KEYS = {
    SHAKE_ENABLED: 'gesture_shake_enabled',
    VOLUME_ENABLED: 'gesture_volume_enabled',
};

export default function GestureSettings() {
    const router = useRouter();
    const [shakeEnabled, setShakeEnabled] = useState(false);
    const [volumeEnabled, setVolumeEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    // ─── Load saved settings ──────────────────────────────────────────────────
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const shake = await AsyncStorage.getItem(STORAGE_KEYS.SHAKE_ENABLED);
                const volume = await AsyncStorage.getItem(STORAGE_KEYS.VOLUME_ENABLED);
                setShakeEnabled(shake === 'true');
                setVolumeEnabled(volume === 'true');
            } catch (e) {
                console.log('Error loading gesture settings:', e);
            }
            setLoading(false);
        };
        loadSettings();
    }, []);

    // ─── Toggle Handlers ──────────────────────────────────────────────────────
    const toggleShake = async (val: boolean) => {
        setShakeEnabled(val);
        await AsyncStorage.setItem(STORAGE_KEYS.SHAKE_ENABLED, String(val));
    };

    const toggleVolume = async (val: boolean) => {
        setVolumeEnabled(val);
        await AsyncStorage.setItem(STORAGE_KEYS.VOLUME_ENABLED, String(val));
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ChevronLeft size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerRow}>
                    <ShieldCheck size={22} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.headerTitle}>Gesture Settings</Text>
                </View>
                <Text style={styles.headerSub}>Control how triggers are activated</Text>
            </View>

            <ScrollView style={styles.scroll}>

                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <Info size={15} color="#1d4ed8" />
                    <Text style={styles.infoText}>
                        When a gesture is OFF, it will not trigger any emergency alert — even if you shake the phone or press the volume button.
                    </Text>
                </View>

                {/* ── Shake Detection ── */}
                <Text style={styles.sectionLabel}>SHAKE DETECTION</Text>
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.iconBg, { backgroundColor: '#eff6ff' }]}>
                            <Smartphone size={22} color="#2563eb" />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Shake to Trigger SOS</Text>
                            <Text style={styles.cardSub}>
                                Rapidly shake the phone to activate{'\n'}emergency alert
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={shakeEnabled}
                        onValueChange={toggleShake}
                        trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
                        thumbColor={shakeEnabled ? '#2563eb' : '#94a3b8'}
                        ios_backgroundColor="#e2e8f0"
                    />
                </View>

                {/* Status pill */}
                <View style={[styles.statusPill, { backgroundColor: shakeEnabled ? '#dcfce7' : '#fef2f2' }]}>
                    <View style={[styles.statusDot, { backgroundColor: shakeEnabled ? '#16a34a' : '#ef4444' }]} />
                    <Text style={[styles.statusText, { color: shakeEnabled ? '#166534' : '#b91c1c' }]}>
                        Shake trigger is currently {shakeEnabled ? 'ON' : 'OFF'}
                    </Text>
                </View>

                {/* ── Volume Button ── */}
                <Text style={styles.sectionLabel}>VOLUME BUTTON</Text>
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.iconBg, { backgroundColor: '#fdf4ff' }]}>
                            <Volume2 size={22} color="#9333ea" />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Volume Button SOS</Text>
                            <Text style={styles.cardSub}>
                                Press volume up button  to activate{'\n'}emergency alert
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={volumeEnabled}
                        onValueChange={toggleVolume}
                        trackColor={{ false: '#e2e8f0', true: '#e9d5ff' }}
                        thumbColor={volumeEnabled ? '#9333ea' : '#94a3b8'}
                        ios_backgroundColor="#e2e8f0"
                    />
                </View>

                {/* Status pill */}
                <View style={[styles.statusPill, { backgroundColor: volumeEnabled ? '#dcfce7' : '#fef2f2' }]}>
                    <View style={[styles.statusDot, { backgroundColor: volumeEnabled ? '#16a34a' : '#ef4444' }]} />
                    <Text style={[styles.statusText, { color: volumeEnabled ? '#166534' : '#b91c1c' }]}>
                        Volume trigger is currently {volumeEnabled ? 'ON' : 'OFF'}
                    </Text>
                </View>

                {/* Note */}
                <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>⚠️ Note</Text>
                    <Text style={styles.noteText}>
                        Volume button detection requires the app to be open in the foreground on Android. Background detection may vary by device manufacturer.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FE' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        backgroundColor: '#1A253D', paddingHorizontal: 25,
        paddingTop: 20, paddingBottom: 28,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 14
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

    scroll: { padding: 20 },

    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#eff6ff', borderRadius: 12,
        padding: 12, marginTop: 10, marginBottom: 6, gap: 8,
        borderWidth: 1, borderColor: '#bfdbfe'
    },
    infoText: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 19 },

    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: '#64748b',
        letterSpacing: 1, marginTop: 22, marginBottom: 8, marginLeft: 2
    },

    card: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
        borderWidth: 1, borderColor: '#e2e8f0'
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBg: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center'
    },
    cardText: { marginLeft: 14, flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    cardSub: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },

    statusPill: {
        flexDirection: 'row', alignItems: 'center',
        alignSelf: 'flex-start', paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 6
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '600' },

    noteBox: {
        backgroundColor: '#fffbeb', borderRadius: 12,
        padding: 14, marginTop: 28,
        borderWidth: 1, borderColor: '#fde68a'
    },
    noteTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 6 },
    noteText: { fontSize: 13, color: '#78350f', lineHeight: 19 }
});
