import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';
import { screenEntry } from './animations';

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  noEnter?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  noEnter = false,
  style,
  contentStyle,
  testID,
}: ScreenProps): React.ReactElement {
  const { t } = useTheme();
  const paddingStyle: ViewStyle | null = padded
    ? { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xxl }
    : null;

  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? {
        contentContainerStyle: [paddingStyle, contentStyle],
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled' as const,
      }
    : { style: [paddingStyle, contentStyle] };

  const body = <Body {...bodyProps}>{children}</Body>;

  return (
    <SafeAreaView
      testID={testID}
      style={[styles.root, { backgroundColor: t.paper }, style]}
      edges={['top', 'left', 'right']}
    >
      {noEnter ? (
        body
      ) : (
        <Animated.View style={styles.root} entering={screenEntry()}>
          {body}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default Screen;
