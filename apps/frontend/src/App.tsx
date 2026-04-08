import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { getStoredClaudeDir, setStoredClaudeDir, clearStoredClaudeDir } from './services/api';
import Setup from './pages/Setup';
import ProjectList from './pages/ProjectList';
import SessionList from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';

function App() {
  const [claudeDir, setClaudeDir] = useState<string | null>(getStoredClaudeDir());

  const handleSetup = (path: string) => {
    setStoredClaudeDir(path);
    setClaudeDir(path);
  };

  const handleReset = () => {
    clearStoredClaudeDir();
    setClaudeDir(null);
  };

  if (!claudeDir) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>AI Usage Visualization</h1>
        </header>
        <main className="app-main">
          <Setup onComplete={handleSetup} />
        </main>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <Link to="/">
              <h1>AI Usage Visualization</h1>
            </Link>
            <div className="header-right">
              <span className="meta header-path">{claudeDir}</span>
              <button onClick={handleReset} className="header-btn">Change Path</button>
            </div>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ProjectList claudeDir={claudeDir} />} />
            <Route path="/projects/:projectId" element={<SessionList claudeDir={claudeDir} />} />
            <Route path="/sessions/:projectId/:sessionId" element={<SessionDetail claudeDir={claudeDir} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
