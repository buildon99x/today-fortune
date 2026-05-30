// 칩 그룹 — 단일 선택(radiogroup) 시맨틱으로 스크린리더가 "여러 개 중 하나" 패턴을 알리게 한다.

import { View } from 'react-native';
import { Chip } from './Chip';
import { useTheme } from '../hooks/useTheme';

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  wrap = false,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
  wrap?: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: spacing.md }}
    >
      {options.map((o) => (
        <Chip key={o.id} active={value === o.id} label={o.label} onPress={() => onChange(o.id)} />
      ))}
    </View>
  );
}
