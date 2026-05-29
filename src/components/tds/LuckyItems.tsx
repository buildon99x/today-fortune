// TDS LuckyItems — row of labeled value chips (color / number / direction).
// 값이 없는 필드는 렌더링하지 않고, 모두 비어 있으면 null 반환.

import { StyleSheet, Text, View } from 'react-native';
import type { LuckyItemsData } from '../../services/fortuneApi';

type LuckyItemsProps = {
  items: LuckyItemsData;
};

export function LuckyItems({ items }: LuckyItemsProps) {
  // undefined/null 필드를 제거해 빈 칩이 생기지 않게 필터링.
  const chips = [
    items.color != null && { k: '행운의 색', v: items.color },
    items.number != null && { k: '행운의 숫자', v: String(items.number) },
    items.direction != null && { k: '행운의 방향', v: items.direction },
  ].filter((c): c is { k: string; v: string } => c !== false);

  if (chips.length === 0) return null;

  return (
    <View style={styles.row}>
      {chips.map((c) => (
        <View key={c.k} style={styles.chip}>
          <Text style={styles.chipKey}>{c.k}</Text>
          <Text style={styles.chipValue}>{c.v}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f2f4f6',
    borderRadius: 10,
    padding: 12,
    minWidth: 96,
  },
  chipKey: {
    fontSize: 12,
    color: '#8b95a1',
  },
  chipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333d4b',
  },
});
