// JSONL message types from Claude Code sessions

export interface ClaudeMessage {
  type: 'user' | 'assistant' | 'queue-operation';
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  isSidechain?: boolean;
  agentId?: string;
  promptId?: string;
  message?: {
    role: 'user' | 'assistant';
    model?: string;
    content: MessageContent[] | string;
    usage?: TokenUsage;
  };
  // queue-operation specific
  operation?: 'enqueue' | 'dequeue';
  // context fields
  cwd?: string;
  gitBranch?: string;
  version?: string;
  permissionMode?: string;
  userType?: string;
  entrypoint?: string;
  requestId?: string;
  slug?: string;
}

export type MessageContent = TextContent | ToolUseContent | ToolResultContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
  caller?: { type: string };
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | MessageContent[];
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  service_tier?: string;
}

export interface SubAgentMeta {
  agentType: string;
  description: string;
}

// API response types

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

export interface AgentFlow {
  sessionId: string;
  mainAgent: {
    messageCount: number;
    toolCalls: string[];
  };
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
