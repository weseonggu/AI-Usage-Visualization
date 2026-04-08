import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ProjectInfo } from '../services/api';

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div>
      <h2 className="page-title">Projects ({projects.length})</h2>
      {projects.map((p) => (
        <Link key={p.id} to={`/projects/${p.id}`}>
          <div className="card">
            <h3>{p.name}</h3>
            <div className="meta">
              <span className="badge">{p.sessionCount} sessions</span>
              <span>{p.path}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
