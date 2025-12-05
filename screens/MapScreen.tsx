import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import Loading from "../components/Loading";
import UserFloatingLabel from "../components/UserFloatingLabel";
import UserMarker from "../components/UserMarker";
import { auth } from "../firebase";
import {
  AlertType, fetchRecentAlertsByUser, listenToAlerts,
  requestNotificationPermission,
  sendAlert,
  setupNotificationHandler, Alert as UserAlert
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
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<UserAlert[]>([]);
  const handleUserPress = (user: UserData) => {
    console.log("USER CLICKED:", user);
    setSelectedUser(user);
  };
  useEffect(() => {
    if (selectedUser) {
      fetchRecentAlertsByUser(selectedUser.uid, 5).then(setRecentAlerts);
    } else {
      setRecentAlerts([]);
    }
  }, [selectedUser]);
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

      {users.map(user => {
        const position = userPositions[user.uid];
        if (!position) return null;
        return (
          <UserFloatingLabel
            key={user.uid}
            user={user}
            position={position}
            onPress={handleUserPress}
            isCurrentUser={user.uid === auth.currentUser?.uid}
          />
        );
      })}

      {/* Card de informações do usuário selecionado */}
      {selectedUser && (
        <View style={[
          styles.userInfoCard,
          {
            position: 'absolute',
            left: 24,
            right: 24,
            top: '50%',
            transform: [{ translateY: -210 }],
            zIndex: 10,
            maxHeight: 420,
            padding: 22,
            justifyContent: 'flex-start',
          }
        ]}>
          {/* Informações fixas do usuário */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={styles.avatarCircle}>
              <Text style={{ fontSize: 28, color: '#fff', fontWeight: 'bold' }}>
                {selectedUser.username ? selectedUser.username[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#8B5CF6' }}>
                {selectedUser.username || selectedUser.email?.split("@")[0] || "Usuário"}
              </Text>
              <Text style={{ color: '#555', fontSize: 14 }}>{selectedUser.email}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>UID: {selectedUser.uid}</Text>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
            Última atualização: {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : 'Desconhecido'}
          </Text>
          {/* Só os alertas são scrolláveis */}
          <Text style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>Alertas recentes:</Text>
          <View style={{ flex: 1, maxHeight: 180, marginBottom: 10 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {recentAlerts.length === 0 ? (
                <Text style={{ color: '#888', fontSize: 13 }}>Nenhum alerta recente.</Text>
              ) : (
                recentAlerts.map(alert => (
                  <View key={alert.id} style={{ marginBottom: 6, padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
                    <Text style={{ fontWeight: 'bold', color: '#8B5CF6' }}>{alert.message}</Text>
                    <Text style={{ color: '#555', fontSize: 12 }}>Em: {new Date(alert.createdAt).toLocaleString()}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedUser(null)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    userInfoCard: {
      backgroundColor: '#fff',
      borderRadius: 22,
      padding: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.13,
      shadowRadius: 12,
      elevation: 10,
    },
    avatarCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: '#8B5CF6',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 6,
    },
    closeButton: {
      marginTop: 10,
      alignSelf: 'flex-end',
      backgroundColor: '#EF4444',
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 8,
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 4,
    },
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
