// 스켈레톤 로더 — 30-60s LLM 호출 동안 빈 화면 대신 shimmer 블록을 보여 정지감을 줄인다.

import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

function ShimmerBlock({ height, widthPct = 100 }: { height: number; widthPct?: number }) {
  const { palette, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{
        height,
        width: `${widthPct}%` as `${number}%`,
        backgroundColor: palette.surfaceWeak,
        borderRadius: radius.sm,
        opacity,
      }}
    />
  );
}

/** 결과 화면 형태를 모사한 스켈레톤(헤드라인 + 본문 줄들). */
export function FortuneSkeleton() {
  const { spacing } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: '100%', gap: spacing.lg, paddingHorizontal: spacing.xxl }}
    >
      <ShimmerBlock height={28} widthPct={70} />
      <ShimmerBlock height={16} widthPct={100} />
      <ShimmerBlock height={16} widthPct={92} />
      <ShimmerBlock height={16} widthPct={80} />
    </View>
  );
}
