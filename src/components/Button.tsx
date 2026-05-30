// 버튼 래퍼 — 화면이 RN Pressable을 직접 쓰지 않게 해 추후 TDS Button 교체를 국소화한다.
// variant: primary(브랜드)/ghost(외곽선)/share(연파랑). loading 시 스피너 + 비활성.

import { Pressable, Text, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { usePressFeedback } from '../hooks/usePressFeedback';

export type ButtonVariant = 'primary' | 'ghost' | 'share';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
}: {
  label?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}) {
  const { palette, spacing, radius, font } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressFeedback();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? isDisabled
        ? palette.disabledBg
        : palette.brand
      : variant === 'share'
        ? palette.accentBg
        : 'transparent';
  const borderColor =
    variant === 'ghost' ? palette.border : variant === 'share' ? palette.accentBorder : 'transparent';
  const textColor =
    variant === 'primary'
      ? palette.onBrand
      : variant === 'share'
        ? palette.brandText
        : palette.textSecondary;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityHint={accessibilityHint}
        style={{
          backgroundColor: bg,
          borderWidth: variant === 'primary' ? 0 : 1,
          borderColor,
          paddingVertical: variant === 'share' ? spacing.lg : spacing.xl,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.md,
          minHeight: 44, // 터치 타깃 최소 44px 보장 — share 변형(패딩 작음)도 미달하지 않게.
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={{ color: textColor, fontWeight: font.weight.bold, fontSize: font.size.body }}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
