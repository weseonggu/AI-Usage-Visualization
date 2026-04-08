const API_BASE = '/api';

const STORAGE_KEY = 'ai-viz-claude-dir';

export function getStoredClaudeDir(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredClaudeDir(path: string): void {
  localStorage.setItem(STORAGE_KEY, path);
}

export function clearStoredClaudeDir(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function fetchJson<T>(url: string, claudeDir?: string): Promise<T> {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = claudeDir
    ? `${API_BASE}${url}${separator}claudeDir=${encodeURIComponent(claudeDir)}`
    : `${API_BASE}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  sessionCount: number;
}

export interface SessionInfo {
  id: string;
  projectId: string;
  startTime: string;
  messageCount: number;
  subAgentCount: number;
  models: string[];
  gitBranch?: string;
  cwd?: string;
}

export interface SessionStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  tokenUsage: {
    totalInput: number;
    totalOutput: number;
    totalCacheCreation: number;
    totalCacheRead: number;
    byModel: Record<string, { input: number; output: number }>;
  };
  duration: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

export interface AgentFlow {
  sessionId: string;
  mainAgent: { messageCount: number; toolCalls: string[] };
  subAgents: Array<{
    agentId: string;
    agentType: string;
    description: string;
    messageCount: number;
    model?: string;
    toolCalls: string[];
    startTime: string;
    endTime?: string;
  }>;
}

export interface TimelineEvent {
  id: string;
  parentId: string | null;
  timestamp: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'agent_spawn' | 'agent_result';
  actor: string;
  actorLabel: string;
  content: string;
  toolName?: string;
  model?: string;
  tokens?: { input: number; output: number; cacheRead: number; cacheCreation: number };
  duration?: number;
}

export interface GanttTask {
  id: string;
  label: string;
  actor: string;
  type: 'agent' | 'tool' | 'user';
  startTime: string;
  endTime: string;
  model?: string;
  toolCalls?: number;
}

export interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  timestamp: string;
  type: 'request' | 'response' | 'tool_call' | 'tool_result' | 'agent_spawn' | 'agent_result';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export const api = {
  detectClaudeDirs: async (): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE}/detect`);
      const data = await res.json();
      return data.detected || [];
    } catch {
      return [];
    }
  },
  validatePath: async (path: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/validate-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      return data.valid;
    } catch {
      return false;
    }
  },
  getProjects: (claudeDir: string, page = 1, limit = 10) =>
    fetchJson<PaginatedResponse<ProjectInfo>>(`/projects?page=${page}&limit=${limit}`, claudeDir),
  getSessions: (claudeDir: string, projectId: string, page = 1, limit = 10) =>
    fetchJson<PaginatedResponse<SessionInfo>>(`/projects/${projectId}/sessions?page=${page}&limit=${limit}`, claudeDir),
  getSessionMessages: (claudeDir: string, projectId: string, sessionId: string) =>
    fetchJson<unknown[]>(`/sessions/${projectId}/${sessionId}`, claudeDir),
  getSessionStats: (claudeDir: string, projectId: string, sessionId: string) =>
    fetchJson<SessionStats>(`/sessions/${projectId}/${sessionId}/stats`, claudeDir),
  getAgentFlow: (claudeDir: string, projectId: string, sessionId: string) =>
    fetchJson<AgentFlow>(`/sessions/${projectId}/${sessionId}/agents`, claudeDir),
  getTimeline: (claudeDir: string, projectId: string, sessionId: string) =>
    fetchJson<TimelineEvent[]>(`/sessions/${projectId}/${sessionId}/timeline`, claudeDir),
  getGantt: (claudeDir: string, projectId: string, sessionId: string) =>
    fetchJson<GanttTask[]>(`/sessions/${projectId}/${sessionId}/gantt`, claudeDir),
  getSequence: (claudeDir: string, projectId: string, sessionId: string) =>
    fetchJson<SequenceMessage[]>(`/sessions/${projectId}/${sessionId}/sequence`, claudeDir),
};
