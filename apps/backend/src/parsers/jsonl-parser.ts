import { readFile, readdir, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ClaudeMessage,
  SubAgentMeta,
  ProjectInfo,
  SessionInfo,
} from '../types/claude.js';

function getProjectsDir(claudeDir: string): string {
  return join(claudeDir, 'projects');
}

export async function validateClaudeDir(claudeDir: string): Promise<boolean> {
  try {
    await access(join(claudeDir, 'projects'));
    return true;
  } catch {
    return false;
  }
}

// Scan known mount points and common locations for .claude directories
export async function findClaudeDirs(): Promise<string[]> {
  const candidates: string[] = [];
  const found: string[] = [];

  // Check mounted volume paths (Docker convention)
  const mountScanDirs = ['/data/host-home', '/data'];
  for (const mountDir of mountScanDirs) {
    try {
      // Direct .claude under mount
      candidates.push(join(mountDir, '.claude'));
      // Scan one level deep for user home dirs that might contain .claude
      const entries = await readdir(mountDir);
      for (const entry of entries) {
        candidates.push(join(mountDir, entry, '.claude'));
      }
    } catch {
      // Mount point doesn't exist
    }
  }

  // Also check local system paths
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (home) {
    candidates.push(join(home, '.claude'));
  }

  // Validate each candidate
  for (const candidate of candidates) {
    if (await validateClaudeDir(candidate)) {
      found.push(candidate);
    }
  }

  return [...new Set(found)];
}

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

export async function getProjects(claudeDir: string): Promise<ProjectInfo[]> {
  const projectsDir = getProjectsDir(claudeDir);
  const projects: ProjectInfo[] = [];

  try {
    const entries = await readdir(projectsDir);

    for (const entry of entries) {
      const projectPath = join(projectsDir, entry);
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

export async function getSessionsForProject(claudeDir: string, projectId: string): Promise<SessionInfo[]> {
  const projectPath = join(getProjectsDir(claudeDir), projectId);
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

export async function getSessionMessages(claudeDir: string, projectId: string, sessionId: string): Promise<ClaudeMessage[]> {
  const filePath = join(getProjectsDir(claudeDir), projectId, `${sessionId}.jsonl`);
  return parseJsonlFile(filePath);
}

export async function getSubAgentMeta(claudeDir: string, projectId: string, sessionId: string, agentId: string): Promise<SubAgentMeta | null> {
  try {
    const metaPath = join(getProjectsDir(claudeDir), projectId, sessionId, 'subagents', `${agentId}.meta.json`);
    const content = await readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getSubAgentMessages(claudeDir: string, projectId: string, sessionId: string, agentId: string): Promise<ClaudeMessage[]> {
  const filePath = join(getProjectsDir(claudeDir), projectId, sessionId, 'subagents', `${agentId}.jsonl`);
  return parseJsonlFile(filePath);
}

export async function listSubAgents(claudeDir: string, projectId: string, sessionId: string): Promise<Array<{ agentId: string; meta: SubAgentMeta | null }>> {
  const subAgentDir = join(getProjectsDir(claudeDir), projectId, sessionId, 'subagents');
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
