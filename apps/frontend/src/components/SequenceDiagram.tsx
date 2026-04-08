import { useEffect, useRef } from 'react';
import type { SequenceMessage } from '../services/api';

interface Props {
  data: SequenceMessage[];
}

const ACTOR_COLORS: Record<string, string> = {
  'User': '#22c55e',
  'Main Agent': '#6366f1',
  'Tools': '#f59e0b',
  'Explore': '#06b6d4',
  'Plan': '#a855f7',
  'general': '#ec4899',
};

function getColor(actor: string): string {
  return ACTOR_COLORS[actor] || '#8b8fa3';
}

export default function SequenceDiagram({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract unique actors in order of appearance
  const actorOrder: string[] = [];
  for (const msg of data) {
    if (!actorOrder.includes(msg.from)) actorOrder.push(msg.from);
    if (!actorOrder.includes(msg.to)) actorOrder.push(msg.to);
  }

  const COL_WIDTH = 180;
  const ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 50;
  const PADDING = 40;
  const totalWidth = actorOrder.length * COL_WIDTH + PADDING * 2;
  const totalHeight = data.length * ROW_HEIGHT + HEADER_HEIGHT + PADDING * 2;

  const getX = (actor: string) => {
    const idx = actorOrder.indexOf(actor);
    return PADDING + idx * COL_WIDTH + COL_WIDTH / 2;
  };

  return (
    <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}>
      <svg width={totalWidth} height={totalHeight} style={{ minWidth: totalWidth }}>
        {/* Actor headers */}
        {actorOrder.map((actor) => {
          const x = getX(actor);
          return (
            <g key={actor}>
              <rect
                x={x - 60} y={10} width={120} height={30} rx={4}
                fill={getColor(actor)} opacity={0.2}
                stroke={getColor(actor)} strokeWidth={1}
              />
              <text x={x} y={30} textAnchor="middle" fill={getColor(actor)}
                fontSize={12} fontWeight={600}>{actor}</text>
              {/* Lifeline */}
              <line x1={x} y1={HEADER_HEIGHT} x2={x} y2={totalHeight - PADDING}
                stroke="#2d3148" strokeWidth={1} strokeDasharray="4,4" />
            </g>
          );
        })}

        {/* Messages */}
        {data.map((msg, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;
          const fromX = getX(msg.from);
          const toX = getX(msg.to);
          const isRight = toX > fromX;
          const arrowDir = isRight ? 1 : -1;
          const color = msg.type === 'agent_spawn' ? '#a855f7'
            : msg.type === 'agent_result' ? '#06b6d4'
            : msg.type === 'tool_call' ? '#f59e0b'
            : msg.type === 'response' ? '#22c55e'
            : '#6366f1';
          const isDashed = msg.type === 'response' || msg.type === 'agent_result' || msg.type === 'tool_result';
          const label = msg.label.length > 35 ? msg.label.slice(0, 35) + '...' : msg.label;

          return (
            <g key={`${i}-${msg.timestamp}`}>
              <line
                x1={fromX} y1={y} x2={toX} y2={y}
                stroke={color} strokeWidth={1.5}
                strokeDasharray={isDashed ? '6,3' : undefined}
                markerEnd={`url(#arrow-${i})`}
              />
              <defs>
                <marker id={`arrow-${i}`} markerWidth="8" markerHeight="6"
                  refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={color} />
                </marker>
              </defs>
              <text
                x={(fromX + toX) / 2}
                y={y - 6}
                textAnchor="middle"
                fill="#e4e6f0"
                fontSize={10}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
