import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type ProjectInfo } from '../services/api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

interface Props {
  claudeDir: string;
}

export default function ProjectList({ claudeDir }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getProjects(claudeDir, currentPage, PAGE_SIZE)
      .then((res) => {
        setProjects(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [claudeDir, currentPage]);

  const handlePageChange = (page: number) => {
    setSearchParams({ page: String(page) });
  };

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div>
      <h2 className="page-title">Projects ({total})</h2>
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
