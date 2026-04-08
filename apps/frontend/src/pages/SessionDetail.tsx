import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type SessionStats, type AgentFlow, type TimelineEvent, type GanttTask, type SequenceMessage } from '../services/api';
import SequenceDiagram from '../components/SequenceDiagram';
import GanttChart from '../components/GanttChart';
import TimelineView from '../components/TimelineView';
import TokenChart from '../components/TokenChart';
import HelpGuide from '../components/HelpGuide';

interface Props {
  claudeDir: string;
}

type TabId = 'overview' | 'sequence' | 'gantt' | 'timeline' | 'tokens';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'gantt', label: 'Gantt' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'tokens', label: 'Tokens' },
];

export default function SessionDetail({ claudeDir }: Props) {
  const { projectId, sessionId } = useParams<{ projectId: string; sessionId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [flow, setFlow] = useState<AgentFlow | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[] | null>(null);
  const [gantt, setGantt] = useState<GanttTask[] | null>(null);
  const [sequence, setSequence] = useState<SequenceMessage[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !sessionId) return;
    // Load overview data immediately
    Promise.all([
      api.getSessionStats(claudeDir, projectId, sessionId),
      api.getAgentFlow(claudeDir, projectId, sessionId),
    ])
      .then(([s, f]) => { setStats(s); setFlow(f); })
      .finally(() => setLoading(false));
  }, [claudeDir, projectId, sessionId]);

  // Lazy load tab data
  useEffect(() => {
    if (!projectId || !sessionId) return;
    if (activeTab === 'timeline' && !timeline) {
      api.getTimeline(claudeDir, projectId, sessionId).then(setTimeline);
    } else if (activeTab === 'gantt' && !gantt) {
      api.getGantt(claudeDir, projectId, sessionId).then(setGantt);
    } else if (activeTab === 'sequence' && !sequence) {
      api.getSequence(claudeDir, projectId, sessionId).then(setSequence);
    }
  }, [activeTab, claudeDir, projectId, sessionId, timeline, gantt, sequence]);

  if (loading) return <div className="loading">Loading session...</div>;
  if (!stats || !flow) return <div className="loading">Session not found</div>;

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTokens = (n: number) => n.toLocaleString();

  return (
    <div>
      <h2 className="page-title">Session Detail</h2>

      {/* Tabs */}
      <div className="tabs-row">
        <div className="tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <HelpGuide tab={activeTab} />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
              <div className="meta">Tokens (API)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatTokens(stats.tokenUsage.totalInput + stats.tokenUsage.totalOutput)}
              </div>
              <div className="meta">
                In: {formatTokens(stats.tokenUsage.totalInput)} / Out: {formatTokens(stats.tokenUsage.totalOutput)}
              </div>
            </div>
            <div className="card">
              <div className="meta">Cache Tokens</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatTokens(stats.tokenUsage.totalCacheCreation + stats.tokenUsage.totalCacheRead)}
              </div>
              <div className="meta">
                Create: {formatTokens(stats.tokenUsage.totalCacheCreation)} / Read: {formatTokens(stats.tokenUsage.totalCacheRead)}
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
              <div style={{ paddingLeft: '1.5rem', borderLeft: '2px solid var(--accent)' }}>
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
        </div>
      )}

      {/* Sequence Diagram Tab */}
      {activeTab === 'sequence' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Sequence Diagram</h3>
          {sequence ? (
            <div className="card" style={{ padding: '0.5rem' }}>
              <SequenceDiagram data={sequence} />
            </div>
          ) : (
            <div className="loading">Loading sequence data...</div>
          )}
        </div>
      )}

      {/* Gantt Chart Tab */}
      {activeTab === 'gantt' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Gantt Chart - Agent Execution</h3>
          {gantt ? (
            <div className="card" style={{ padding: '0.5rem' }}>
              <GanttChart data={gantt} />
            </div>
          ) : (
            <div className="loading">Loading gantt data...</div>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Event Timeline</h3>
          {timeline ? (
            <TimelineView data={timeline} />
          ) : (
            <div className="loading">Loading timeline data...</div>
          )}
        </div>
      )}

      {/* Token Charts Tab */}
      {activeTab === 'tokens' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Token & Tool Analytics</h3>
          <TokenChart stats={stats} flow={flow} />
        </div>
      )}
    </div>
  );
}
