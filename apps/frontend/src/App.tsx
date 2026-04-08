import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProjectList from './pages/ProjectList';
import SessionList from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <Link to="/">
            <h1>AI Usage Visualization</h1>
          </Link>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/projects/:projectId" element={<SessionList />} />
            <Route path="/sessions/:projectId/:sessionId" element={<SessionDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
