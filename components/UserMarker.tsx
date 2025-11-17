import React from "react";
import { Marker } from "react-native-maps";
import { UserData } from "../services/usersService";

interface UserMarkerProps {
  user: UserData;
  isCurrentUser?: boolean;
}

export default function UserMarker({ user, isCurrentUser = false }: UserMarkerProps) {
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
    />
  );
}
