import * as Location from "expo-location";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Erro ao solicitar permissão:", error);
    return false;
  }
};

export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return location;
  } catch (error) {
    console.error("Erro ao obter localização:", error);
    return null;
  }
};

export const updateUserLocation = async (
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        coords: {
          latitude,
          longitude,
        },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Erro ao atualizar localização no Firestore:", error);
    throw error;
  }
};

export const startLocationTracking = async (
  userId: string,
  intervalMs: number = 5000
): Promise<(() => void) | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.error("Permissão de localização negada");
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 10,
      },
      (location) => {
        updateUserLocation(
          userId,
          location.coords.latitude,
          location.coords.longitude
        );
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error("Erro ao iniciar tracking:", error);
    return null;
  }
};

export const stopLocationTracking = (stopFn: (() => void) | null): void => {
  if (stopFn) {
    stopFn();
  }
};
