import React from "react";
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
      pinColor={isCurrentUser ? "blue" : "red"}
      onPress={() => {
        if (onPress) {
          console.log('UserMarker clicado:', user);
          onPress(user);
        }
      }}
    />    
  );
};

export default UserMarker;