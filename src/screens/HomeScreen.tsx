// 입력 화면: 생년월일 + 성별 + 운세 유형.
// UX: 입력 중 인라인 검증(코어 firstBirthInputError 재사용), 유효할 때만 CTA 활성화.

import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import type { BirthInput } from '../App';
import { firstBirthInputError } from '../validation.mjs';
import { Button, Chip, TextField } from '../components/tds';

const TYPES: { id: BirthInput['type']; label: string; hint: string }[] = [
  { id: 'daily', label: '오늘의 운세', hint: '오늘 하루의 흐름과 마음의 결을 짚어드려요.' },
  { id: 'saju', label: '사주 총운', hint: '타고난 사주의 큰 결과 올해의 방향을 살펴봐요.' },
  { id: 'love', label: '애정운', hint: '관계와 마음, 곁에 있는 사람과의 흐름을 봐요.' },
  { id: 'wealth', label: '재물운', hint: '돈과 일의 흐름, 결정의 타이밍을 살펴봐요.' },
];

const GENDERS: { id: BirthInput['gender']; label: string }[] = [
  { id: 'female', label: '여성' },
  { id: 'male', label: '남성' },
  { id: 'unspecified', label: '선택안함' },
];

export function HomeScreen({
  onSubmit,
  initial = null,
}: {
  onSubmit: (input: BirthInput) => void;
  initial?: BirthInput | null;
}) {
  const [year, setYear] = useState(initial ? String(initial.year) : '');
  const [month, setMonth] = useState(initial ? String(initial.month).padStart(2, '0') : '');
  const [day, setDay] = useState(initial ? String(initial.day).padStart(2, '0') : '');
  const [gender, setGender] = useState<BirthInput['gender']>(initial?.gender ?? 'unspecified');
  const [type, setType] = useState<BirthInput['type']>(initial?.type ?? 'daily');

  const filled = year !== '' && month !== '' && day !== '';
  const error = useMemo(
    () =>
      filled
        ? firstBirthInputError({
            year: Number(year),
            month: Number(month),
            day: Number(day),
            gender,
          })
        : null,
    [filled, year, month, day, gender],
  );
  const canSubmit = filled && !error;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ year: Number(year), month: Number(month), day: Number(day), gender, type });
  };

  return (
    <View style={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800' }}>AI 운세</Text>
        <Text style={{ color: '#6b7684' }}>생년월일을 입력하면 오늘의 흐름을 짚어드려요.</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4e5968' }}>생년월일</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextField
            placeholder="1995"
            maxLength={4}
            value={year}
            onChangeText={setYear}
            flex={1.4}
            accessibilityLabel="태어난 연도"
          />
          <TextField
            placeholder="07"
            maxLength={2}
            value={month}
            onChangeText={setMonth}
            accessibilityLabel="태어난 월"
          />
          <TextField
            placeholder="15"
            maxLength={2}
            value={day}
            onChangeText={setDay}
            accessibilityLabel="태어난 일"
          />
        </View>
        {error ? (
          <Text style={{ color: '#f04452', fontSize: 13 }} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : (
          <Text style={{ color: '#8b95a1', fontSize: 12 }}>
            🔒 본인을 알 수 있는 정보는 서버에 남지 않아요.
          </Text>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4e5968' }}>성별</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {GENDERS.map((g) => (
            <Chip
              key={g.id}
              active={gender === g.id}
              label={g.label}
              onPress={() => setGender(g.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4e5968' }}>운세 유형</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TYPES.map((t) => (
            <Chip key={t.id} active={type === t.id} label={t.label} onPress={() => setType(t.id)} />
          ))}
        </View>
        <Text style={{ color: '#6b7684', fontSize: 13, lineHeight: 18 }}>
          {TYPES.find((t) => t.id === type)?.hint}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Button label="운세 보기" onPress={submit} variant="primary" disabled={!canSubmit} />
        {!canSubmit && !error ? (
          <Text style={{ color: '#8b95a1', fontSize: 12, textAlign: 'center' }}>
            생년월일을 모두 입력해 주세요.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
