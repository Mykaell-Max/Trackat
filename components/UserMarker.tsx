import React from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { UserData } from "../services/usersService";

interface UserMarkerProps {
  user: UserData;
  isCurrentUser?: boolean;
  onPress?: (user: UserData) => void;
}

const UserMarker: React.FC<UserMarkerProps> = ({ user, isCurrentUser = false, onPress }) => {
  if (!user.coords) {
    return null;
  }

  const displayName = isCurrentUser
    ? "Você"
    : (user.username || user.email?.split("@")[0] || "Usuário");

  return (
    <Marker
      coordinate={{
        latitude: user.coords.latitude,
        longitude: user.coords.longitude,
      }}
      title={displayName}
      // anchor at bottom so marker sits above the coordinate (avoids overlapping the user dot)
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => {
        if (onPress) {
          console.log('UserMarker clicado:', user);
          onPress(user);
        }
      }}
    >
      <View style={isCurrentUser ? styles.outerCurrent : styles.outer}>
        <View style={isCurrentUser ? styles.innerCurrent : styles.inner} />
      </View>
    </Marker>
  );
};

export default UserMarker;

const styles = StyleSheet.create({
  outer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  inner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  outerCurrent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  innerCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
});