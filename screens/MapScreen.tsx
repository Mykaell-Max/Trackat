import { signOut } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
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

const ALERT_OPTIONS: { type: AlertType; label: string; emoji: string }[] = [
  { type: "ajuda", label: "Preciso de ajuda", emoji: "🆘" },
  { type: "bora beber", label: "Bora beber", emoji: "🍻" },
  { type: "socorro", label: "Socorro! Emergência", emoji: "🚨" },
  { type: "venham aqui", label: "Venham aqui", emoji: "📍" },
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
              backgroundColor: isCurrentUser ? "#007AFF" : "#FF3B30",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3,
              elevation: 4,
            }}
            pointerEvents="none"
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.2 }}>
              {displayName}
            </Text>
          </View>
        );
      })}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonEmoji}>🚪</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.centerButton} onPress={centerOnMyLocation}>
        <Text style={styles.buttonEmoji}>📍</Text>
      </TouchableOpacity>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          👥 {users.length} {users.length === 1 ? "pessoa" : "pessoas"} online
        </Text>
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAlertModal(true)}
      >
        <Text style={styles.fabText}>🚨</Text>
      </TouchableOpacity>

      <Modal
        visible={showAlertModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar Alerta</Text>

            {ALERT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={styles.alertButton}
                onPress={() => handleSendAlert(option.type)}
              >
                <Text style={styles.alertButtonText}>
                  {option.emoji} {option.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAlertModal(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
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
  logoutButton: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  centerButton: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "#fff",
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  buttonEmoji: {
    fontSize: 26,
  },
  infoBar: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FF3B30",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  fabText: {
    fontSize: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "88%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  alertButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: {
    color: "#6c757d",
    fontSize: 17,
    fontWeight: "600",
  },
});
