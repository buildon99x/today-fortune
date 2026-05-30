// 디자인 토큰 단일 진실. 화면 인라인 hex/매직넘버를 시맨틱 키로 흡수한다.
// 라이트 팔레트 값은 현재 화면에서 verbatim으로 옮겨 시각 회귀 0. 다크는 Toss풍으로 파생.
// useColorScheme()(RN)은 .tsx 경계에서 selectPalette에 주입 — 이 파일은 RN을 import하지 않는다.

export const lightPalette = {
  brand: '#3182f6', // primary CTA
  brandText: '#1b64da', // active chip / link text
  brandWeakBg: '#eaf2ff', // active chip bg
  accentBorder: '#c6dafc', // share button border
  accentBg: '#f4f8ff', // share / acknowledgement card bg
  textPrimary: '#333d4b',
  textSecondary: '#4e5968',
  textTertiary: '#6b7684',
  textMuted: '#8b95a1',
  danger: '#f04452',
  surface: '#ffffff',
  surfaceWeak: '#f2f4f6', // lucky-item chip bg
  border: '#dfe3e8',
  borderWeak: '#eaedf1', // locked card border
  disabledBg: '#c6d3e3',
  onBrand: '#ffffff', // text on brand button
};

// 다크: 표면을 어둡게, 텍스트를 밝게 반전. 브랜드 계열은 대비를 위해 약간 밝힘.
export const darkPalette = {
  brand: '#4593fc',
  brandText: '#6ba6ff',
  brandWeakBg: '#16243a',
  accentBorder: '#27457a',
  accentBg: '#172234',
  textPrimary: '#e8ebed',
  textSecondary: '#c3c9d0',
  textTertiary: '#9aa3ad',
  textMuted: '#7a838d',
  danger: '#ff6471',
  surface: '#17171c',
  surfaceWeak: '#23242a',
  border: '#33363d',
  borderWeak: '#2a2c32',
  disabledBg: '#2f3540',
  onBrand: '#ffffff',
};

export const spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, xxxl: 24 };

export const radius = { sm: 10, md: 12, lg: 16, pill: 999 };

export const font = {
  size: { xs: 12, sm: 13, md: 14, lg: 15, body: 16, title: 24 },
  weight: { regular: '400', medium: '600', bold: '700', heavy: '800' },
};

export const lineHeight = { tight: 18, body: 23, headline: 32 };

/** scheme → 팔레트. 'dark'만 다크, 그 외(null/undefined/'light'/'no-preference')는 라이트. */
export function selectPalette(scheme) {
  return scheme === 'dark' ? darkPalette : lightPalette;
}
