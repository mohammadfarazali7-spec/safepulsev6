import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebaseConfig";

// --- COLORS AS PER YOUR REQUEST ---
const CATEGORIES: any = {
  All: { color: "#2563EB", bg: "rgba(37, 99, 235, 0.2)" },
  Theft: { color: "#FB8C00", bg: "rgba(251, 140, 0, 0.3)" },    // Orange
  Accident: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.4)" }, // Red
  Fire: { color: "#7C3AED", bg: "rgba(124, 58, 237, 0.3)" },    // Purple
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export default function IncidentMap() {
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  const [location, setLocation] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoading(false);
          return;
        }

        let initialPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const initialRegion = {
          latitude: initialPos.coords.latitude,
          longitude: initialPos.coords.longitude,
          ...DEFAULT_DELTA,
        };

        setLocation(initialRegion);
        setLoading(false);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (currentPos) => {
            const userRegion = {
              latitude: currentPos.coords.latitude,
              longitude: currentPos.coords.longitude,
              ...DEFAULT_DELTA,
            };
            setLocation(userRegion);
          },
        );
      } catch (err) {
        setLoading(false);
      }
    })();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, "incidents"), 
      where("timestamp", ">=", Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy("timestamp", "desc")
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          latitude: Number(docData.latitude) || 0,
          longitude: Number(docData.longitude) || 0,
        };
      });
      setIncidents(data);
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  const filteredData = incidents.filter(
    (i) =>
      activeFilter === "All" ||
      i.type?.toLowerCase().includes(activeFilter.toLowerCase()),
  );

  const goToMyLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(location, 1000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          SafePulse: Scanning for hazards...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Hazard Mapping</Text>
            <Text style={styles.headerSub}>Emergency response active (Last 24h)</Text>
          </View>
        </View>

        <View style={{ height: 60 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {Object.keys(CATEGORIES).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setActiveFilter(item)}
                style={[
                  styles.filterBtn,
                  activeFilter === item && {
                    backgroundColor: CATEGORIES[item].color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === item && { color: "white" },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            initialRegion={location}
            onMapReady={() => setIsMapReady(true)}
          >
            {filteredData.map((incident) => {
              if (!incident.latitude || !incident.longitude) return null;

              const type = incident.type?.toLowerCase();
              let config = CATEGORIES.All;
              
              if (type.includes("theft")) config = CATEGORIES.Theft;
              else if (type.includes("accident")) config = CATEGORIES.Accident;
              else if (type.includes("fire")) config = CATEGORIES.Fire;

              const isCritical = type.includes("theft") || type.includes("fire");

              return (
                <React.Fragment key={incident.id}>
                  <Circle
                    center={{
                      latitude: incident.latitude,
                      longitude: incident.longitude,
                    }}
                    radius={type.includes("theft") ? 350 : 200}
                    fillColor={config.bg}
                    strokeColor={config.color}
                    strokeWidth={type.includes("theft") ? 2 : 1}
                  />
                  <Marker
                    coordinate={{
                      latitude: incident.latitude,
                      longitude: incident.longitude,
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.markerDot,
                        { backgroundColor: config.color },
                        isCritical && {
                          transform: [{ scale: pulseAnim }],
                          borderColor: "#fff",
                        },
                      ]}
                    >
                      {isCritical && <View style={styles.innerCriticalDot} />}
                    </Animated.View>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapView>

          <TouchableOpacity
            style={styles.myLocationFab}
            onPress={goToMyLocation}
          >
            <Ionicons name="locate" size={26} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace("/home")}
          >
            <Ionicons name="home-outline" size={24} color="#6B7280" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="map" size={24} color="#2563EB" />
            <Text style={[styles.navText, { color: "#2563EB" }]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/TrustedContacts")}
          >
            <Ionicons name="people-outline" size={24} color="#6B7280" />
            <Text style={styles.navText}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/Profile")}
          >
            <Ionicons name="person-outline" size={24} color="#6B7280" />
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: { marginTop: 15, fontWeight: "700", color: "#1F2937" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#EF4444" },
  headerSub: { fontSize: 12, color: "#6B7280" },
  filterContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
    paddingBottom: 10,
  },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
  },
  filterText: { fontWeight: "700", color: "#4B5563", fontSize: 13 },
  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  markerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  innerCriticalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
  },
  myLocationFab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "white",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  bottomNav: {
    flexDirection: "row",
    height: Platform.OS === "ios" ? 90 : 70,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 10, marginTop: 4, color: "#6B7280", fontWeight: "700" },
});