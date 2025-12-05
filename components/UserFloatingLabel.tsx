import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { UserData } from "../services/usersService";

interface Props {
  user: UserData;
  position: { x: number; y: number };
  onPress: (user: UserData) => void;
  isCurrentUser?: boolean;
}

const UserFloatingLabel: React.FC<Props> = ({ user, position, onPress, isCurrentUser }) => {
  const displayName = isCurrentUser
    ? "Você"
    : (user.username || user.email?.split("@")[0] || "Usuário");

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(user)}
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
        elevation: 6,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
};

export default UserFloatingLabel;
