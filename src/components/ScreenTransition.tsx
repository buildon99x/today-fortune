// 화면 전환 페이드 — Home↔Result 토글이 즉시 점프하지 않고 부드럽게 바뀌게 한다.

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type { ReactNode } from 'react';

export function ScreenTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [viewKey, opacity]);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}
