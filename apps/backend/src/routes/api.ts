import { Router } from 'express';
import { getProjects, getSessionsForProject, getSessionMessages } from '../parsers/jsonl-parser.js';
import { getSessionStats, getAgentFlow } from '../services/stats-service.js';

const router = Router();

// GET /api/projects
router.get('/projects', async (_req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:projectId/sessions
router.get('/projects/:projectId/sessions', async (req, res) => {
  try {
    const sessions = await getSessionsForProject(req.params.projectId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:projectId/:sessionId
router.get('/sessions/:projectId/:sessionId', async (req, res) => {
  try {
    const messages = await getSessionMessages(req.params.projectId, req.params.sessionId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// GET /api/sessions/:projectId/:sessionId/stats
router.get('/sessions/:projectId/:sessionId/stats', async (req, res) => {
  try {
    const stats = await getSessionStats(req.params.projectId, req.params.sessionId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

// GET /api/sessions/:projectId/:sessionId/agents
router.get('/sessions/:projectId/:sessionId/agents', async (req, res) => {
  try {
    const flow = await getAgentFlow(req.params.projectId, req.params.sessionId);
    res.json(flow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load agent flow' });
  }
});

export default router;
