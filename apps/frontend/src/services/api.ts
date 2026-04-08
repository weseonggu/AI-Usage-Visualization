const API_BASE = '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
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

export const api = {
  getProjects: () => fetchJson<ProjectInfo[]>('/projects'),
  getSessions: (projectId: string) => fetchJson<SessionInfo[]>(`/projects/${projectId}/sessions`),
  getSessionMessages: (projectId: string, sessionId: string) =>
    fetchJson<unknown[]>(`/sessions/${projectId}/${sessionId}`),
  getSessionStats: (projectId: string, sessionId: string) =>
    fetchJson<SessionStats>(`/sessions/${projectId}/${sessionId}/stats`),
  getAgentFlow: (projectId: string, sessionId: string) =>
    fetchJson<AgentFlow>(`/sessions/${projectId}/${sessionId}/agents`),
};
