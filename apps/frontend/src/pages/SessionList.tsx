import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type SessionInfo } from '../services/api';

interface Props {
  claudeDir: string;
}

export default function SessionList({ claudeDir }: Props) {
  const { projectId } = useParams<{ projectId: string }>();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    api.getSessions(claudeDir, projectId).then(setSessions).finally(() => setLoading(false));
  }, [claudeDir, projectId]);

  if (loading) return <div className="loading">Loading sessions...</div>;

  return (
    <div>
      <h2 className="page-title">Sessions ({sessions.length})</h2>
      {sessions.map((s) => (
        <Link key={s.id} to={`/sessions/${projectId}/${s.id}`}>
          <div className="card">
            <h3>{new Date(s.startTime).toLocaleString()}</h3>
            <div className="meta">
              <span className="badge">{s.messageCount} messages</span>
              {s.subAgentCount > 0 && (
                <span className="badge badge--accent">{s.subAgentCount} sub-agents</span>
              )}
              {s.models.map((m) => (
                <span key={m} className="badge">{m}</span>
              ))}
              {s.gitBranch && <span className="badge">branch: {s.gitBranch}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
