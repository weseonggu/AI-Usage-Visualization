import { Router, type Request, type Response } from 'express';
import { getProjects, getSessionsForProject, getSessionMessages, validateClaudeDir, findClaudeDirs } from '../parsers/jsonl-parser.js';
import { getSessionStats, getAgentFlow, getTimeline, getGanttData, getSequenceData } from '../services/stats-service.js';

const router = Router();

// Extract claudeDir from query param, required on all endpoints
function getClaudeDir(req: Request, res: Response): string | null {
  const claudeDir = req.query.claudeDir as string | undefined;
  if (!claudeDir) {
    res.status(400).json({ error: 'claudeDir query parameter is required' });
    return null;
  }
  return claudeDir;
}

// GET /api/detect - auto-detect .claude directories from mounted volumes
router.get('/detect', async (_req, res) => {
  try {
    const dirs = await findClaudeDirs();
    res.json({ detected: dirs });
  } catch {
    res.json({ detected: [] });
  }
});

// POST /api/validate-path - check if a path is a valid .claude directory
router.post('/validate-path', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'path is required' });
      return;
    }
    const valid = await validateClaudeDir(path);
    res.json({ valid, path });
  } catch {
    res.json({ valid: false });
  }
});

// GET /api/projects?claudeDir=...
router.get('/projects', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const projects = await getProjects(claudeDir);
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:projectId/sessions?claudeDir=...
router.get('/projects/:projectId/sessions', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const sessions = await getSessionsForProject(claudeDir, req.params.projectId);
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:projectId/:sessionId?claudeDir=...
router.get('/sessions/:projectId/:sessionId', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const messages = await getSessionMessages(claudeDir, req.params.projectId, req.params.sessionId);
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// GET /api/sessions/:projectId/:sessionId/stats?claudeDir=...
router.get('/sessions/:projectId/:sessionId/stats', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const stats = await getSessionStats(claudeDir, req.params.projectId, req.params.sessionId);
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

// GET /api/sessions/:projectId/:sessionId/agents?claudeDir=...
router.get('/sessions/:projectId/:sessionId/agents', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const flow = await getAgentFlow(claudeDir, req.params.projectId, req.params.sessionId);
    res.json(flow);
  } catch {
    res.status(500).json({ error: 'Failed to load agent flow' });
  }
});

// GET /api/sessions/:projectId/:sessionId/timeline?claudeDir=...
router.get('/sessions/:projectId/:sessionId/timeline', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const timeline = await getTimeline(claudeDir, req.params.projectId, req.params.sessionId);
    res.json(timeline);
  } catch {
    res.status(500).json({ error: 'Failed to build timeline' });
  }
});

// GET /api/sessions/:projectId/:sessionId/gantt?claudeDir=...
router.get('/sessions/:projectId/:sessionId/gantt', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const gantt = await getGanttData(claudeDir, req.params.projectId, req.params.sessionId);
    res.json(gantt);
  } catch {
    res.status(500).json({ error: 'Failed to build gantt data' });
  }
});

// GET /api/sessions/:projectId/:sessionId/sequence?claudeDir=...
router.get('/sessions/:projectId/:sessionId/sequence', async (req, res) => {
  const claudeDir = getClaudeDir(req, res);
  if (!claudeDir) return;
  try {
    const sequence = await getSequenceData(claudeDir, req.params.projectId, req.params.sessionId);
    res.json(sequence);
  } catch {
    res.status(500).json({ error: 'Failed to build sequence data' });
  }
});

export default router;
