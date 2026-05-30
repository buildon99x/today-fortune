// 카드 컨테이너 래퍼 — 외곽선/연파랑 톤 표면. 추후 TDS 표면 컴포넌트로 교체 국소화.

import { View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';

export type CardVariant = 'outline' | 'accent';

export function Card({
  children,
  variant = 'outline',
  gap,
}: {
  children: ReactNode;
  variant?: CardVariant;
  gap?: number;
}) {
  const { palette, spacing, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: variant === 'accent' ? palette.accentBg : palette.surface,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: palette.borderWeak,
        borderRadius: radius.lg,
        padding: spacing.xl,
        gap: gap ?? spacing.md,
      }}
    >
      {children}
    </View>
  );
}
