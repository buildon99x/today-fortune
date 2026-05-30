// 최상위 에러 경계 — 예기치 못한 렌더 오류가 앱 전체를 크래시시키지 않게 한다.
//
// 프라이버시(AGENTS.md §1.4): ESLint PII-log 가드는 .mjs/.js만 잡으므로 .tsx에선 수동 규율.
// error 객체의 props/메시지에 사용자 데이터가 섞일 수 있어 로그는 error.name만 남긴다.

import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // 비식별 메타만 — 절대 error.message/props/스택의 본문을 로그하지 않는다.
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.warn('[ErrorBoundary]', name);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#4e5968' }}>
          잠시 흐름이 흐트러졌어요. 앱을 다시 열어 주실래요?
        </Text>
        <Pressable
          onPress={() => this.setState({ hasError: false })}
          accessibilityRole="button"
          style={{ borderWidth: 1, borderColor: '#dfe3e8', padding: 14, borderRadius: 12 }}
        >
          <Text>다시 시도</Text>
        </Pressable>
      </View>
    );
  }
}
