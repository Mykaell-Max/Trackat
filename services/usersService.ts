import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export interface UserData {
  uid: string;
  username?: string;
  email: string;
  coords?: {
    latitude: number;
    longitude: number;
  };
  updatedAt?: number;
}

export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      return {
        uid: userId,
        ...userDoc.data(),
      } as UserData;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return null;
  }
};

export const listenToUser = (
  userId: string,
  callback: (user: UserData | null) => void
): (() => void) => {
  const unsubscribe = onSnapshot(
    doc(db, "users", userId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback({
          uid: userId,
          ...snapshot.data(),
        } as UserData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Erro ao escutar usuário:", error);
      callback(null);
    }
  );

  return unsubscribe;
};

export const listenToAllUsers = (
  callback: (users: UserData[]) => void
): (() => void) => {
  const unsubscribe = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const users: UserData[] = [];
      
      snapshot.forEach((doc) => {
        users.push({
          uid: doc.id,
          ...doc.data(),
        } as UserData);
      });
      
      callback(users);
    },
    (error) => {
      console.error("Erro ao escutar todos os usuários:", error);
      callback([]);
    }
  );

  return unsubscribe;
};
