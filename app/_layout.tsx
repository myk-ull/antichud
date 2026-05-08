import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { KeyboardAccessory } from '@/components';
import { useLoadFonts } from '@/styles/fonts';
import { useTheme, useHydrateTheme } from '@/styles/theme';
import { hydrateAll } from '@/lib/state';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): React.ReactElement | null {
  const { loaded: fontsLoaded } = useLoadFonts();
  const themeHydrated = useHydrateTheme();
  const { t } = useTheme();
  const [storesHydrated, setStoresHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateAll().then(() => {
      if (!cancelled) setStoresHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = fontsLoaded && themeHydrated && storesHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <View style={[styles.flex, { backgroundColor: t.paper }]}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.paper } }} />
          </View>
          {/* Sticky bar above the keyboard with PREV / NEXT / DONE.
              Auto-discovers focused TextInputs across all screens. */}
          <KeyboardAccessory />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
