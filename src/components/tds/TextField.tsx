// TDS TextField wrapper — numeric date entry with label, placeholder, error state.
// 포커스 시 테두리를 파란색으로 전환해 입력 중임을 시각적으로 안내.

import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type TextFieldProps = {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  maxLength?: number;
  flex?: number;
  accessibilityLabel?: string;
};

export function TextField({
  label,
  placeholder,
  value,
  onChangeText,
  maxLength,
  flex,
  accessibilityLabel,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  // 포커스 상태에 따라 테두리 색을 동적으로 결정.
  const inputStyle = [styles.input, focused && styles.inputFocused, flex != null && { flex }];

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel ?? label}
        style={inputStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4e5968',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe3e8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#c6dafc',
    backgroundColor: '#f4f8ff',
  },
});
