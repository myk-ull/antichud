import React from 'react';
import { Redirect } from 'expo-router';
import { useProfile } from '@/lib/state';

export default function Index(): React.ReactElement | null {
  const profile = useProfile((s) => s.profile);
  const hydrated = useProfile((s) => s.hydrated);
  if (!hydrated) return null;
  return profile === null ? <Redirect href="/onboarding" /> : <Redirect href="/(tabs)" />;
}
