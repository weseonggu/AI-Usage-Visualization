import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ClaudeMessage,
  SubAgentMeta,
  ProjectInfo,
  SessionInfo,
} from '../types/claude.js';

const CLAUDE_DIR = process.env.CLAUDE_DIR || join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

export async function parseJsonlFile(filePath: string): Promise<ClaudeMessage[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const messages: ClaudeMessage[] = [];

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }
  return messages;
}

export async function getProjects(): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = [];

  try {
    const entries = await readdir(PROJECTS_DIR);

    for (const entry of entries) {
      const projectPath = join(PROJECTS_DIR, entry);
      const projectStat = await stat(projectPath);
      if (!projectStat.isDirectory()) continue;

      const files = await readdir(projectPath);
      const sessionFiles = files.filter(f => f.endsWith('.jsonl'));

      projects.push({
        id: entry,
        name: decodeProjectName(entry),
        path: projectPath,
        sessionCount: sessionFiles.length,
      });
    }
  } catch {
    // Projects dir may not exist
  }

  return projects;
}

export async function getSessionsForProject(projectId: string): Promise<SessionInfo[]> {
  const projectPath = join(PROJECTS_DIR, projectId);
  const sessions: SessionInfo[] = [];

  try {
    const files = await readdir(projectPath);
    const sessionFiles = files.filter(f => f.endsWith('.jsonl'));

    for (const file of sessionFiles) {
      const sessionId = file.replace('.jsonl', '');
      const messages = await parseJsonlFile(join(projectPath, file));

      // Count sub-agents
      let subAgentCount = 0;
      try {
        const subAgentDir = join(projectPath, sessionId, 'subagents');
        const subFiles = await readdir(subAgentDir);
        subAgentCount = subFiles.filter(f => f.endsWith('.meta.json')).length;
      } catch {
        // No subagents dir
      }

      const models = new Set<string>();
      let gitBranch: string | undefined;
      let cwd: string | undefined;
      let startTime = '';

      for (const msg of messages) {
        if (msg.message?.model) models.add(msg.message.model);
        if (msg.gitBranch) gitBranch = msg.gitBranch;
        if (msg.cwd) cwd = msg.cwd;
        if (!startTime && msg.timestamp) startTime = msg.timestamp;
      }

      sessions.push({
        id: sessionId,
        projectId,
        startTime,
        messageCount: messages.length,
        subAgentCount,
        models: Array.from(models),
        gitBranch,
        cwd,
      });
    }
  } catch {
    // Project may not exist
  }

  return sessions.sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export async function getSessionMessages(projectId: string, sessionId: string): Promise<ClaudeMessage[]> {
  const filePath = join(PROJECTS_DIR, projectId, `${sessionId}.jsonl`);
  return parseJsonlFile(filePath);
}

export async function getSubAgentMeta(projectId: string, sessionId: string, agentId: string): Promise<SubAgentMeta | null> {
  try {
    const metaPath = join(PROJECTS_DIR, projectId, sessionId, 'subagents', `${agentId}.meta.json`);
    const content = await readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getSubAgentMessages(projectId: string, sessionId: string, agentId: string): Promise<ClaudeMessage[]> {
  const filePath = join(PROJECTS_DIR, projectId, sessionId, 'subagents', `${agentId}.jsonl`);
  return parseJsonlFile(filePath);
}

export async function listSubAgents(projectId: string, sessionId: string): Promise<Array<{ agentId: string; meta: SubAgentMeta | null }>> {
  const subAgentDir = join(PROJECTS_DIR, projectId, sessionId, 'subagents');
  const agents: Array<{ agentId: string; meta: SubAgentMeta | null }> = [];

  try {
    const files = await readdir(subAgentDir);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));

    for (const file of metaFiles) {
      const agentId = file.replace('.meta.json', '');
      const content = await readFile(join(subAgentDir, file), 'utf-8');
      try {
        agents.push({ agentId, meta: JSON.parse(content) });
      } catch {
        agents.push({ agentId, meta: null });
      }
    }
  } catch {
    // No subagents
  }

  return agents;
}

function decodeProjectName(encoded: string): string {
  // Project names encode path: C--Users-andwise-Desktop-xxx → C:\Users\andwise\Desktop\xxx
  return encoded
    .replace(/^([A-Z])--/, '$1:\\')
    .replace(/-/g, '\\');
}
