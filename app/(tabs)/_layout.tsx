import React from 'react';
import { Tabs } from 'expo-router';

import { useTheme } from '@/styles/theme';
import { fonts, fontSize, letterSpacing, borders, space } from '@/styles/tokens';

export default function TabsLayout(): React.ReactElement {
  const { t } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.ember,
        tabBarInactiveTintColor: t.inkSoft,
        // Hide the icon slot entirely so the label gets the full vertical room.
        tabBarShowLabel: true,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: fontSize.caption,
          lineHeight: fontSize.caption * 1.6, // generous so uppercase letters aren't clipped
          letterSpacing: letterSpacing.micro,
          textTransform: 'uppercase',
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarStyle: {
          backgroundColor: t.paper,
          borderTopColor: t.rule,
          borderTopWidth: borders.hairline,
          // No explicit height — RN bottom-tabs adds the home-indicator inset on top.
          paddingTop: space.sm,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'TODAY' }} />
      <Tabs.Screen name="log" options={{ title: 'LOG' }} />
      <Tabs.Screen name="weight" options={{ title: 'WEIGHT' }} />
      <Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
    </Tabs>
  );
}
