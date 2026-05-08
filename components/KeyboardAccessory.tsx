/**
 * KeyboardAccessory — sticky toolbar above the keyboard with PREV / NEXT / DONE.
 *
 * iOS's native `<InputAccessoryView>` is broken in bridgeless mode (RN new
 * arch), so we use `react-native-keyboard-controller`'s `KeyboardToolbar`,
 * which renders the bar as a JS view positioned by the native keyboard frame
 * events. Works on iOS + Android, in bridgeless mode, with zero per-input
 * wiring — it auto-discovers focused TextInputs by tab order.
 *
 * Mount this ONCE at the app root (inside the `<KeyboardProvider>`). Each
 * screen no longer needs its own per-input `inputAccessoryViewID`.
 */
import React from 'react';
import { KeyboardToolbar } from 'react-native-keyboard-controller';

import { useTheme } from '@/styles/theme';

export type KeyboardAccessoryProps = {
  /** Backwards-compat: the new toolbar auto-discovers focused inputs. */
  nativeID?: string;
};

export function KeyboardAccessory(_props: KeyboardAccessoryProps): React.ReactElement {
  const { t } = useTheme();
  return (
    <KeyboardToolbar
      doneText="DONE"
      theme={{
        light: {
          background: t.paperDeep,
          primary: t.ember,
          disabled: t.inkSoft,
          ripple: t.ember,
        },
        dark: {
          background: t.paperDeep,
          primary: t.ember,
          disabled: t.inkSoft,
          ripple: t.ember,
        },
      }}
    />
  );
}

export default KeyboardAccessory;
