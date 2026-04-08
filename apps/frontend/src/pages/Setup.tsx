import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface SetupProps {
  onComplete: (claudeDir: string) => void;
  initialPath?: string;
}

const EXAMPLE_PATHS = [
  { os: 'Windows', path: 'C:\\Users\\<username>\\.claude' },
  { os: 'Mac / Linux', path: '/home/<username>/.claude' },
  { os: 'Docker (default)', path: '/data/host-home/.claude' },
];

export default function Setup({ onComplete, initialPath }: SetupProps) {
  const [path, setPath] = useState(initialPath || '');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [detected, setDetected] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(true);

  // Auto-detect .claude directories on mount
  useEffect(() => {
    api.detectClaudeDirs().then((dirs) => {
      setDetected(dirs);
      // If exactly one found and no path set, auto-fill it
      if (dirs.length === 1 && !initialPath) {
        setPath(dirs[0]);
      }
    }).finally(() => setDetecting(false));
  }, [initialPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) {
      setError('Please enter a path.');
      return;
    }

    setValidating(true);
    setError('');

    const valid = await api.validatePath(trimmed);
    setValidating(false);

    if (valid) {
      onComplete(trimmed);
    } else {
      setError('Invalid path: "projects" directory not found. Please check the path.');
    }
  };

  const handleAutoConnect = (detectedPath: string) => {
    setPath(detectedPath);
    onComplete(detectedPath);
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h2>Welcome to AI Usage Visualization</h2>
        <p className="meta" style={{ marginBottom: '1.5rem' }}>
          Enter the path to your <code>.claude</code> directory to get started.
        </p>

        {/* Auto-detected paths */}
        {detecting && (
          <div className="setup-detected" style={{ marginBottom: '1.5rem' }}>
            <div className="meta">Scanning for .claude directories...</div>
          </div>
        )}
        {!detecting && detected.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--success)' }}>
              Detected .claude directories:
            </h4>
            {detected.map((d) => (
              <div
                key={d}
                className="setup-detected-item"
                onClick={() => handleAutoConnect(d)}
              >
                <span className="badge badge--accent">Auto-detected</span>
                <code>{d}</code>
                <span className="setup-connect-hint">Click to connect</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="setup-input-group">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/path/to/.claude"
              className="setup-input"
              autoFocus
            />
            <button type="submit" className="setup-btn" disabled={validating}>
              {validating ? 'Validating...' : 'Connect'}
            </button>
          </div>
          {error && <div className="setup-error">{error}</div>}
        </form>

        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Example paths:</h4>
          {EXAMPLE_PATHS.map(({ os, path: p }) => (
            <div
              key={os}
              className="setup-example"
              onClick={() => setPath(p)}
            >
              <span className="badge">{os}</span>
              <code>{p}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
