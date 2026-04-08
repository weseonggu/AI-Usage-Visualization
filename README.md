# AI Usage Visualization

Claude Code의 대화 데이터(JSONL)를 파싱하여 에이전트 플로우, 도구 사용, 토큰 통계를 시각적으로 분석하는 대시보드.

## Screenshots

### Session Detail - Overview
세션의 전체 통계, 에이전트 플로우, 모델별 토큰 사용량을 한눈에 확인.

### Gantt Chart
메인 에이전트와 서브에이전트의 병렬 실행 구간을 시간축으로 시각화.

### Sequence Diagram
User → Main Agent → Sub-Agent → Tools 간의 호출 흐름을 시퀀스 다이어그램으로 표현.

### Token Analytics
토큰 분포(파이), 모델별 사용량(바), 도구 사용 빈도(바), 에이전트 비교 차트.

---

## Quick Start (Docker Hub)

소스코드 없이 Docker 이미지만으로 실행:

```bash
# 1. docker-compose.prod.yml 다운로드
curl -O https://raw.githubusercontent.com/weseonggu/AI-Usage-Visualization/main/docker-compose.prod.yml

# 2. 홈 디렉토리 설정
export HOST_HOME=~                          # Mac / Linux
# export HOST_HOME=C:/Users/YourUsername    # Windows

# 3. 실행
docker compose -f docker-compose.prod.yml up -d

# 4. 브라우저에서 접속
# http://localhost:8080
```

초기 화면에서 `.claude` 경로를 입력합니다:
- **Docker 환경**: `/data/host-home/.claude` (자동 감지됨)
- 경로는 브라우저 localStorage에 영구 저장되어 다음 접속 시 자동 로드됩니다.

## Quick Start (개발 모드)

```bash
git clone https://github.com/weseonggu/AI-Usage-Visualization.git
cd AI-Usage-Visualization

# .env 설정
cp .env.example .env
# HOST_HOME을 자기 홈 디렉토리로 수정

# Docker로 실행
docker compose up -d

# 또는 로컬 개발
npm install
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + TypeScript |
| Charts | Recharts, Custom SVG |
| Infra | Docker + docker-compose |
| CI/CD | GitHub Actions → Docker Hub |

## 프로젝트 구조

```
ai-usage-visualization/
├── apps/
│   ├── backend/                  # REST API
│   │   ├── src/
│   │   │   ├── parsers/          # JSONL 파싱
│   │   │   ├── services/         # 통계/타임라인/간트/시퀀스 서비스
│   │   │   ├── routes/           # API 엔드포인트
│   │   │   └── types/            # TypeScript 타입
│   │   └── Dockerfile
│   └── frontend/                 # React 대시보드
│       ├── src/
│       │   ├── components/       # SequenceDiagram, GanttChart, TimelineView, TokenChart, HelpGuide
│       │   ├── pages/            # Setup, ProjectList, SessionList, SessionDetail
│       │   └── services/         # API 클라이언트
│       └── Dockerfile
├── docker-compose.yml            # 개발용 (빌드)
├── docker-compose.prod.yml       # 배포용 (이미지 pull)
└── .github/workflows/            # GitHub Actions CI/CD
```

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/detect` | .claude 디렉토리 자동 탐지 |
| POST | `/api/validate-path` | 경로 유효성 검증 |
| GET | `/api/projects` | 프로젝트 목록 |
| GET | `/api/projects/:id/sessions` | 세션 목록 |
| GET | `/api/sessions/:pid/:sid` | 세션 메시지 원본 |
| GET | `/api/sessions/:pid/:sid/stats` | 토큰/메시지 통계 |
| GET | `/api/sessions/:pid/:sid/agents` | 에이전트 플로우 |
| GET | `/api/sessions/:pid/:sid/timeline` | 타임라인 이벤트 |
| GET | `/api/sessions/:pid/:sid/gantt` | 간트 차트 데이터 |
| GET | `/api/sessions/:pid/:sid/sequence` | 시퀀스 다이어그램 데이터 |

모든 엔드포인트(detect, validate-path 제외)는 `?claudeDir=...` 쿼리 파라미터가 필요합니다.

## 시각화 탭 설명

각 탭의 `?` 아이콘을 클릭하면 상세 분석 가이드를 볼 수 있습니다.

### Overview
세션 요약 통계 (Duration, Messages, Tool Calls, Tokens, Cache Tokens)와 에이전트 플로우.

### Sequence Diagram
시간 순서대로 User ↔ Main Agent ↔ Sub-Agent ↔ Tools 간의 호출 흐름. 서브에이전트 생성(보라), 도구 호출(노랑), 응답(점선)으로 구분.

### Gantt Chart
시간축 위에 각 에이전트(Main, Explore, Plan 등)의 실행 구간을 바로 표시. 병렬 실행을 직관적으로 확인.

### Timeline
모든 이벤트를 시간순으로 나열. 사용자 메시지, AI 응답, 도구 호출, 서브에이전트 생성/결과를 색상과 아이콘으로 구분.

### Tokens
Recharts 기반 4종 차트: 토큰 분류 파이차트, 모델별 바차트, 도구 사용 빈도, 에이전트 비교.

## 데이터 소스

Claude Code는 `~/.claude/` 디렉토리에 JSONL 형식으로 대화를 저장합니다:

```
~/.claude/
├── projects/<project-name>/
│   ├── <session-id>.jsonl              # 메인 에이전트 대화
│   └── <session-id>/subagents/
│       ├── agent-<id>.jsonl            # 서브에이전트 대화
│       └── agent-<id>.meta.json        # 서브에이전트 메타 (type, description)
```

Docker 볼륨 마운트로 이 디렉토리를 컨테이너에 읽기 전용 연결하여 실시간 반영됩니다.

## Roadmap

- [ ] VS Code Extension
- [ ] IntelliJ Plugin
- [ ] 실시간 세션 모니터링 (WebSocket)
- [ ] 비용 추산 (모델별 토큰 단가 적용)
- [ ] 검색 & 필터링
- [ ] 세션 간 비교 분석

## License

MIT
