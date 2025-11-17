import { signOut } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Loading from "../components/Loading";
import UserMarker from "../components/UserMarker";
import { auth } from "../firebase";
import {
  AlertType,
  listenToAlerts,
  requestNotificationPermission,
  sendAlert,
  setupNotificationHandler,
} from "../services/alertsService";
import {
  getCurrentLocation,
  requestLocationPermission,
  startLocationTracking,
  stopLocationTracking,
} from "../services/locationService";
import { listenToAllUsers, UserData } from "../services/usersService";

const { width } = Dimensions.get('window');

const ALERT_OPTIONS: { type: AlertType; label: string; emoji: string; color: string }[] = [
  { type: "ajuda", label: "Preciso de ajuda", emoji: "🆘", color: "#F59E0B" },
  { type: "bora beber", label: "Bora beber", emoji: "🍻", color: "#10B981" },
  { type: "socorro", label: "Socorro! Emergência", emoji: "🚨", color: "#EF4444" },
  { type: "venham aqui", label: "Venham aqui", emoji: "📍", color: "#8B5CF6" },
];

export default function MapScreen() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [userPositions, setUserPositions] = useState<Record<string, { x: number; y: number }>>({});

  const mapRef = useRef<MapView>(null);
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const unsubscribeUsersRef = useRef<(() => void) | null>(null);
  const unsubscribeAlertsRef = useRef<(() => void) | null>(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  const updateUserPositions = async () => {
    if (!mapRef.current) return;
    
    const positions: Record<string, { x: number; y: number }> = {};
    
    for (const user of users) {
      if (user.coords) {
        try {
          const point = await mapRef.current.pointForCoordinate({
            latitude: user.coords.latitude,
            longitude: user.coords.longitude,
          });
          positions[user.uid] = { x: point.x, y: point.y - 35 };
        } catch (error) {
          // Silent error
        }
      }
    }
    
    setUserPositions(positions);
  };

  useEffect(() => {
    updateUserPositions();
  }, [users]);

  useEffect(() => {
    initializeMap();

    return () => {
      cleanup();
    };
  }, []);

  const initializeMap = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const hasLocationPermission = await requestLocationPermission();
    if (!hasLocationPermission) {
      Alert.alert("Permissão negada", "Precisamos da sua localização para funcionar");
      setLoading(false);
      return;
    }

    await requestNotificationPermission();
    setupNotificationHandler();

    const location = await getCurrentLocation();
    if (location) {
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setMyLocation(coords);

      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }

    const stopFn = await startLocationTracking(user.uid, 5000);
    stopTrackingRef.current = stopFn;

    const unsubscribeUsers = listenToAllUsers((allUsers) => {
      setUsers(allUsers);
    });
    unsubscribeUsersRef.current = unsubscribeUsers;

    const unsubscribeAlerts = listenToAlerts(user.uid, (alert) => {
      Alert.alert(
        `${alert.message}`,
        `De: ${alert.userName}`,
        [{ text: "OK" }],
        { cancelable: true }
      );
    });
    unsubscribeAlertsRef.current = unsubscribeAlerts;

    setLoading(false);
  };

  const cleanup = () => {
    if (stopTrackingRef.current) {
      stopLocationTracking(stopTrackingRef.current);
    }
    if (unsubscribeUsersRef.current) {
      unsubscribeUsersRef.current();
    }
    if (unsubscribeAlertsRef.current) {
      unsubscribeAlertsRef.current();
    }
  };

  const handleSendAlert = async (type: AlertType) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setShowAlertModal(false);
      
      const currentUser = users.find(u => u.uid === user.uid);
      const username = currentUser?.username || user.email?.split("@")[0] || "Usuário";
      
      await sendAlert(type, user.uid, username);
      Alert.alert("Sucesso", "Alerta enviado para todos!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível enviar o alerta");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          cleanup();
          await signOut(auth);
        },
      },
    ]);
  };

  const centerOnMyLocation = () => {
    if (myLocation) {
      mapRef.current?.animateToRegion({
        ...myLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const animateFabPress = () => {
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    setShowAlertModal(true);
  };

  if (loading) {
    return <Loading message="Inicializando mapa..." />;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={
          myLocation
            ? {
                ...myLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChange={updateUserPositions}
      >
        {users.map((user) => (
          <UserMarker
            key={user.uid}
            user={user}
            isCurrentUser={user.uid === auth.currentUser?.uid}
          />
        ))}
      </MapView>

      {users.map((user) => {
        const position = userPositions[user.uid];
        if (!position) return null;
        
        const isCurrentUser = user.uid === auth.currentUser?.uid;
        const displayName = isCurrentUser 
          ? "Você" 
          : (user.username || user.email?.split("@")[0] || "Usuário");
        
        return (
          <View
            key={`label-${user.uid}`}
            style={{
              position: "absolute",
              left: position.x - 40,
              top: position.y,
              backgroundColor: isCurrentUser ? "#8B5CF6" : "#EC4899",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 6,
            }}
            pointerEvents="none"
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.3 }}>
              {displayName}
            </Text>
          </View>
        );
      })}

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLogout} activeOpacity={0.7}>
          <LinearGradient
            colors={['#F43F5E', '#E11D48']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonIcon}>🚪</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={centerOnMyLocation} activeOpacity={0.7}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonIcon}>🎯</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <BlurView intensity={80} tint="dark" style={styles.infoCard}>
        <View style={styles.infoContent}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>{users.length}</Text>
          </View>
          <Text style={styles.infoText}>
            {users.length === 1 ? "pessoa online" : "pessoas online"}
          </Text>
        </View>
      </BlurView>

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={animateFabPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.fabGradient}
          >
            <Text style={styles.fabIcon}>🚨</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showAlertModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enviar Alerta</Text>
                <Text style={styles.modalSubtitle}>Escolha o tipo de alerta para enviar</Text>
              </View>

              {ALERT_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.alertButton, { marginBottom: index === ALERT_OPTIONS.length - 1 ? 0 : 12 }]}
                  onPress={() => handleSendAlert(option.type)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[option.color, option.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.alertButtonGradient}
                  >
                    <Text style={styles.alertEmoji}>{option.emoji}</Text>
                    <Text style={styles.alertButtonText}>{option.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAlertModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    fontSize: 24,
  },
  infoCard: {
    position: "absolute",
    bottom: 120,
    left: 16,
    right: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  infoBadge: {
    backgroundColor: "#8B5CF6",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  fabContainer: {
    position: "absolute",
    bottom: 32,
    right: 20,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: "hidden",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fabIcon: {
    fontSize: 32,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalBlur: {
    width: width * 0.9,
    maxWidth: 380,
    borderRadius: 28,
    overflow: "hidden",
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    marginBottom: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  alertButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  alertButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  alertEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  cancelText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 17,
    fontWeight: "600",
  },
});
