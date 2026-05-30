// TDS Button wrapper — swap internals when @apps-in-toss/framework docs arrive.
// Variants: primary (filled blue), ghost (outlined), share (outlined light blue).

import { Pressable, StyleSheet, Text } from 'react-native';

type Variant = 'primary' | 'ghost' | 'share';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: ButtonProps) {
  // disabled일 때 primary 배경만 흐리게, 나머지는 텍스트 색으로 표현.
  const containerStyle = [
    styles.base,
    variant === 'primary' && (disabled ? styles.primaryDisabled : styles.primary),
    variant === 'ghost' && styles.ghost,
    variant === 'share' && styles.share,
  ];
  const textStyle = [
    styles.label,
    variant === 'primary' && styles.labelPrimary,
    variant === 'ghost' && (disabled ? styles.labelDisabled : styles.labelGhost),
    variant === 'share' && styles.labelShare,
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={containerStyle}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#3182f6',
  },
  primaryDisabled: {
    backgroundColor: '#c6d3e3',
  },
  ghost: {
    borderWidth: 1,
    borderColor: '#dfe3e8',
  },
  share: {
    borderWidth: 1,
    borderColor: '#c6dafc',
    backgroundColor: '#f4f8ff',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelPrimary: {
    color: 'white',
  },
  labelGhost: {
    color: '#4e5968',
  },
  labelDisabled: {
    color: '#8b95a1',
  },
  labelShare: {
    color: '#1b64da',
  },
});
