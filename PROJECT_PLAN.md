# AI Usage Visualization

## 프로젝트 개요
Claude Code의 대화 데이터(JSONL)를 파싱하여 메인 에이전트 ↔ 서브에이전트 간의 호출 흐름, 도구 사용, 비동기 실행 과정을 시각적으로 보여주는 대시보드.

## 데이터 소스
- **위치**: `~/.claude/` (글로벌)
- **구조**:
  ```
  ~/.claude/
  ├── history.jsonl                          # 전체 히스토리
  ├── projects/<project-name>/
  │   ├── <session-id>.jsonl                 # 메인 에이전트 대화
  │   └── <session-id>/subagents/
  │       ├── agent-<id>.jsonl               # 서브에이전트 대화
  │       └── agent-<id>.meta.json           # 서브에이전트 메타 (type, description)
  └── sessions/<pid>.json                    # 세션 메타
  ```
- **JSONL 메시지 필드**:
  - `type`: user | assistant | queue-operation
  - `uuid` / `parentUuid`: 메시지 트리 구성
  - `isSidechain`: 서브에이전트 여부
  - `agentId`: 서브에이전트 식별자
  - `message.content[]`: text, tool_use, tool_result
  - `message.model`: 사용된 모델 (opus, sonnet, haiku)
  - `message.usage`: 토큰 사용량 (input, output, cache)
  - `timestamp`: ISO 8601
  - `sessionId`, `cwd`, `gitBranch`

## 기술 스택

### Backend - Node.js + Express + TypeScript
- **JSONL 파서**: 스트리밍 파싱으로 대용량 파일 처리
- **REST API**: 세션 목록, 대화 조회, 통계
- **WebSocket**: 실시간 세션 모니터링 (선택)
- **파일 감시**: chokidar로 새 세션 자동 감지

### Frontend - React + TypeScript + Vite
- **시각화 라이브러리**:
  - React Flow: 에이전트 → 서브에이전트 호출 흐름도
  - Recharts: 토큰 사용량, 모델별 통계 차트
  - Timeline: 시간순 대화 흐름
- **UI 프레임워크**: Tailwind CSS + shadcn/ui

### 인프라
- Docker + docker-compose (로컬 개발 & 배포)
- GitHub Actions → Docker Hub 자동 빌드/푸시

## 핵심 기능 (MVP)

### Phase 1 - 데이터 파싱 & API
1. JSONL 파일 스캔 및 프로젝트/세션 목록 제공
2. 세션 대화 내용 파싱 (메시지 트리 구성)
3. 서브에이전트 호출 관계 추출
4. 도구 사용 내역 추출

### Phase 2 - 시각화 대시보드
1. **프로젝트 목록** → 세션 목록 → 대화 상세
2. **에이전트 플로우**: 메인 에이전트 ↔ 서브에이전트 호출 다이어그램
3. **타임라인 뷰**: 시간순 메시지 흐름 (누가 언제 무엇을)
4. **토큰 사용량 차트**: 모델별, 세션별 토큰 소비

### Phase 3 - 고급 기능
1. 실시간 세션 모니터링
2. 도구 사용 패턴 분석
3. 비용 추산 (모델별 토큰 단가 적용)
4. 검색 & 필터링

### Phase 4 - IDE 플러그인
1. VS Code Extension (TypeScript - 동일 코드베이스 활용)
2. IntelliJ Plugin (Kotlin - API 소비)

## 프로젝트 구조
```
ai-usage-visualization/
├── apps/
│   ├── backend/                 # Node.js + Express + TypeScript
│   │   ├── src/
│   │   │   ├── routes/          # API 라우트
│   │   │   ├── services/        # 비즈니스 로직
│   │   │   ├── parsers/         # JSONL 파싱
│   │   │   ├── types/           # TypeScript 타입 정의
│   │   │   └── index.ts         # 엔트리포인트
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/                # React + Vite + TypeScript
│       ├── src/
│       │   ├── components/      # UI 컴포넌트
│       │   ├── pages/           # 페이지
│       │   ├── hooks/           # 커스텀 훅
│       │   ├── services/        # API 클라이언트
│       │   └── types/           # 공유 타입
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml
├── .github/workflows/
│   └── docker-publish.yml       # GitHub Actions CI/CD
├── package.json                 # 워크스페이스 루트
└── PROJECT_PLAN.md
```

## API 설계 (초안)

```
GET  /api/projects                    # 프로젝트 목록
GET  /api/projects/:id/sessions       # 프로젝트의 세션 목록
GET  /api/sessions/:id                # 세션 상세 (대화 트리)
GET  /api/sessions/:id/agents         # 서브에이전트 목록 & 관계
GET  /api/sessions/:id/timeline       # 타임라인 데이터
GET  /api/sessions/:id/stats          # 토큰 사용량 등 통계
GET  /api/stats/overview              # 전체 통계 요약
```

## Docker 배포
- `docker-compose up` 으로 프론트 + 백엔드 동시 실행
- 백엔드: `~/.claude` 디렉토리를 볼륨 마운트
- 프론트: nginx로 정적 파일 서빙 + API 프록시
- GitHub Actions: main 브랜치 push 시 Docker Hub에 이미지 자동 배포
