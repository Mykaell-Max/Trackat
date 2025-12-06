import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SvgXml } from 'react-native-svg';
import { auth, db } from "../firebase";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha email e senha");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      const displayName = username.trim() || email.split("@")[0];
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        username: displayName,
        email: email.trim(),
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Usuário não existe, tentar criar conta
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          
          const displayName = username.trim() || email.split("@")[0];
          await setDoc(doc(db, "users", userCredential.user.uid), {
            uid: userCredential.user.uid,
            username: displayName,
            email: email.trim(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          
          Alert.alert("Sucesso", "Conta criada com sucesso!");
        } catch (createError: any) {
          if (createError.code === "auth/email-already-in-use") {
            Alert.alert("Erro", "Email já cadastrado. Verifique sua senha.");
          } else if (createError.code === "auth/weak-password") {
            Alert.alert("Erro", "Senha muito fraca (mínimo 6 caracteres)");
          } else {
            Alert.alert("Erro", createError.message);
          }
        }
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        Alert.alert("Erro", "Email ou senha incorretos");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Erro", "Email inválido");
      } else {
        Alert.alert("Erro", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const logoSvg = `
  <svg width="632" height="660" viewBox="0 0 632 660" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M44.9141 0.0898438L61.4121 7.58887L61.501 7.62891L61.5928 7.6709L61.6621 7.74414L61.7285 7.81543H61.7275L80.1865 27.2715L107.151 50.7422H107.152L107.179 50.7646L107.209 50.791L107.235 50.8213L107.258 50.8477H107.257L194.996 151.547L217.607 154.006H217.609L217.688 154.015L217.765 154.023L217.836 154.055L217.908 154.087V154.088L241.15 164.473L280.875 159.508L280.938 159.5H351.562L351.625 159.508L390.838 164.471L413.076 154.094L413.078 154.093L413.154 154.058L413.229 154.023L413.312 154.015L413.395 154.006L436.504 151.547L524.242 50.8477L524.265 50.8213L524.291 50.791L524.321 50.7646L524.348 50.7422L551.312 27.2715L569.771 7.81543L569.838 7.74414L569.907 7.6709L569.999 7.62891L570.088 7.58887L586.586 0.0898438L586.783 0H600.608L600.662 0.0117188L600.715 0.0234375L600.714 0.0244141L616.713 3.52344L616.99 3.58398L617.193 3.7793L631.193 17.2793L631.5 17.5742V77.0703L631.495 77.1045L631.49 77.1396V77.1426L624.99 122.143L624.989 122.148L624.982 122.192L624.977 122.23L624.965 122.267L624.951 122.31L624.949 122.316L601.5 192.664V224.569L601.495 224.604L601.49 224.639V224.641L593.49 280.641L593.489 280.645L593.48 280.703L593.473 280.757L593.453 280.808L593.433 280.861L593.432 280.865L588 294.689V310.281L601.908 340.582L602 340.781V381.108L601.988 381.162L601.977 381.215L587.977 445.213L574.979 507.703L574.937 507.906L574.895 508.111L574.719 508.226L574.544 508.339L574.543 508.338L341.545 659.837L341.546 659.838L341.422 659.919L341.297 660H290.704L290.579 659.92L290.454 659.839L290.453 659.838L58.4531 508.338L58.4521 508.337L58.2842 508.227L58.1172 508.117L58.0723 507.923L58.0264 507.728L58.0254 507.727L43.5254 445.227L43.5234 445.219L43.5225 445.211L43.5215 445.207L30.0215 381.207V381.205L30.0107 381.153L30 381.104V340.788L30.0859 340.595L43.5 310.289V294.689L38.0684 280.865L38.0674 280.861L38.0469 280.808L38.0273 280.757L38.0195 280.703L38.0107 280.645L38.0098 280.641L30.0098 224.641V224.639L30.0049 224.604L30 224.569V192.664L6.55078 122.316L6.54883 122.31L6.53516 122.267L6.52344 122.23L6.51758 122.192L6.51074 122.148L6.50977 122.143L0.00976562 77.1426V77.1396L0.00488281 77.1045L0 77.0703V17.5742L0.306641 17.2793L14.3066 3.7793L14.5098 3.58398L14.7871 3.52344L30.7852 0.0244141V0.0234375L30.8379 0.0117188L30.8916 0H44.7168L44.9141 0.0898438ZM321 542.5H311L301 539L281 546L299 568L305 579L311 584H321L327 579L333 568L351 546L331 539L321 542.5ZM155.066 365.411L149 373.959L149.004 375.053C149.085 386.264 150.401 394.769 152.033 400.872C153.718 407.171 155.74 410.91 157.088 412.424L157.092 412.429L171.241 427.917L171.243 427.918H171.242L193.484 437H193.486L193.512 437.003L217.47 439.496L217.501 439.499L217.532 439.507L225.963 441.491L226 441.499L226.034 441.514L235.934 445.474L235.999 445.499L236.055 445.543L245 452.5V433.5L241.016 412.511L240.998 412.417V412.416L234.429 393.192L223.308 377.699V377.698L210.165 368.082H210.164L210.162 368.081L193.483 361.138L193.479 361.136L183.373 359H168.208L155.066 365.411ZM438.52 361.136L438.517 361.138L421.839 368.079L421.836 368.081L421.835 368.082L408.692 377.698V377.699L397.572 393.192H397.571L391 412.425L387 433.5V452.5L395.945 445.543L396.001 445.499L396.066 445.474L405.966 441.514L406 441.499L406.037 441.491L414.468 439.507L414.499 439.499L414.53 439.496L438.516 437L460.757 427.918L460.758 427.917L474.912 412.424C476.26 410.91 478.282 407.171 479.967 400.872C481.599 394.769 482.915 386.264 482.996 375.053L483 373.959L476.934 365.411V365.41L463.792 359H448.627L438.52 361.136ZM223.459 377.49L223.461 377.488L223.603 377.295L223.459 377.49Z" fill="#FFFFFF"/>
  </svg>`;

  return (
    <View style={[styles.gradient, { backgroundColor: '#000' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.iconWrapper, { backgroundColor: 'transparent', shadowOpacity: 0 }] }>
              <SvgXml xml={logoSvg} width={90} height={90} />
            </View>
            <Text style={[styles.appName, { color: '#fff' }]}>Trackat</Text>
            <Text style={[styles.tagline, { color: '#fff' }]}>Rastreamento em tempo real</Text>
          </View>

          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Nome de usuário (opcional)"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Senha"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>ENTRAR</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Entre com suas credenciais ou crie uma nova conta
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 48,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
    marginBottom: 6,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  formCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eyeIcon: {
    fontSize: 20,
  },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 17,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
  },
  hint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
});
