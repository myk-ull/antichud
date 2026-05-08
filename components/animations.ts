/**
 * Antichud entrance animations — restrained, scientific, editorial.
 *
 * Two flavors only:
 *   • screenEntry — fade + 8px slide up, fires once when a screen mounts
 *   • cardEntry   — fade + 6px slide up with optional stagger, for sibling
 *                   sections within a screen (40ms between siblings)
 *
 * Always use the declarative `entering` prop on `Animated.View`. Never wrap
 * components that already animate internally (Ring, KJReadout, etc.).
 */

import { FadeInUp } from 'react-native-reanimated';
import { motion } from '@/styles/tokens';

export function screenEntry() {
  return FadeInUp.duration(motion.screenEnterMs).withInitialValues({
    originY: 8,
    opacity: 0,
  });
}

export function cardEntry(indexInGroup: number = 0) {
  return FadeInUp.duration(motion.screenEnterMs)
    .delay(indexInGroup * motion.cardStaggerMs)
    .withInitialValues({
      originY: 6,
      opacity: 0,
    });
}
