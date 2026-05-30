// 테마 훅 — useColorScheme()(RN 바인딩 유일 지점)을 순수 selectPalette에 주입한다.
// 로직은 theme/tokens.mjs에 있고 여기선 RN 시스템 설정만 읽는다.
//
// .mjs 토큰은 allowJs로 들어오며 문자열이 string으로 넓어진다. RN의 fontWeight는 리터럴
// 유니온을 요구하므로, 이 경계에서 한 번만 타입을 좁혀 모든 소비처가 안전하게 쓰게 한다.

import { useColorScheme } from 'react-native';
import {
  selectPalette,
  spacing as rawSpacing,
  radius as rawRadius,
  font as rawFont,
  lineHeight as rawLineHeight,
} from '../theme/tokens.mjs';

export type Palette = Record<string, string>;
export type FontWeight = '400' | '600' | '700' | '800';

type Tokens = {
  spacing: Record<string, number>;
  radius: Record<string, number>;
  font: {
    size: Record<string, number>;
    weight: { regular: FontWeight; medium: FontWeight; bold: FontWeight; heavy: FontWeight };
  };
  lineHeight: Record<string, number>;
};

const spacing = rawSpacing as Tokens['spacing'];
const radius = rawRadius as Tokens['radius'];
const font = rawFont as Tokens['font'];
const lineHeight = rawLineHeight as Tokens['lineHeight'];

export function useTheme() {
  const scheme = useColorScheme();
  return {
    palette: selectPalette(scheme) as Palette,
    spacing,
    radius,
    font,
    lineHeight,
    isDark: scheme === 'dark',
  };
}
