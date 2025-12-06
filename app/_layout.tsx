import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

// Remove default tabs by not anchoring to the (tabs) group
export const unstable_settings = {} as const;

// Inicializa a barra de navegação imediatamente com base no tema do sistema
if (Platform.OS === 'android') {
  const systemTheme = Appearance.getColorScheme();
  const initialColor = systemTheme === 'dark' ? '#1a1a1aFF' : '#ffffffFF';
  const initialButtonStyle = systemTheme === 'dark' ? 'light' : 'dark';
  
  NavigationBar.setPositionAsync('relative');
  NavigationBar.setBackgroundColorAsync(initialColor);
  NavigationBar.setButtonStyleAsync(initialButtonStyle);
}

function RootLayoutContent() {
  const { activeTheme, isThemeLoaded } = useTheme();

  // Estiliza a barra de navegação do Android de acordo com o tema
  useEffect(() => {
    if (Platform.OS === 'android' && isThemeLoaded) {
      const styleNavigationBar = async () => {
        try {
          // Define a barra como translúcida para não sobrepor o conteúdo
          await NavigationBar.setPositionAsync('relative');
          
          if (activeTheme === 'dark') {
            // Tema escuro: barra escura com botões brancos
            await NavigationBar.setButtonStyleAsync('light');
            await NavigationBar.setBackgroundColorAsync('#1a1a1aFF'); // Cor escura opaca
          } else {
            // Tema claro: barra branca com botões pretos
            await NavigationBar.setButtonStyleAsync('dark');
            await NavigationBar.setBackgroundColorAsync('#ffffffFF'); // Branco opaco
          }
        } catch (error) {
          console.log('Error styling navigation bar:', error);
        }
      };
      
      styleNavigationBar();
    }
  }, [activeTheme, isThemeLoaded]);

  return (
    <NavigationThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Keep a minimal stack; screens are file-based via /app */}
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
