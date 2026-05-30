// 숫자 입력 필드 래퍼 — 토큰 기반 스타일 + a11y 라벨. 추후 TDS TextField로 교체 국소화.

import { TextInput, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export function TextField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  maxLength,
  flex = 1,
  keyboardType = 'number-pad',
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  maxLength?: number;
  flex?: number;
  keyboardType?: 'number-pad' | 'default';
}) {
  const { palette, spacing, radius, font } = useTheme();
  return (
    <View style={{ flex }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel}
        style={{
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: radius.sm,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          fontSize: font.size.body,
          color: palette.textPrimary,
          backgroundColor: palette.surface,
        }}
      />
    </View>
  );
}
