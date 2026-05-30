// 결과 화면. 무료 운세는 백엔드에서 받아오고, 프리미엄은 해제 시 서버에서 가져온다.
//   1) 진입 직전 전면광고 1회 (showInterstitial)
//   2) 무료: 백엔드가 내려준 headline + 첫 섹션
//   3) 잠긴 영역: IAP 영수증 / 보상형 광고 토큰을 서버에 보내 프리미엄 해제
// 해제 라이프사이클은 순수 리듀서(unlockMachine)가 관리 — 로딩/취소/pending/에러/재시도 표면.
// 스타일/문구는 토큰(useTheme) + i18n. 컴포넌트 래퍼가 추후 TDS 교체 지점.

import { useCallback, useEffect, useReducer, useState } from 'react';
import { View, Text, ScrollView, Share } from 'react-native';
import type { BirthInput } from '../App';
import {
  fetchFortune,
  unlockFortune,
  type FreeFortune,
  type LuckyItemsData,
} from '../services/fortuneApi';
import { showInterstitial, showRewarded } from '../services/ads';
import { purchase, restorePurchase, PRODUCTS } from '../services/iap';
import { buildShareMessage } from '../share.mjs';
import { formatDate, labelForType } from '../format.mjs';
import { FALLBACK_LOAD_ERROR, FALLBACK_UNLOCK_ERROR } from '../services/errorCatalog.mjs';
import { createTranslator, createLookup } from '../i18n/index.mjs';
import {
  unlockReducer,
  initialUnlockState,
  UNLOCK_STATES,
  canRetry,
} from '../monetization/unlockMachine.mjs';
import { useTheme } from '../hooks/useTheme';
import { useHaptics } from '../hooks/useHaptics';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FortuneSkeleton } from '../components/Skeleton';

const t = createTranslator();
const lookup = createLookup();

type LoadState = { status: 'loading' | 'ready' | 'error'; data?: FreeFortune; error?: string };

// catch(e)는 unknown — Error만 메시지 추출, 그 외엔 한국어 폴백.
function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function ResultScreen({ input, onBack }: { input: BirthInput; onBack: () => void }) {
  const { palette, spacing, font, lineHeight } = useTheme();
  const haptics = useHaptics();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [unlock, dispatch] = useReducer(unlockReducer, initialUnlockState);
  const [shareError, setShareError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      await showInterstitial();
      const data = await fetchFortune(input);
      setState({ status: 'ready', data });
    } catch (e) {
      haptics.fire('fetch-error');
      setState({ status: 'error', error: errorMessage(e, FALLBACK_LOAD_ERROR) });
    }
  }, [input]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      {/* 상단 정렬 — 결과(ScrollView, 상단 정렬)와 같은 위치에서 스켈레톤이 채워져 로딩→완료 점프 제거. */}
      <View style={{ flex: 1, alignItems: 'center', gap: spacing.xxl, padding: spacing.xxl }}>
        <FortuneSkeleton />
        <RotatingLoadMessage color={palette.textTertiary} />
        {/* 30~60초+ 대기에서 마음이 바뀌면 빠져나올 수 있게 — 낮은 강조 ghost 한 개. */}
        <Button label={t('common.backToInput')} onPress={onBack} variant="ghost" />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxxl }}
      >
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ fontSize: font.size.body, textAlign: 'center', color: palette.textSecondary }}
        >
          {state.error}
        </Text>
        <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
          <Button label={t('common.retry')} onPress={load} />
          <Button label={t('common.backToInput')} onPress={onBack} variant="ghost" />
        </View>
      </View>
    );
  }

  const fortune = state.data!;
  const premium = unlock.status === UNLOCK_STATES.UNLOCKED ? unlock.premium : null;
  const unlockBusy =
    unlock.status === UNLOCK_STATES.PURCHASING ||
    unlock.status === UNLOCK_STATES.ADVERTISING ||
    unlock.status === UNLOCK_STATES.RESTORING;

  const onShare = async () => {
    setShareError(null);
    try {
      haptics.fire('share');
      await Share.share({ message: buildShareMessage(fortune) });
    } catch {
      // 공유는 해제와 무관한 별도 관심사 — 자체 에러 상태로 공유 버튼 옆에 표시.
      setShareError(t('result.shareError'));
    }
  };

  const handleUnlockError = (e: unknown) => {
    haptics.fire('unlock-error');
    // 문구 비교 대신 HTTP status로 분기 — 501은 "준비 중"(PENDING).
    const status = (e as { status?: number } | null)?.status;
    if (status === 501) return dispatch({ type: 'SERVER_PENDING' });
    dispatch({ type: 'UNLOCK_ERROR', message: errorMessage(e, FALLBACK_UNLOCK_ERROR) });
  };

  const finishUnlock = (premiumData: NonNullable<typeof unlock.premium>) => {
    haptics.fire('unlock-success');
    dispatch({ type: 'UNLOCK_SUCCESS', premium: premiumData });
  };

  const unlockByPurchase = async () => {
    dispatch({ type: 'START_PURCHASE' });
    try {
      const { purchased, receipt } = await purchase(PRODUCTS.fullReading);
      if (!purchased || !receipt) return dispatch({ type: 'PROOF_CANCELLED' });
      finishUnlock(await unlockFortune(input, { type: 'iap', receipt }));
    } catch (e) {
      handleUnlockError(e);
    }
  };

  const unlockByAd = async () => {
    dispatch({ type: 'START_AD' });
    try {
      const { rewarded, token } = await showRewarded();
      if (!rewarded || !token) return dispatch({ type: 'PROOF_CANCELLED' });
      finishUnlock(await unlockFortune(input, { type: 'rewarded_ad', token }));
    } catch (e) {
      handleUnlockError(e);
    }
  };

  const restore = async () => {
    dispatch({ type: 'START_RESTORE' });
    try {
      const { restored, receipt } = await restorePurchase(PRODUCTS.fullReading);
      // 복원 결과가 없으면 "취소"가 아니라 "복원할 구매 없음" 안내(실 구매자 혼동 방지).
      if (!restored || !receipt) return dispatch({ type: 'RESTORE_EMPTY' });
      finishUnlock(await unlockFortune(input, { type: 'iap', receipt }));
    } catch (e) {
      handleUnlockError(e);
    }
  };

  const lucky = lookup('result.lucky') as Record<string, string>;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xxl, gap: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <Text style={{ fontSize: font.size.sm, color: palette.textMuted }}>
          {labelForType(fortune.meta.type)} · {formatDate(fortune.meta.date)}
        </Text>
        {fortune.acknowledgement?.trim() ? (
          <Card variant="accent">
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontSize: font.size.lg, lineHeight: lineHeight.body, color: palette.textSecondary, fontStyle: 'italic' }}
            >
              {fortune.acknowledgement}
            </Text>
          </Card>
        ) : null}
        <Text style={{ fontSize: font.size.title, fontWeight: font.weight.heavy, lineHeight: lineHeight.headline, color: palette.textPrimary }}>
          {fortune.headline}
        </Text>
      </View>

      {fortune.sections.map((s, i) => (
        <Section key={i} title={s.title} body={s.body} />
      ))}

      <Button variant="share" label={t('result.share')} onPress={onShare} />
      {shareError ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: palette.danger, fontSize: font.size.sm, textAlign: 'center' }}
        >
          {shareError}
        </Text>
      ) : null}

      {fortune.locked && !premium && (
        <Card gap={spacing.md}>
          <Text style={{ fontWeight: font.weight.bold, fontSize: font.size.body, color: palette.textPrimary }}>
            {t('result.locked.title')}
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: font.size.md, fontStyle: 'italic' }}>
            {t('result.locked.teaser')}
          </Text>
          <Text style={{ color: palette.textTertiary, fontSize: font.size.sm }}>
            {t('result.locked.sub')}
          </Text>
          <Button
            label={t('result.locked.unlock')}
            onPress={unlockByPurchase}
            loading={unlock.status === UNLOCK_STATES.PURCHASING}
            disabled={unlockBusy}
            accessibilityHint={t('result.locked.sub')}
          />
          <Button
            label={t('result.locked.unlockByAd')}
            onPress={unlockByAd}
            variant="ghost"
            loading={unlock.status === UNLOCK_STATES.ADVERTISING}
            disabled={unlockBusy}
          />
          {/* 복구 동작이라 1차 CTA(해제/광고)와 시선 무게를 분리 — 저강조 텍스트 링크. */}
          <Button
            label={t('result.locked.restore')}
            onPress={restore}
            variant="link"
            loading={unlock.status === UNLOCK_STATES.RESTORING}
            disabled={unlockBusy}
          />
          {unlock.message ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole={unlock.status === UNLOCK_STATES.ERROR ? 'alert' : undefined}
              style={{
                color: unlock.status === UNLOCK_STATES.ERROR ? palette.danger : palette.textTertiary,
                fontSize: font.size.sm,
              }}
            >
              {unlock.message}
            </Text>
          ) : null}
          {canRetry(unlock) ? (
            <Button label={t('common.retry')} onPress={() => dispatch({ type: 'RETRY' })} variant="ghost" />
          ) : null}
        </Card>
      )}

      {premium && (
        <>
          {premium.sections.map((s, i) => (
            <Section key={i} title={s.title} body={s.body} />
          ))}
          {premium.advice ? <Section title={t('result.adviceTitle')} body={premium.advice} /> : null}
          {premium.luckyItems ? <LuckyItems items={premium.luckyItems} labels={lucky} /> : null}
        </>
      )}

      <Button label={t('common.backToInput')} onPress={onBack} variant="ghost" />
    </ScrollView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  const { palette, spacing, font, lineHeight } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontWeight: font.weight.bold, fontSize: font.size.body, color: palette.textPrimary }}>
        {title}
      </Text>
      <Text style={{ lineHeight: lineHeight.body, color: palette.textPrimary }}>{body}</Text>
    </View>
  );
}

function LuckyItems({ items, labels }: { items: LuckyItemsData; labels: Record<string, string> }) {
  const { palette, spacing, radius, font } = useTheme();
  const chips = [
    items.color && { k: labels.color, v: items.color },
    items.number != null && { k: labels.number, v: String(items.number) },
    items.direction && { k: labels.direction, v: items.direction },
  ].filter(Boolean) as { k: string; v: string }[];
  if (chips.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {chips.map((c) => (
        <View
          key={c.k}
          style={{ backgroundColor: palette.surfaceWeak, borderRadius: radius.sm, padding: spacing.lg, minWidth: 96 }}
        >
          <Text style={{ fontSize: font.size.xs, color: palette.textMuted }}>{c.k}</Text>
          <Text style={{ fontSize: font.size.body, fontWeight: font.weight.bold, color: palette.textPrimary }}>
            {c.v}
          </Text>
        </View>
      ))}
    </View>
  );
}

// LLM 호출 30-60s 동안 정지로 보이지 않게 회전. 메시지는 i18n 테이블에서.
const LOAD_MESSAGES = (lookup('result.loadMessages') as string[]) ?? [];

function RotatingLoadMessage({ color }: { color: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    // 5초 간격 — 너무 빠르면 산만, 너무 느리면 정지로 보임.
    // 빈 테이블이어도 % 0(NaN) 방지 — i18n에 result.loadMessages가 없어도 안전.
    const id = setInterval(() => setIdx((i) => (i + 1) % (LOAD_MESSAGES.length || 1)), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text accessibilityLiveRegion="polite" style={{ color, textAlign: 'center' }}>
      {LOAD_MESSAGES[idx] ?? ''}
    </Text>
  );
}
