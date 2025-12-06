import React, { useState } from "react";
import { Dimensions, Text, TouchableOpacity } from "react-native";
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

  const [size, setSize] = useState({ width: 80, height: 28 });

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Center the label exactly on the coordinate (so its center aligns with the point)

    const left = Math.round(position.x - size.width / 2);
    const top = Math.round(position.y - size.height / 2);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(user)}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width && height && (width !== size.width || height !== size.height)) {
          setSize({ width, height });
        }
      }}
      style={{
        position: "absolute",
          left: isFinite(left) ? left : position.x - 40,
          top: isFinite(top) ? top : position.y - 35,
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
