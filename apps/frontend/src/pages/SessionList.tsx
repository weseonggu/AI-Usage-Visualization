import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, type SessionInfo } from '../services/api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

interface Props {
  claudeDir: string;
}

export default function SessionList({ claudeDir }: Props) {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.getSessions(claudeDir, projectId, currentPage, PAGE_SIZE)
      .then((res) => {
        setSessions(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [claudeDir, projectId, currentPage]);

  const handlePageChange = (page: number) => {
    setSearchParams({ page: String(page) });
  };

  if (loading) return <div className="loading">Loading sessions...</div>;

  return (
    <div>
      <h2 className="page-title">Sessions ({total})</h2>
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
