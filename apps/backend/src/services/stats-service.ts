import type { ClaudeMessage, SessionStats, AgentFlow, ToolUseContent } from '../types/claude.js';
import { getSessionMessages, listSubAgents, getSubAgentMessages } from '../parsers/jsonl-parser.js';

export async function getSessionStats(projectId: string, sessionId: string): Promise<SessionStats> {
  const messages = await getSessionMessages(projectId, sessionId);

  let userMessages = 0;
  let assistantMessages = 0;
  let toolCalls = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  const byModel: Record<string, { input: number; output: number }> = {};
  let startTime = '';
  let endTime = '';

  for (const msg of messages) {
    if (msg.type === 'queue-operation') continue;

    if (!startTime && msg.timestamp) startTime = msg.timestamp;
    if (msg.timestamp) endTime = msg.timestamp;

    if (msg.type === 'user') userMessages++;
    if (msg.type === 'assistant') {
      assistantMessages++;

      if (msg.message?.usage) {
        const usage = msg.message.usage;
        totalInput += usage.input_tokens || 0;
        totalOutput += usage.output_tokens || 0;
        totalCacheCreation += usage.cache_creation_input_tokens || 0;
        totalCacheRead += usage.cache_read_input_tokens || 0;

        if (msg.message.model) {
          if (!byModel[msg.message.model]) {
            byModel[msg.message.model] = { input: 0, output: 0 };
          }
          byModel[msg.message.model].input += usage.input_tokens || 0;
          byModel[msg.message.model].output += usage.output_tokens || 0;
        }
      }

      if (Array.isArray(msg.message?.content)) {
        toolCalls += msg.message.content.filter(
          (c): c is ToolUseContent => c.type === 'tool_use'
        ).length;
      }
    }
  }

  const start = startTime ? new Date(startTime).getTime() : 0;
  const end = endTime ? new Date(endTime).getTime() : 0;

  return {
    totalMessages: messages.filter(m => m.type !== 'queue-operation').length,
    userMessages,
    assistantMessages,
    toolCalls,
    tokenUsage: {
      totalInput,
      totalOutput,
      totalCacheCreation,
      totalCacheRead,
      byModel,
    },
    duration: {
      startTime,
      endTime,
      durationMs: end - start,
    },
  };
}

export async function getAgentFlow(projectId: string, sessionId: string): Promise<AgentFlow> {
  const messages = await getSessionMessages(projectId, sessionId);
  const subAgentList = await listSubAgents(projectId, sessionId);

  // Main agent tool calls
  const mainToolCalls: string[] = [];
  for (const msg of messages) {
    if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
      for (const content of msg.message.content) {
        if (content.type === 'tool_use') {
          mainToolCalls.push(content.name);
        }
      }
    }
  }

  // Sub-agent details
  const subAgents = await Promise.all(
    subAgentList.map(async ({ agentId, meta }) => {
      const agentMessages = await getSubAgentMessages(projectId, sessionId, agentId);
      const toolCalls: string[] = [];
      let model: string | undefined;
      let startTime = '';
      let endTime = '';

      for (const msg of agentMessages) {
        if (!startTime && msg.timestamp) startTime = msg.timestamp;
        if (msg.timestamp) endTime = msg.timestamp;

        if (msg.message?.model && !model) model = msg.message.model;

        if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
          for (const content of msg.message.content) {
            if (content.type === 'tool_use') {
              toolCalls.push(content.name);
            }
          }
        }
      }

      return {
        agentId,
        agentType: meta?.agentType || 'unknown',
        description: meta?.description || '',
        messageCount: agentMessages.length,
        model,
        toolCalls,
        startTime,
        endTime,
      };
    })
  );

  return {
    sessionId,
    mainAgent: {
      messageCount: messages.length,
      toolCalls: mainToolCalls,
    },
    subAgents,
  };
}
