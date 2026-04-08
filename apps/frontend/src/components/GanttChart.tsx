import type { GanttTask } from '../services/api';

interface Props {
  data: GanttTask[];
}

const ACTOR_COLORS: Record<string, string> = {
  'main': '#6366f1',
};

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#06b6d4', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#eab308'];
  return colors[Math.abs(hash) % colors.length];
}

function getColor(actor: string): string {
  return ACTOR_COLORS[actor] || hashColor(actor);
}

export default function GanttChart({ data }: Props) {
  const agentTasks = data.filter(t => t.type === 'agent');
  if (agentTasks.length === 0) return <div className="meta">No agent data</div>;

  const allTimes = data.filter(t => t.startTime && t.endTime).flatMap(t => [
    new Date(t.startTime).getTime(),
    new Date(t.endTime).getTime(),
  ]);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const totalDuration = maxTime - minTime || 1;

  const BAR_HEIGHT = 36;
  const ROW_GAP = 8;
  const LABEL_WIDTH = 280;
  const CHART_WIDTH = 700;
  const PADDING = 20;
  const totalHeight = agentTasks.length * (BAR_HEIGHT + ROW_GAP) + PADDING * 2 + 30;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const formatDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  // Time axis ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = minTime + (totalDuration * i) / tickCount;
    return { time: t, label: formatTime(new Date(t).toISOString()) };
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={LABEL_WIDTH + CHART_WIDTH + PADDING * 2} height={totalHeight}>
        {/* Time axis */}
        {ticks.map(({ time, label }, i) => {
          const x = LABEL_WIDTH + PADDING + ((time - minTime) / totalDuration) * CHART_WIDTH;
          return (
            <g key={i}>
              <line x1={x} y1={20} x2={x} y2={totalHeight - 10}
                stroke="#2d3148" strokeWidth={1} strokeDasharray="2,4" />
              <text x={x} y={14} textAnchor="middle" fill="#8b8fa3" fontSize={10}>
                {label}
              </text>
            </g>
          );
        })}

        {/* Agent bars */}
        {agentTasks.map((task, i) => {
          const y = PADDING + 20 + i * (BAR_HEIGHT + ROW_GAP);
          const startPct = (new Date(task.startTime).getTime() - minTime) / totalDuration;
          const endPct = (new Date(task.endTime).getTime() - minTime) / totalDuration;
          const barX = LABEL_WIDTH + PADDING + startPct * CHART_WIDTH;
          const barWidth = Math.max((endPct - startPct) * CHART_WIDTH, 4);
          const color = getColor(task.actor);

          return (
            <g key={task.id}>
              {/* Label */}
              <text x={LABEL_WIDTH} y={y + BAR_HEIGHT / 2 + 4}
                textAnchor="end" fill="#e4e6f0" fontSize={12}
                style={{ fontWeight: task.actor === 'main' ? 700 : 400 }}>
                {task.label.length > 35 ? task.label.slice(0, 35) + '...' : task.label}
              </text>

              {/* Bar */}
              <rect x={barX} y={y} width={barWidth} height={BAR_HEIGHT}
                rx={4} fill={color} opacity={0.7} />

              {/* Duration label */}
              <text x={barX + barWidth + 6} y={y + BAR_HEIGHT / 2 + 4}
                fill="#8b8fa3" fontSize={10}>
                {formatDuration(task.startTime, task.endTime)}
                {task.model ? ` · ${task.model}` : ''}
                {task.toolCalls ? ` · ${task.toolCalls} tools` : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
