// 앱 진입점. 화면 전환은 MVP라 단순 상태 토글로 처리.
// 화면 수가 늘면 @react-navigation 등으로 교체.
//
// 입력값(input)과 뷰 상태(view)를 분리해 보관 — "다시 입력하기"로 돌아가도
// 사용자가 방금 넣은 값을 유지해 부분 수정만 하고 다시 제출 가능.
//
// 주의: React Native primitives(View/Text/...)로 작성. 비게임 미니앱 검수 통과를 위해
// 최종적으로 TDS(Toss Design System) 컴포넌트로 교체해야 함.

import { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';

export type BirthInput = {
  year: number;
  month: number;
  day: number;
  gender: 'male' | 'female' | 'unspecified';
  type: 'daily' | 'saju' | 'love' | 'wealth';
};

export default function App() {
  const [input, setInput] = useState<BirthInput | null>(null);
  const [view, setView] = useState<'home' | 'result'>('home');

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {view === 'result' && input ? (
        <ResultScreen input={input} onBack={() => setView('home')} />
      ) : (
        <HomeScreen
          initial={input}
          onSubmit={(next) => {
            setInput(next);
            setView('result');
          }}
        />
      )}
    </SafeAreaView>
  );
}
