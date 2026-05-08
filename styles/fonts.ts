/**
 * Font loader — call `useLoadFonts()` once at the root and gate render on it.
 *
 * We deliberately load three families:
 *   - DM Serif Display (display)
 *   - Work Sans (body / UI)
 *   - JetBrains Mono (kJ readouts, tabular figures)
 *
 * The display + mono pairing is the brand. Do not substitute Inter/Roboto.
 */

import { useFonts } from 'expo-font';
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

export function useLoadFonts(): { loaded: boolean; error: Error | null } {
  const [loaded, error] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  return { loaded, error };
}
