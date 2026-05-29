// 결과 화면. 무료 운세는 백엔드에서 받아오고, 프리미엄은 해제 시 서버에서 가져온다.
//   1) 진입 직전 전면광고 1회 (showInterstitial)
//   2) 무료: 백엔드가 내려준 headline + 첫 섹션
//   3) 잠긴 영역: IAP 영수증 / 보상형 광고 토큰을 서버에 보내 프리미엄 해제
// TODO(검수): RN primitives → TDS 컴포넌트로 교체.

import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Share } from 'react-native';
import type { BirthInput } from '../App';
import { fetchFortune, unlockFortune, type FreeFortune } from '../services/fortuneApi';
import { showInterstitial, showRewarded } from '../services/ads';
import { purchase, PRODUCTS } from '../services/iap';
import { buildShareMessage } from '../share.mjs';

type Premium = { sections: { title: string; body: string }[]; advice: string; luckyItems: any };
type LoadState = { status: 'loading' | 'ready' | 'error'; data?: FreeFortune; error?: string };

const FALLBACK_LOAD_ERROR = '오늘의 흐름이 잠시 흐려졌어요. 조금 뒤에 다시 보여드릴게요.';
const FALLBACK_UNLOCK_ERROR = '잠깐 흐름이 흐려졌어요. 다시 한 번 시도해 주실래요?';

export function ResultScreen({ input, onBack }: { input: BirthInput; onBack: () => void }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [premium, setPremium] = useState<Premium | null>(null);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      await showInterstitial();
      const data = await fetchFortune(input);
      setState({ status: 'ready', data });
    } catch (e: any) {
      setState({ status: 'error', error: e?.message ?? FALLBACK_LOAD_ERROR });
    }
  }, [input]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color="#3182f6" />
        <RotatingLoadMessage />
      </Centered>
    );
  }

  if (state.status === 'error') {
    return (
      <Centered>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ fontSize: 16, textAlign: 'center' }}
        >
          {state.error}
        </Text>
        <Pressable onPress={load} accessibilityRole="button" style={primaryBtn}>
          <Text style={primaryTxt}>다시 시도</Text>
        </Pressable>
        <Pressable onPress={onBack} accessibilityRole="button" style={ghostBtn}>
          <Text>다시 입력하기</Text>
        </Pressable>
      </Centered>
    );
  }

  const fortune = state.data!;

  const onShare = () => {
    Share.share({ message: buildShareMessage(fortune) });
  };
  const unlockByPurchase = async () => {
    setUnlockMsg(null);
    try {
      const { purchased, receipt } = await purchase(PRODUCTS.fullReading);
      if (!purchased || !receipt) return;
      setPremium(await unlockFortune(input, { type: 'iap', receipt }));
    } catch (e: any) {
      setUnlockMsg(e?.message ?? FALLBACK_UNLOCK_ERROR);
    }
  };
  const unlockByAd = async () => {
    setUnlockMsg(null);
    try {
      const { rewarded, token } = await showRewarded();
      if (!rewarded || !token) return;
      setPremium(await unlockFortune(input, { type: 'rewarded_ad', token }));
    } catch (e: any) {
      setUnlockMsg(e?.message ?? FALLBACK_UNLOCK_ERROR);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, color: '#8b95a1' }}>
          {labelForType(fortune.meta.type)} · {formatDate(fortune.meta.date)}
        </Text>
        {fortune.acknowledgement?.trim() ? (
          <View style={ackCard}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontSize: 15, lineHeight: 23, color: '#4e5968', fontStyle: 'italic' }}
            >
              {fortune.acknowledgement}
            </Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 24, fontWeight: '800', lineHeight: 32 }}>{fortune.headline}</Text>
      </View>

      {fortune.sections.map((s, i) => (
        <Section key={i} title={s.title} body={s.body} />
      ))}

      <Pressable onPress={onShare} accessibilityRole="button" style={shareBtn}>
        <Text style={{ color: '#1b64da', fontWeight: '600' }}>친구에게 공유하기</Text>
      </Pressable>

      {fortune.locked && !premium && (
        <View style={lockedCard}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>🔒 상세 운세 · 행운 아이템 · 조언</Text>
          <Text style={{ color: '#4e5968', fontSize: 14, fontStyle: 'italic' }}>
            오늘의 흐름은 관계운과 조언에서 한 번 더 깊어져요.
          </Text>
          <Text style={{ color: '#6b7684', fontSize: 13 }}>전체 운세를 열어 행운의 색·숫자·방향까지 함께 받아보세요.</Text>
          <Pressable onPress={unlockByPurchase} accessibilityRole="button" style={primaryBtn}>
            <Text style={primaryTxt}>전체 운세 해제</Text>
          </Pressable>
          <Pressable onPress={unlockByAd} accessibilityRole="button" style={ghostBtn}>
            <Text>광고 보고 무료로 해제</Text>
          </Pressable>
          {unlockMsg ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={{ color: '#f04452', fontSize: 13 }}
            >
              {unlockMsg}
            </Text>
          ) : null}
        </View>
      )}

      {premium && (
        <>
          {premium.sections.map((s, i) => (
            <Section key={i} title={s.title} body={s.body} />
          ))}
          {premium.advice ? <Section title="오늘의 조언" body={premium.advice} /> : null}
          {premium.luckyItems ? <LuckyItems items={premium.luckyItems} /> : null}
        </>
      )}

      <Pressable onPress={onBack} accessibilityRole="button" style={ghostBtn}>
        <Text>다시 입력하기</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '700', fontSize: 16 }}>{title}</Text>
      <Text style={{ lineHeight: 23, color: '#333d4b' }}>{body}</Text>
    </View>
  );
}

function LuckyItems({ items }: { items: { color?: string; number?: number; direction?: string } }) {
  const chips = [
    items.color && { k: '행운의 색', v: items.color },
    items.number != null && { k: '행운의 숫자', v: String(items.number) },
    items.direction && { k: '행운의 방향', v: items.direction },
  ].filter(Boolean) as { k: string; v: string }[];
  if (chips.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {chips.map((c) => (
        <View key={c.k} style={{ backgroundColor: '#f2f4f6', borderRadius: 10, padding: 12, minWidth: 96 }}>
          <Text style={{ fontSize: 12, color: '#8b95a1' }}>{c.k}</Text>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>{c.v}</Text>
        </View>
      ))}
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>{children}</View>;
}

// LLM 호출 30-60s 동안 정지로 보이지 않게 회전. 첫 메시지는 대기 이유를 짧게 알려 이탈 ↓.
const LOAD_MESSAGES = [
  '천천히 살피는 게 더 정확해서요…',
  '사주의 결을 하나씩 읽고 있어요…',
  '마음에 닿을 한 줄을 다듬는 중이에요…',
  '곧 보여드릴게요…',
];

function RotatingLoadMessage() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    // 5초 간격 — 너무 빠르면 산만, 너무 느리면 정지로 보임.
    const id = setInterval(() => setIdx((i) => (i + 1) % LOAD_MESSAGES.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text accessibilityLiveRegion="polite" style={{ color: '#6b7684', textAlign: 'center' }}>
      {LOAD_MESSAGES[idx]}
    </Text>
  );
}

function labelForType(type: FreeFortune['meta']['type']) {
  return { daily: '오늘의 운세', saju: '사주 총운', love: '애정운', wealth: '재물운' }[type];
}

// 'YYYY-MM-DD' → 'YYYY.MM.DD' — 한국어 UI 관습 + 동일 너비.
function formatDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.replace(/-/g, '.') : iso;
}

const primaryBtn = { backgroundColor: '#3182f6', padding: 14, borderRadius: 12, alignItems: 'center' } as const;
const primaryTxt = { color: 'white', fontWeight: '700' } as const;
const ghostBtn = { borderWidth: 1, borderColor: '#dfe3e8', padding: 14, borderRadius: 12, alignItems: 'center' } as const;
const shareBtn = { borderWidth: 1, borderColor: '#c6dafc', backgroundColor: '#f4f8ff', padding: 12, borderRadius: 12, alignItems: 'center' } as const;
const lockedCard = { borderWidth: 1, borderColor: '#eaedf1', borderRadius: 16, padding: 16, gap: 10 } as const;
const ackCard = { backgroundColor: '#f4f8ff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 } as const;
