// 입력 화면: 생년월일 + 성별 + 운세 유형.
// UX: 입력 중 인라인 검증(코어 firstBirthInputError 재사용), 유효할 때만 CTA 활성화.
// 스타일/문구는 디자인 토큰(useTheme) + i18n 테이블에서 온다. 컴포넌트 래퍼가 추후 TDS 교체 지점.

import { useMemo, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import type { BirthInput } from '../App';
import { firstBirthInputError } from '../validation.mjs';
import { createTranslator, createLookup } from '../i18n/index.mjs';
import { useTheme } from '../hooks/useTheme';
import { useHaptics } from '../hooks/useHaptics';
import { TextField } from '../components/TextField';
import { ChipGroup } from '../components/ChipGroup';
import { Button } from '../components/Button';

const t = createTranslator();
const lookup = createLookup();

const TYPE_IDS: BirthInput['type'][] = ['daily', 'saju', 'love', 'wealth'];
const GENDER_IDS: BirthInput['gender'][] = ['female', 'male', 'unspecified'];

export function HomeScreen({
  onSubmit,
  initial = null,
}: {
  onSubmit: (input: BirthInput) => void;
  initial?: BirthInput | null;
}) {
  const { palette, spacing, font } = useTheme();
  const haptics = useHaptics();
  const [year, setYear] = useState(initial ? String(initial.year) : '');
  const [month, setMonth] = useState(initial ? String(initial.month).padStart(2, '0') : '');
  const [day, setDay] = useState(initial ? String(initial.day).padStart(2, '0') : '');
  const [gender, setGender] = useState<BirthInput['gender']>(initial?.gender ?? 'unspecified');
  const [type, setType] = useState<BirthInput['type']>(initial?.type ?? 'daily');

  const types = lookup('home.types') as Record<string, { label: string; hint: string }>;
  const genders = lookup('home.genders') as Record<string, string>;
  const typeOptions = TYPE_IDS.map((id) => ({ id, label: types[id].label }));
  const genderOptions = GENDER_IDS.map((id) => ({ id, label: genders[id] }));

  const filled = year !== '' && month !== '' && day !== '';
  const error = useMemo(
    () =>
      filled
        ? firstBirthInputError({ year: Number(year), month: Number(month), day: Number(day), gender })
        : null,
    [filled, year, month, day, gender],
  );
  const canSubmit = filled && !error;

  const submit = () => {
    if (!canSubmit) return;
    haptics.fire('submit');
    onSubmit({ year: Number(year), month: Number(month), day: Number(day), gender, type });
  };

  const label = { fontSize: font.size.md, fontWeight: font.weight.medium, color: palette.textSecondary } as const;

  return (
    // 작은 화면 + number-pad(완료 키 없음)에서 키보드가 CTA를 가리지 않게 스크롤 + 키보드 회피.
    // keyboardShouldPersistTaps='handled': 키보드가 떠 있어도 칩/CTA 탭이 한 번에 먹히게.
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: spacing.xxl, gap: spacing.xl }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: font.size.title, fontWeight: font.weight.heavy, color: palette.textPrimary }}>
            {t('home.title')}
          </Text>
          <Text style={{ color: palette.textTertiary }}>{t('home.subtitle')}</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={label}>{t('home.birthLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextField
              placeholder={t('home.yearPlaceholder')}
              maxLength={4}
              value={year}
              onChangeText={setYear}
              flex={1.4}
              accessibilityLabel={t('home.yearA11yLabel')}
            />
            <TextField
              placeholder={t('home.monthPlaceholder')}
              maxLength={2}
              value={month}
              onChangeText={setMonth}
              accessibilityLabel={t('home.monthA11yLabel')}
            />
            <TextField
              placeholder={t('home.dayPlaceholder')}
              maxLength={2}
              value={day}
              onChangeText={setDay}
              accessibilityLabel={t('home.dayA11yLabel')}
            />
          </View>
          {error ? (
            <Text style={{ color: palette.danger, fontSize: font.size.sm }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : (
            <Text
              style={{ color: palette.textMuted, fontSize: font.size.xs }}
              accessibilityLabel={t('home.privacyA11yLabel')}
            >
              {t('home.privacyNote')}
            </Text>
          )}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={label}>{t('home.genderLabel')}</Text>
          <ChipGroup
            options={genderOptions}
            value={gender}
            onChange={(g) => {
              haptics.fire('chip-select');
              setGender(g);
            }}
            accessibilityLabel={t('home.genderLabel')}
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={label}>{t('home.typeLabel')}</Text>
          <ChipGroup
            options={typeOptions}
            value={type}
            onChange={(ty) => {
              haptics.fire('chip-select');
              setType(ty);
            }}
            accessibilityLabel={t('home.typeLabel')}
            wrap
          />
          <Text style={{ color: palette.textTertiary, fontSize: font.size.sm, lineHeight: 18 }}>
            {types[type].hint}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('home.cta')}
            onPress={submit}
            disabled={!canSubmit}
            accessibilityHint={t('home.subtitle')}
          />
          {!canSubmit && !error ? (
            <Text style={{ color: palette.textMuted, fontSize: font.size.xs, textAlign: 'center' }}>
              {t('home.fillAll')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
