import { useState } from 'react';

interface Props {
  tab: string;
}

const GUIDES: Record<string, { title: string; content: string }> = {
  overview: {
    title: 'Overview - 세션 요약',
    content: `## 읽는 법

**Duration**: 세션 시작부터 마지막 메시지까지의 총 시간.

**Messages**: 전체 메시지 수. user(사용자 입력) + assistant(AI 응답)으로 구성.

**Tool Calls**: AI가 도구(Bash, Read, Write, Edit 등)를 호출한 횟수.

**Tokens (API)**: 실제 API에서 처리한 토큰.
- Input: 사용자가 보낸 새 토큰
- Output: AI가 생성한 토큰

**Cache Tokens**: 캐시 메커니즘으로 재사용된 토큰.
- Cache Create: 최초 캐시 저장 (125% 과금)
- Cache Read: 캐시 재사용 (10% 과금, 90% 할인)
- 매 턴마다 시스템 프롬프트 + 전체 대화를 다시 보내지만, 캐시 덕분에 비용 절감

## Agent Flow

**Main Agent**: 사용자와 직접 대화하는 메인 AI.

**Sub-Agent**: 메인이 특정 작업을 위임한 별도의 AI.
- **Explore**: 코드베이스 탐색 (주로 Haiku 모델, 빠르고 저렴)
- **Plan**: 구현 계획 수립 (주로 Opus 모델, 정확)
- **general-purpose**: 범용 작업

서브에이전트는 독립된 AI로, 자체적으로 도구를 판단하고 호출합니다.`,
  },
  sequence: {
    title: 'Sequence Diagram - 호출 흐름',
    content: `## 읽는 법

시퀀스 다이어그램은 **시간 순서대로 누가 누구에게 요청/응답했는지** 보여줍니다.

### 액터 (세로 라인)
- **User** (초록): 사용자
- **Main Agent** (보라): 메인 AI
- **Explore/Plan** (청록/보라): 서브에이전트
- **Tools** (노랑): 도구 (Bash, Read, Write 등)

### 화살표
- **실선 →**: 요청 (호출)
- **점선 →**: 응답 (결과 리턴)
- **보라색**: 서브에이전트 생성
- **노란색**: 도구 호출

### 분석 포인트

1. **서브에이전트가 많은 도구를 호출하나?**
   → 노란 화살표가 연속으로 많으면 탐색 작업이 많은 것

2. **User → Main → User 사이 간격이 긴가?**
   → 복잡한 작업을 처리 중

3. **서브에이전트가 병렬로 생성되나?**
   → Main에서 여러 서브에이전트로 동시 화살표 = 병렬 실행`,
  },
  gantt: {
    title: 'Gantt Chart - 병렬 실행 시각화',
    content: `## 읽는 법

간트 차트는 **시간축 위에 각 에이전트가 언제 실행되었는지** 보여줍니다.

### 바(Bar)의 의미
- **Main Agent**: 전체 세션 구간 (가장 긴 바)
- **서브에이전트**: Main 안에서 실행된 구간 (짧은 바)
- 바의 길이 = 실행 시간

### 분석 포인트

1. **병렬 실행 확인**: 서브에이전트 바가 세로로 겹치면 동시 실행
   → 효율적으로 여러 작업을 병렬 처리한 것

2. **실행 시간 비교**: 어떤 서브에이전트가 오래 걸렸는지
   → Explore가 2분이면 파일이 많거나 복잡한 탐색

3. **모델별 차이**: haiku는 빠르고 저렴, opus는 느리지만 정확
   → Explore는 haiku, Plan은 opus가 일반적

4. **도구 호출 수**: tools 수가 많으면 많은 파일을 탐색한 것

### 예시 해석
\`\`\`
Main Agent  ████████████████████████████████  40m
Explore(1)    ████  2m 34s · 43 tools
Explore(2)      ████  2m 4s · 65 tools
\`\`\`
→ 메인이 40분 동안 작업하면서, 2개의 Explore를 거의 동시에 병렬 실행`,
  },
  timeline: {
    title: 'Timeline - 턴별 이벤트',
    content: `## 읽는 법

타임라인은 **모든 이벤트를 시간순으로** 보여줍니다.

### 아이콘/색상
- 🟢 **U (초록)**: 사용자 메시지
- 🟣 **A (보라)**: AI 응답 텍스트
- 🟡 **T (노랑)**: 도구 호출 (Bash, Read, Write 등)
- 🟣 **S (보라)**: 서브에이전트 생성
- 🔵 **R (청록)**: 서브에이전트 결과 리턴

### 들여쓰기
- 왼쪽 정렬: 메인 에이전트의 이벤트
- 들여쓰기됨: 서브에이전트의 이벤트

### 토큰 표시
각 이벤트에 \`in:xxx out:xxx cache-read:xxx\`로 토큰 사용량 표시.

### 분석 포인트

1. **도구 호출 패턴**: Read → Edit → Read 순이면 파일 수정 작업
2. **시간 간격**: 이벤트 간 간격이 크면 복잡한 처리 중
3. **서브에이전트 구간**: S(생성) ~ R(결과) 사이가 서브에이전트 실행 구간`,
  },
  tokens: {
    title: 'Tokens - 토큰 & 도구 분석',
    content: `## 차트 설명

### Token Breakdown (파이 차트)
전체 토큰을 4가지로 분류:
- **Input**: 캐시에 없는 새 토큰 (100% 과금)
- **Output**: AI가 생성한 토큰 (100% 과금)
- **Cache Create**: 캐시 최초 저장 (125% 과금)
- **Cache Read**: 캐시 재사용 (10% 과금)

→ Cache Read가 가장 크면 정상. 매 턴마다 전체 대화를 다시 보내지만 캐시로 절약.

### Token by Model (바 차트)
모델별 토큰 사용량:
- **opus**: 메인 에이전트 (비용 높음, 정확)
- **haiku**: 서브에이전트 (비용 낮음, 빠름)

### Tool Usage (바 차트)
가장 많이 사용된 도구 Top 12:
- **Read/Bash/Grep**: 탐색 위주 세션
- **Write/Edit**: 코드 작성 위주 세션
- **Agent**: 서브에이전트를 많이 사용

### Agent Comparison (바 차트)
메인 vs 서브에이전트의 메시지 수, 도구 호출 수 비교.

## 비용 추정 공식
\`\`\`
비용 ≈ (input × $15) + (output × $75) + (cache_create × $18.75) + (cache_read × $1.50)
        ÷ 1,000,000  (per million tokens, Opus 기준)
\`\`\``,
  },
};

export default function HelpGuide({ tab }: Props) {
  const [open, setOpen] = useState(false);
  const guide = GUIDES[tab];
  if (!guide) return null;

  return (
    <>
      <button className="help-btn" onClick={() => setOpen(true)} title="How to read this view">
        ?
      </button>

      {open && (
        <div className="help-overlay" onClick={() => setOpen(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h3>{guide.title}</h3>
              <button className="help-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="help-modal-body">
              {guide.content.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h3 key={i} style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>{line.slice(3)}</h3>;
                if (line.startsWith('### ')) return <h4 key={i} style={{ marginTop: '1rem', marginBottom: '0.25rem', color: 'var(--accent)' }}>{line.slice(4)}</h4>;
                if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '1rem', marginBottom: '0.15rem' }}>{line}</div>;
                if (line.startsWith('```')) return <div key={i} style={{ margin: '0.25rem 0' }} />;
                if (line.startsWith('→')) return <div key={i} style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{line}</div>;
                if (line.trim() === '') return <div key={i} style={{ height: '0.5rem' }} />;
                return <div key={i} style={{ marginBottom: '0.15rem' }}>{line}</div>;
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
