// 앱 진입점. 화면 전환은 MVP라 단순 상태 토글로 처리(전환 애니메이션은 ScreenTransition).
// 화면 수가 늘면 @react-navigation 등으로 교체.
//
// 입력값(input)과 뷰 상태(view)를 분리해 보관 — "다시 입력하기"로 돌아가도
// 사용자가 방금 넣은 값을 유지해 부분 수정만 하고 다시 제출 가능.
// 마지막 입력은 AsyncStorage에 영속화(생년월일/성별/유형 5필드만 — PRIVACY.md "받지 않는 것" 준수).
//
// 최상위는 ErrorBoundary로 감싸 예기치 못한 렌더 오류가 앱 전체를 죽이지 않게 한다.
// 주의: RN primitives + 컴포넌트 래퍼로 작성. 비게임 미니앱 검수 통과를 위해
// 래퍼 내부를 최종적으로 TDS(Toss Design System) 컴포넌트로 교체해야 함.

import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScreenTransition } from './components/ScreenTransition';
import { createInputStore } from './persistence/inputStore.mjs';

export type BirthInput = {
  year: number;
  month: number;
  day: number;
  gender: 'male' | 'female' | 'unspecified';
  type: 'daily' | 'saju' | 'love' | 'wealth';
};

// AsyncStorage를 주입 — 로직(직렬화/검증)은 순수 inputStore.mjs에, 저장 백엔드만 RN 의존.
const store = createInputStore({ storage: AsyncStorage });

export default function App() {
  const [input, setInput] = useState<BirthInput | null>(null);
  const [view, setView] = useState<'home' | 'result'>('home');

  useEffect(() => {
    // 마지막 입력 하이드레이트 — 손상/구버전 값은 store가 null로 떨궈 무시.
    store.load().then((saved) => {
      if (saved) setInput(saved as BirthInput);
    });
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenTransition viewKey={view}>
          {view === 'result' && input ? (
            <ResultScreen input={input} onBack={() => setView('home')} />
          ) : (
            <HomeScreen
              initial={input}
              onSubmit={(next) => {
                setInput(next);
                store.save(next).catch(() => {});
                setView('result');
              }}
            />
          )}
        </ScreenTransition>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
