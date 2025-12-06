import * as Notifications from "expo-notifications";
import { addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
export const fetchRecentAlertsByUser = async (userId: string, max: number = 5): Promise<Alert[]> => {
  try {
    const q = query(
      collection(db, "alerts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(max)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
  } catch (error) {
    console.error("Erro ao buscar alertas recentes:", error);
    return [];
  }
};

export type AlertType = "ajuda" | "bora beber" | "socorro" | "venham aqui";

export interface Alert {
  id?: string;
  type: AlertType;
  userId: string;
  userName?: string;
  message: string;
  createdAt: number;
}

const ALERT_CONFIG: Record<AlertType, { message: string; emoji: string }> = {
  "ajuda": { message: "Preciso de ajuda!", emoji: "🆘" },
  "bora beber": { message: "Bora beber!", emoji: "🍻" },
  "socorro": { message: "Socorro! Emergência!", emoji: "🚨" },
  "venham aqui": { message: "Venham aqui!", emoji: "📍" },
};

export const sendAlert = async (
  type: AlertType,
  userId: string,
  userName?: string
): Promise<void> => {
  try {
    const config = ALERT_CONFIG[type];
    
    await addDoc(collection(db, "alerts"), {
      type,
      userId,
      userName: userName || "Usuário",
      message: config.message,
      emoji: config.emoji,
      createdAt: Date.now(),
    });
    
    console.log("Alerta enviado:", type);
  } catch (error) {
    console.error("Erro ao enviar alerta:", error);
    throw error;
  }
};

export const listenToAlerts = (
  currentUserId: string,
  callback: (alert: Alert) => void
): (() => void) => {
  const q = query(
    collection(db, "alerts"),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  let isFirstSnapshot = true;
  const startTime = Date.now();

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const alert = {
            id: change.doc.id,
            ...change.doc.data(),
          } as Alert;
          
          if (alert.userId !== currentUserId) {
            const isNewAlert = !isFirstSnapshot || alert.createdAt >= startTime;
            
            if (isNewAlert) {
              callback(alert);
              showLocalNotification(alert);
            }
          }
        }
      });
      
      isFirstSnapshot = false;
    },
    (error) => {
      console.error("Erro ao escutar alertas:", error);
    }
  );

  return unsubscribe;
};

const showLocalNotification = async (alert: Alert): Promise<void> => {
  try {
    const config = ALERT_CONFIG[alert.type as AlertType];
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${config.emoji} ${alert.userName}`,
        body: alert.message,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { alertId: alert.id, type: alert.type },
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Erro ao mostrar notificação:", error);
  }
};

export const setupNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return false;
  }
};
