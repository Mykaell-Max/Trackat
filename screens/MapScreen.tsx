import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as NavigationBar from 'expo-navigation-bar';
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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
  { type: "ajuda", label: "Preciso de ajuda", emoji: "", color: "#6366F1" },
  { type: "bora beber", label: "Bora beber", emoji: "", color: "#64748B" },
  { type: "socorro", label: "Socorro! Emergência", emoji: "", color: "#EF4444" },
  { type: "venham aqui", label: "Venham aqui", emoji: "", color: "#8B5CF6" },
];

export default function MapScreen() {
    const insets = useSafeAreaInsets();
    useEffect(() => {
      
      NavigationBar.setBackgroundColorAsync('#000000'); 
      NavigationBar.setButtonStyleAsync('light');        
    }, []);
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
  const [mapLayout, setMapLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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
          // point is relative to the MapView; convert to parent/screen coords by adding map layout offset
          const offsetX = mapLayout ? mapLayout.x : 0;
          const offsetY = mapLayout ? mapLayout.y : 0;
          positions[user.uid] = { x: point.x + offsetX, y: point.y + offsetY };
        } catch (error) {
          // Silent error
        }
      }
    }
    
    setUserPositions(positions);
  };

  useEffect(() => {
    updateUserPositions();
  }, [users, mapLayout]);

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
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}> 
      <RNStatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLogout} activeOpacity={0.8}>
          <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.actionInner}>
            <Text style={styles.buttonIcon}>Sair</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={centerOnMyLocation} activeOpacity={0.8}>
          <LinearGradient colors={["#06B6D4", "#3B82F6"]} style={styles.actionInner}>
            <Text style={styles.buttonIcon}>Localizar</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={animateFabPress} activeOpacity={0.9}>
          <LinearGradient colors={["#FB923C", "#F97316"]} style={styles.actionInnerAlert}>
            <Text style={[styles.alertText, { color: '#fff' }]}>Alerta</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
        showsUserLocation={false}
        showsMyLocationButton={false}
        onRegionChange={updateUserPositions}
        onLayout={(e) => setMapLayout(e.nativeEvent.layout)}
      >
        {users.map((user) => (
          <UserMarker
            key={user.uid}
            user={user}
            isCurrentUser={user.uid === auth.currentUser?.uid}
          />
        ))}
        {/* custom current-user dot */}
        {myLocation && (
          <Marker
            coordinate={myLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={999}
          >
            <View style={styles.myDotOuter} pointerEvents="none">
              <View style={styles.myDotInner} />
            </View>
          </Marker>
        )}
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
              <Text style={{ fontSize: 24, color: '#fff', fontWeight: '600', fontFamily: 'Roboto' }}>
                {selectedUser.username ? selectedUser.username[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={{ fontWeight: '600', fontSize: 18, color: '#6366F1', fontFamily: 'Roboto' }}>
                {selectedUser.username || selectedUser.email?.split("@")[0] || "Usuário"}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 13 }}>{selectedUser.email}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>UID: {selectedUser.uid}</Text>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
            Última atualização: {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : 'Desconhecido'}
          </Text>
          {/* Só os alertas são scrolláveis */}
          <Text style={{ fontWeight: '600', fontSize: 14, marginBottom: 4, color: '#6366F1' }}>Alertas recentes:</Text>
          <View style={{ flex: 1, maxHeight: 180, marginBottom: 10 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {recentAlerts.length === 0 ? (
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Nenhum alerta recente.</Text>
              ) : (
                recentAlerts.map(alert => (
                  <View key={alert.id} style={{ marginBottom: 6, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 }}>
                    <Text style={{ fontWeight: '600', color: '#6366F1', fontSize: 13 }}>{alert.message}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>Em: {new Date(alert.createdAt).toLocaleString()}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedUser(null)}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, fontFamily: 'Roboto' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    </SafeAreaView>
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
    backgroundColor: '#000000ff',
  },
  map: {
    flex: 1,
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 110,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    marginHorizontal: 8,
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  actionInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  actionInnerAlert: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  alertText: {
    color: '#7F1D1D',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonIcon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
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
    borderRadius: 0,
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
  myDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  myDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  fabIcon: {
    fontSize: 20,
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
