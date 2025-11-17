# 📍 Trackat

**Trackat** é um aplicativo mobile open source para rastreamento de localização em tempo real e comunicação entre grupos de amigos ou famílias.

## ✨ Funcionalidades

- **Localização em tempo real**: Compartilhe sua posição GPS com amigos e visualize todos no mapa
- **Alertas instantâneos**: Envie notificações para o grupo com diferentes tipos de chamados
- **Interface intuitiva**: Mapa interativo com marcadores coloridos e nomes sempre visíveis
- **Sistema de usuários**: Login/cadastro com username personalizado

## 🚀 Tecnologias

### Core
- **[Expo](https://expo.dev)** (~54.0.22) - Framework React Native para desenvolvimento cross-platform
- **[React Native](https://reactnative.dev)** (0.81.5) - Framework mobile
- **[TypeScript](https://www.typescriptlang.org)** - Linguagem com tipagem estática

### Firebase
- **[Firebase Authentication](https://firebase.google.com/products/auth)** - Autenticação de usuários
- **[Cloud Firestore](https://firebase.google.com/products/firestore)** - Banco de dados em tempo real
- **[Firebase Storage](https://firebase.google.com/products/storage)** - Armazenamento de arquivos

### Principais Bibliotecas
- **[expo-location](https://docs.expo.dev/versions/latest/sdk/location/)** (~18.0.10) - Acesso à localização GPS
- **[expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)** (~0.30.7) - Notificações locais
- **[react-native-maps](https://github.com/react-native-maps/react-native-maps)** (1.15.6) - Componente de mapa (Google Maps)
- **[@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/)** (2.2.0) - Persistência local

## 📱 Tipos de Alertas

- 🆘 **Preciso de ajuda** - Solicitar ajuda não urgente
- 🍻 **Bora beber** - Chamar para encontro social
- 🚨 **Socorro! Emergência** - Alerta de emergência
- 📍 **Venham aqui** - Indicar localização de encontro

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Expo Go (para desenvolvimento)
- Conta Firebase com projeto configurado

### Configuração

1. **Clone o repositório**
```bash
git clone https://github.com/Mykaell-Max/Trackat.git
cd Trackat
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Firebase**

Crie o arquivo `firebase.ts` na raiz do projeto com suas credenciais:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
```

4. **Configure as regras do Firestore**

No Firebase Console, adicione estas regras de segurança:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /alerts/{alertId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Inicie o projeto**
```bash
npx expo start
```

## 🔒 Privacidade e Segurança

- ⚠️ Este app coleta e compartilha localização em tempo real
- Configure adequadamente as regras de segurança do Firestore
- O arquivo `firebase.ts` está no `.gitignore` para proteger credenciais
- Use em grupos fechados de confiança

## 🚧 Limitações Conhecidas

- **Expo Go**: Notificações push remotas não funcionam completamente. Use development build para funcionalidade completa
- **Foco Android**: Desenvolvimento focado inicialmente em Android

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request