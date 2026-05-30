// 선택 칩 래퍼 — 토큰 기반. 추후 TDS SegmentedControl/Chip으로 교체 국소화.

import { Pressable, Text, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { usePressFeedback } from '../hooks/usePressFeedback';

export function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { palette, spacing, radius } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressFeedback(0.95);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={{
          borderWidth: 1,
          borderColor: active ? palette.brand : palette.border,
          backgroundColor: active ? palette.brandWeakBg : palette.surface,
          paddingVertical: spacing.sm + 3,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.pill,
        }}
      >
        <Text style={{ color: active ? palette.brandText : palette.textSecondary }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
