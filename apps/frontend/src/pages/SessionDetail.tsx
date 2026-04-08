import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type SessionStats, type AgentFlow } from '../services/api';

export default function SessionDetail() {
  const { projectId, sessionId } = useParams<{ projectId: string; sessionId: string }>();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [flow, setFlow] = useState<AgentFlow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !sessionId) return;
    Promise.all([
      api.getSessionStats(projectId, sessionId),
      api.getAgentFlow(projectId, sessionId),
    ])
      .then(([s, f]) => { setStats(s); setFlow(f); })
      .finally(() => setLoading(false));
  }, [projectId, sessionId]);

  if (loading) return <div className="loading">Loading session...</div>;
  if (!stats || !flow) return <div className="loading">Session not found</div>;

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTokens = (n: number) => n.toLocaleString();

  // Count tool usage
  const allToolCalls = [...flow.mainAgent.toolCalls, ...flow.subAgents.flatMap(a => a.toolCalls)];
  const toolCounts: Record<string, number> = {};
  for (const t of allToolCalls) {
    toolCounts[t] = (toolCounts[t] || 0) + 1;
  }
  const sortedTools = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h2 className="page-title">Session Detail</h2>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="meta">Duration</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatDuration(stats.duration.durationMs)}</div>
        </div>
        <div className="card">
          <div className="meta">Messages</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalMessages}</div>
          <div className="meta">{stats.userMessages} user / {stats.assistantMessages} assistant</div>
        </div>
        <div className="card">
          <div className="meta">Tool Calls</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.toolCalls}</div>
        </div>
        <div className="card">
          <div className="meta">Tokens</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {formatTokens(stats.tokenUsage.totalInput + stats.tokenUsage.totalOutput)}
          </div>
          <div className="meta">
            In: {formatTokens(stats.tokenUsage.totalInput)} / Out: {formatTokens(stats.tokenUsage.totalOutput)}
          </div>
        </div>
      </div>

      {/* Agent Flow */}
      <h3 style={{ marginBottom: '1rem' }}>Agent Flow</h3>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Main Agent</strong>
          <span className="badge" style={{ marginLeft: '0.5rem' }}>{flow.mainAgent.messageCount} messages</span>
          <span className="badge">{flow.mainAgent.toolCalls.length} tool calls</span>
        </div>
        {flow.subAgents.length > 0 && (
          <div style={{ paddingLeft: '1.5rem', borderLeft: `2px solid var(--accent)` }}>
            {flow.subAgents.map((agent) => (
              <div key={agent.agentId} style={{ marginBottom: '0.75rem' }}>
                <div>
                  <span className="badge badge--accent">{agent.agentType}</span>
                  <strong>{agent.description}</strong>
                </div>
                <div className="meta">
                  {agent.model && <span className="badge">{agent.model}</span>}
                  <span>{agent.messageCount} messages</span>
                  {' · '}
                  <span>{agent.toolCalls.length} tool calls</span>
                  {agent.startTime && (
                    <>
                      {' · '}
                      <span>{new Date(agent.startTime).toLocaleTimeString()}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {flow.subAgents.length === 0 && (
          <div className="meta">No sub-agents in this session</div>
        )}
      </div>

      {/* Token by Model */}
      <h3 style={{ marginBottom: '1rem' }}>Token Usage by Model</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {Object.entries(stats.tokenUsage.byModel).map(([model, usage]) => (
          <div key={model} className="card">
            <div className="badge">{model}</div>
            <div className="meta" style={{ marginTop: '0.5rem' }}>
              Input: {formatTokens(usage.input)} / Output: {formatTokens(usage.output)}
            </div>
          </div>
        ))}
      </div>

      {/* Tool Usage */}
      <h3 style={{ marginBottom: '1rem' }}>Tool Usage</h3>
      <div className="card">
        {sortedTools.map(([tool, count]) => (
          <div key={tool} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
            <span>{tool}</span>
            <span className="badge">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
