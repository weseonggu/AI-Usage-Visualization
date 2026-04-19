// JSONL message types from Claude Code sessions

export interface ClaudeMessage {
  type: 'user' | 'assistant' | 'queue-operation' | 'progress' | 'attachment';
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
  // progress/hook specific
  data?: {
    type: string;
    hookEvent?: string;
    hookName?: string;
    command?: string;
  };
  // attachment/hook specific (new Claude Code format)
  attachment?: {
    type: 'hook_success' | 'hook_additional_context' | string;
    hookEvent?: string;
    hookName?: string;
    command?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    durationMs?: number;
    content?: string | string[];
    toolUseID?: string;
  };
  parentToolUseID?: string;
  toolUseID?: string;
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

// Timeline event for visualization
export interface TimelineEvent {
  id: string;
  parentId: string | null;
  timestamp: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'agent_spawn' | 'agent_result' | 'hook';
  actor: 'user' | 'main' | string; // 'main' or agentId
  actorLabel: string;
  content: string; // summary text
  toolName?: string;
  hookEvent?: string;
  model?: string;
  tokens?: { input: number; output: number; cacheRead: number; cacheCreation: number };
  duration?: number; // ms from previous event
}

// Gantt-style data for parallel execution view
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

// Sequence diagram message
export interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  timestamp: string;
  type: 'request' | 'response' | 'tool_call' | 'tool_result' | 'agent_spawn' | 'agent_result';
}

export interface SessionStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  hookCount: number;
  hooksByEvent: Record<string, number>;
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
