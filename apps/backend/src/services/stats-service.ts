import type { ClaudeMessage, SessionStats, AgentFlow, ToolUseContent, TimelineEvent, GanttTask, SequenceMessage } from '../types/claude.js';
import { getSessionMessages, listSubAgents, getSubAgentMessages } from '../parsers/jsonl-parser.js';

export async function getSessionStats(claudeDir: string, projectId: string, sessionId: string): Promise<SessionStats> {
  const messages = await getSessionMessages(claudeDir, projectId, sessionId);

  let userMessages = 0;
  let assistantMessages = 0;
  let toolCalls = 0;
  let hookCount = 0;
  const hooksByEvent: Record<string, number> = {};
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

    if (msg.type === 'progress' && msg.data?.type === 'hook_progress') {
      hookCount++;
      const event = msg.data.hookEvent || 'unknown';
      hooksByEvent[event] = (hooksByEvent[event] || 0) + 1;
      continue;
    }

    if (
      msg.type === 'attachment' &&
      (msg.attachment?.type === 'hook_success' || msg.attachment?.type === 'hook_additional_context')
    ) {
      hookCount++;
      const event = msg.attachment.hookEvent || 'unknown';
      hooksByEvent[event] = (hooksByEvent[event] || 0) + 1;
      continue;
    }

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
    totalMessages: messages.filter(m => m.type !== 'queue-operation' && m.type !== 'progress').length,
    userMessages,
    assistantMessages,
    toolCalls,
    hookCount,
    hooksByEvent,
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

export async function getAgentFlow(claudeDir: string, projectId: string, sessionId: string): Promise<AgentFlow> {
  const messages = await getSessionMessages(claudeDir, projectId, sessionId);
  const subAgentList = await listSubAgents(claudeDir, projectId, sessionId);

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
      const agentMessages = await getSubAgentMessages(claudeDir, projectId, sessionId, agentId);
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

function extractTextSummary(msg: ClaudeMessage): string {
  if (!msg.message?.content) return '';
  if (typeof msg.message.content === 'string') return msg.message.content.slice(0, 150);
  for (const c of msg.message.content) {
    if (c.type === 'text') return c.text.slice(0, 150);
  }
  return '';
}

export async function getTimeline(claudeDir: string, projectId: string, sessionId: string): Promise<TimelineEvent[]> {
  const messages = await getSessionMessages(claudeDir, projectId, sessionId);
  const subAgentList = await listSubAgents(claudeDir, projectId, sessionId);
  const agentMeta = new Map(subAgentList.map(a => [a.agentId, a.meta]));

  // Load all sub-agent messages
  const subAgentMessages = new Map<string, ClaudeMessage[]>();
  for (const { agentId } of subAgentList) {
    subAgentMessages.set(agentId, await getSubAgentMessages(claudeDir, projectId, sessionId, agentId));
  }

  const events: TimelineEvent[] = [];
  let prevTimestamp = '';

  // Process main agent messages
  for (const msg of messages) {
    if (msg.type === 'queue-operation') continue;
    const duration = prevTimestamp && msg.timestamp
      ? new Date(msg.timestamp).getTime() - new Date(prevTimestamp).getTime()
      : 0;

    if (msg.type === 'progress' && msg.data?.type === 'hook_progress') {
      events.push({
        id: msg.uuid,
        parentId: msg.parentUuid,
        timestamp: msg.timestamp,
        type: 'hook',
        actor: 'main',
        actorLabel: 'Hook',
        content: msg.data.hookName || msg.data.hookEvent || 'hook',
        hookEvent: msg.data.hookEvent,
        duration,
      });
      if (msg.timestamp) prevTimestamp = msg.timestamp;
      continue;
    }

    if (
      msg.type === 'attachment' &&
      (msg.attachment?.type === 'hook_success' || msg.attachment?.type === 'hook_additional_context')
    ) {
      events.push({
        id: msg.uuid,
        parentId: msg.parentUuid,
        timestamp: msg.timestamp,
        type: 'hook',
        actor: 'main',
        actorLabel: 'Hook',
        content: msg.attachment.hookName || msg.attachment.hookEvent || msg.attachment.type,
        hookEvent: msg.attachment.hookEvent,
        duration,
      });
      if (msg.timestamp) prevTimestamp = msg.timestamp;
      continue;
    }

    if (msg.type === 'user') {
      events.push({
        id: msg.uuid,
        parentId: msg.parentUuid,
        timestamp: msg.timestamp,
        type: 'user',
        actor: 'user',
        actorLabel: 'User',
        content: extractTextSummary(msg),
        duration,
      });
    } else if (msg.type === 'assistant') {
      const tokens = msg.message?.usage ? {
        input: msg.message.usage.input_tokens || 0,
        output: msg.message.usage.output_tokens || 0,
        cacheRead: msg.message.usage.cache_read_input_tokens || 0,
        cacheCreation: msg.message.usage.cache_creation_input_tokens || 0,
      } : undefined;

      // Check for tool uses
      if (Array.isArray(msg.message?.content)) {
        for (const c of msg.message.content) {
          if (c.type === 'tool_use') {
            if (c.name === 'Agent') {
              const agentDesc = (c.input as Record<string, string>).description || '';
              const agentType = (c.input as Record<string, string>).subagent_type || 'general';
              events.push({
                id: `${msg.uuid}-${c.id}`,
                parentId: msg.uuid,
                timestamp: msg.timestamp,
                type: 'agent_spawn',
                actor: 'main',
                actorLabel: 'Main Agent',
                content: `Spawn ${agentType}: ${agentDesc}`,
                toolName: 'Agent',
                model: msg.message?.model,
                tokens,
                duration,
              });
            } else {
              events.push({
                id: `${msg.uuid}-${c.id}`,
                parentId: msg.uuid,
                timestamp: msg.timestamp,
                type: 'tool_use',
                actor: 'main',
                actorLabel: 'Main Agent',
                content: `${c.name}`,
                toolName: c.name,
                model: msg.message?.model,
                tokens,
                duration,
              });
            }
          } else if (c.type === 'text' && c.text) {
            events.push({
              id: msg.uuid,
              parentId: msg.parentUuid,
              timestamp: msg.timestamp,
              type: 'assistant',
              actor: 'main',
              actorLabel: 'Main Agent',
              content: c.text.slice(0, 150),
              model: msg.message?.model,
              tokens,
              duration,
            });
          }
        }
      }
    }
    if (msg.timestamp) prevTimestamp = msg.timestamp;
  }

  // Process sub-agent messages
  for (const [agentId, agentMsgs] of subAgentMessages) {
    const meta = agentMeta.get(agentId);
    const label = meta ? `${meta.agentType}: ${meta.description}` : agentId;

    for (const msg of agentMsgs) {
      if (msg.type === 'queue-operation') continue;

      if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
        for (const c of msg.message.content) {
          if (c.type === 'tool_use') {
            events.push({
              id: `${agentId}-${msg.uuid}-${c.id}`,
              parentId: msg.uuid,
              timestamp: msg.timestamp,
              type: 'tool_use',
              actor: agentId,
              actorLabel: label,
              content: c.name,
              toolName: c.name,
              model: msg.message?.model,
            });
          }
        }
      }
    }
  }

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getGanttData(claudeDir: string, projectId: string, sessionId: string): Promise<GanttTask[]> {
  const messages = await getSessionMessages(claudeDir, projectId, sessionId);
  const subAgentList = await listSubAgents(claudeDir, projectId, sessionId);
  const tasks: GanttTask[] = [];

  // Main agent as a continuous bar
  const mainTimes = messages.filter(m => m.timestamp && m.type !== 'queue-operation').map(m => m.timestamp);
  if (mainTimes.length >= 2) {
    tasks.push({
      id: 'main',
      label: 'Main Agent',
      actor: 'main',
      type: 'agent',
      startTime: mainTimes[0],
      endTime: mainTimes[mainTimes.length - 1],
      toolCalls: messages.filter(m =>
        m.type === 'assistant' && Array.isArray(m.message?.content) &&
        m.message.content.some((c: any) => c.type === 'tool_use')
      ).length,
    });
  }

  // Sub-agents
  for (const { agentId, meta } of subAgentList) {
    const agentMsgs = await getSubAgentMessages(claudeDir, projectId, sessionId, agentId);
    const times = agentMsgs.filter(m => m.timestamp).map(m => m.timestamp);
    if (times.length >= 2) {
      const toolCount = agentMsgs.filter(m =>
        m.type === 'assistant' && Array.isArray(m.message?.content) &&
        m.message.content.some((c: any) => c.type === 'tool_use')
      ).length;

      tasks.push({
        id: agentId,
        label: meta ? `${meta.agentType}: ${meta.description}` : agentId,
        actor: agentId,
        type: 'agent',
        startTime: times[0],
        endTime: times[times.length - 1],
        model: agentMsgs.find(m => m.message?.model)?.message?.model,
        toolCalls: toolCount,
      });
    }
  }

  // Individual tool call bars for main agent
  let lastToolEnd = '';
  for (const msg of messages) {
    if (msg.type !== 'assistant' || !Array.isArray(msg.message?.content)) continue;
    for (const c of msg.message.content) {
      if (c.type === 'tool_use') {
        const start = msg.timestamp;
        // Find next message timestamp as approx end
        const idx = messages.indexOf(msg);
        const nextMsg = messages.slice(idx + 1).find(m => m.timestamp && m.timestamp !== start);
        const end = nextMsg?.timestamp || start;

        tasks.push({
          id: `tool-${msg.uuid}-${c.id}`,
          label: c.name,
          actor: 'main',
          type: 'tool',
          startTime: start,
          endTime: end,
        });
        lastToolEnd = end;
      }
    }
  }

  return tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getSequenceData(claudeDir: string, projectId: string, sessionId: string): Promise<SequenceMessage[]> {
  const messages = await getSessionMessages(claudeDir, projectId, sessionId);
  const subAgentList = await listSubAgents(claudeDir, projectId, sessionId);
  const agentMeta = new Map(subAgentList.map(a => [a.agentId, a.meta]));
  const seq: SequenceMessage[] = [];

  for (const msg of messages) {
    if (msg.type === 'queue-operation') continue;

    if (msg.type === 'user') {
      seq.push({
        from: 'User',
        to: 'Main Agent',
        label: extractTextSummary(msg).slice(0, 80) || 'message',
        timestamp: msg.timestamp,
        type: 'request',
      });
    } else if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
      let hasText = false;
      for (const c of msg.message.content) {
        if (c.type === 'tool_use') {
          if (c.name === 'Agent') {
            const desc = (c.input as Record<string, string>).description || 'sub-agent';
            const agentType = (c.input as Record<string, string>).subagent_type || 'general';
            seq.push({
              from: 'Main Agent',
              to: `${agentType}`,
              label: desc,
              timestamp: msg.timestamp,
              type: 'agent_spawn',
            });
          } else {
            seq.push({
              from: 'Main Agent',
              to: 'Tools',
              label: c.name,
              timestamp: msg.timestamp,
              type: 'tool_call',
            });
          }
        } else if (c.type === 'text' && c.text && !hasText) {
          hasText = true;
          seq.push({
            from: 'Main Agent',
            to: 'User',
            label: c.text.slice(0, 80),
            timestamp: msg.timestamp,
            type: 'response',
          });
        }
      }
    }
  }

  // Sub-agent tool calls
  for (const { agentId, meta } of subAgentList) {
    const agentMsgs = await getSubAgentMessages(claudeDir, projectId, sessionId, agentId);
    const label = meta?.agentType || agentId;

    for (const msg of agentMsgs) {
      if (msg.type !== 'assistant' || !Array.isArray(msg.message?.content)) continue;
      for (const c of msg.message.content) {
        if (c.type === 'tool_use') {
          seq.push({
            from: label,
            to: 'Tools',
            label: c.name,
            timestamp: msg.timestamp,
            type: 'tool_call',
          });
        }
      }
    }

    // Agent result back to main
    const lastMsg = agentMsgs.filter(m => m.timestamp).pop();
    if (lastMsg) {
      seq.push({
        from: label,
        to: 'Main Agent',
        label: 'result',
        timestamp: lastMsg.timestamp,
        type: 'agent_result',
      });
    }
  }

  return seq.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
