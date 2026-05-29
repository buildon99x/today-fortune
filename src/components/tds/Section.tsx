// TDS Section card — title + body content block.
// ResultScreen의 운세 섹션 패턴을 재사용 가능한 컴포넌트로 추출.

import { StyleSheet, Text, View } from 'react-native';

type SectionProps = {
  title: string;
  body: string;
};

export function Section({ title, body }: SectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333d4b',
  },
  body: {
    lineHeight: 23,
    color: '#333d4b',
    fontSize: 15,
  },
});
