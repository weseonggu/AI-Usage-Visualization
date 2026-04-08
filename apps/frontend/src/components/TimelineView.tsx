import type { TimelineEvent } from '../services/api';

interface Props {
  data: TimelineEvent[];
}

const TYPE_STYLES: Record<string, { color: string; icon: string }> = {
  'user': { color: '#22c55e', icon: 'U' },
  'assistant': { color: '#6366f1', icon: 'A' },
  'tool_use': { color: '#f59e0b', icon: 'T' },
  'agent_spawn': { color: '#a855f7', icon: 'S' },
  'agent_result': { color: '#06b6d4', icon: 'R' },
};

export default function TimelineView({ data }: Props) {
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="timeline-container">
      {data.map((event, i) => {
        const style = TYPE_STYLES[event.type] || { color: '#8b8fa3', icon: '?' };
        const isSubAgent = event.actor !== 'user' && event.actor !== 'main';

        return (
          <div key={`${event.id}-${i}`} className="timeline-item"
            style={{ marginLeft: isSubAgent ? '2rem' : 0 }}>
            <div className="timeline-line" style={{ borderColor: style.color }} />
            <div className="timeline-dot" style={{ background: style.color }}>
              {style.icon}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-time">{formatTime(event.timestamp)}</span>
                <span className="badge" style={{ background: style.color, color: '#fff' }}>
                  {event.type.replace('_', ' ')}
                </span>
                <span className="timeline-actor">{event.actorLabel}</span>
                {event.model && <span className="badge">{event.model}</span>}
                {event.toolName && <span className="badge" style={{ background: '#f59e0b33', color: '#f59e0b' }}>{event.toolName}</span>}
              </div>
              {event.content && (
                <div className="timeline-text">{event.content}</div>
              )}
              {event.tokens && (event.tokens.input > 0 || event.tokens.output > 0) && (
                <div className="timeline-tokens">
                  in:{event.tokens.input.toLocaleString()} out:{event.tokens.output.toLocaleString()}
                  {event.tokens.cacheRead > 0 && ` cache-read:${event.tokens.cacheRead.toLocaleString()}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
