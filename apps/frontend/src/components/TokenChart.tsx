import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { SessionStats, AgentFlow } from '../services/api';

interface Props {
  stats: SessionStats;
  flow: AgentFlow;
}

const COLORS = ['#6366f1', '#06b6d4', '#a855f7', '#f59e0b', '#22c55e', '#ec4899'];

export default function TokenChart({ stats, flow }: Props) {
  // Token breakdown data
  const tokenBreakdown = [
    { name: 'Input', value: stats.tokenUsage.totalInput, color: '#6366f1' },
    { name: 'Output', value: stats.tokenUsage.totalOutput, color: '#22c55e' },
    { name: 'Cache Create', value: stats.tokenUsage.totalCacheCreation, color: '#f59e0b' },
    { name: 'Cache Read', value: stats.tokenUsage.totalCacheRead, color: '#06b6d4' },
  ];

  // Model usage data
  const modelData = Object.entries(stats.tokenUsage.byModel).map(([model, usage]) => ({
    name: model.replace('claude-', '').replace('-20251001', ''),
    input: usage.input,
    output: usage.output,
  }));

  // Tool usage data (top 10)
  const allToolCalls = [...flow.mainAgent.toolCalls, ...flow.subAgents.flatMap(a => a.toolCalls)];
  const toolCounts: Record<string, number> = {};
  for (const t of allToolCalls) toolCounts[t] = (toolCounts[t] || 0) + 1;
  const toolData = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  // Agent comparison
  const agentData = [
    { name: 'Main', messages: flow.mainAgent.messageCount, tools: flow.mainAgent.toolCalls.length },
    ...flow.subAgents.map(a => ({
      name: `${a.agentType}`,
      messages: a.messageCount,
      tools: a.toolCalls.length,
    })),
  ];

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Token Breakdown Pie */}
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Token Breakdown</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={tokenBreakdown} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${formatNum(value)}`}>
                {tokenBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Model Usage Bar */}
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Token by Model</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="name" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={formatNum} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={{ background: '#1a1d2e', border: '1px solid #2d3148' }} />
              <Legend />
              <Bar dataKey="input" fill="#6366f1" name="Input" />
              <Bar dataKey="output" fill="#22c55e" name="Output" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Tool Usage Bar */}
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Tool Usage (Top 12)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={toolData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis type="number" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b8fa3', fontSize: 11 }} width={100} />
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #2d3148' }} />
              <Bar dataKey="count" fill="#f59e0b" name="Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Comparison */}
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Agent Comparison</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="name" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #2d3148' }} />
              <Legend />
              <Bar dataKey="messages" fill="#6366f1" name="Messages" />
              <Bar dataKey="tools" fill="#f59e0b" name="Tool Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
