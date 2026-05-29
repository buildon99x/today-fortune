// 입력 화면: 생년월일 + 성별 + 운세 유형.
// UX: 입력 중 인라인 검증(코어 firstBirthInputError 재사용), 유효할 때만 CTA 활성화.
// TODO(검수): RN primitives → TDS 컴포넌트(TextField/SegmentedControl/Button)로 교체.

import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import type { BirthInput } from '../App';
import { firstBirthInputError } from '../validation.mjs';

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
        <Text style={label}>생년월일</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="1995"
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={setYear}
            style={[input, { flex: 1.4 }]}
            accessibilityLabel="태어난 연도"
          />
          <TextInput
            placeholder="07"
            keyboardType="number-pad"
            maxLength={2}
            value={month}
            onChangeText={setMonth}
            style={input}
            accessibilityLabel="태어난 월"
          />
          <TextInput
            placeholder="15"
            keyboardType="number-pad"
            maxLength={2}
            value={day}
            onChangeText={setDay}
            style={input}
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
        <Text style={label}>성별</Text>
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
        <Text style={label}>운세 유형</Text>
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
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          style={{
            backgroundColor: canSubmit ? '#3182f6' : '#c6d3e3',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>운세 보기</Text>
        </Pressable>
        {!canSubmit && !error ? (
          <Text style={{ color: '#8b95a1', fontSize: 12, textAlign: 'center' }}>
            생년월일을 모두 입력해 주세요.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        borderWidth: 1,
        borderColor: active ? '#3182f6' : '#dfe3e8',
        backgroundColor: active ? '#eaf2ff' : 'white',
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: active ? '#1b64da' : '#4e5968' }}>{label}</Text>
    </Pressable>
  );
}

const label = { fontSize: 14, fontWeight: '600', color: '#4e5968' } as const;
const input = {
  borderWidth: 1,
  borderColor: '#dfe3e8',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  flex: 1,
  fontSize: 16,
} as const;
