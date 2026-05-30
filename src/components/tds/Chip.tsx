// TDS Chip/SegmentedControl item — pill-shaped toggle.
// active일 때 파란 테두리+배경, inactive는 회색 테두리.

import { Pressable, StyleSheet, Text } from 'react-native';

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function Chip({ label, active, onPress }: ChipProps) {
  const containerStyle = [styles.base, active ? styles.active : styles.inactive];
  const textStyle = [styles.label, active ? styles.labelActive : styles.labelInactive];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={containerStyle}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  active: {
    borderColor: '#3182f6',
    backgroundColor: '#eaf2ff',
  },
  inactive: {
    borderColor: '#dfe3e8',
    backgroundColor: 'white',
  },
  label: {
    fontSize: 14,
  },
  labelActive: {
    color: '#1b64da',
  },
  labelInactive: {
    color: '#4e5968',
  },
});
