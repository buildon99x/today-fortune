// 버튼/칩 공통 press 스케일 피드백. Animated.spring으로 눌림 시 살짝 축소.

import { useRef } from 'react';
import { Animated } from 'react-native';

export function usePressFeedback(scaleTo = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  return { scale, onPressIn, onPressOut };
}
