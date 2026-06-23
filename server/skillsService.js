const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const os = require('os');
const simpleGit = require('simple-git');

const CONFIG_FILE = path.join(__dirname, 'sources.json');
const REPOS_DIR = path.join(__dirname, 'repos');

// Agent Skills spec discovery directories (per agentskills.io)
const DISCOVERY_PATHS = [
  '',                   // repo root
  'skills',
  '.claude/skills',
  '.cursor/skills',
  '.cursor/skills-cursor',
  '.windsurf/skills',
  '.gemini/skills',
  '.github/skills',
  '.vscode/skills',
];

const DEFAULT_SOURCES = [
  {
    id: 'mock-skills',
    label: 'Community Skills',
    url: null,
    path: path.join(__dirname, 'mock-skills'),
    lastSynced: null,
    status: 'ready',
  },
  {
    id: 'cursor-skills-cursor',
    label: 'Cursor Built-in Skills',
    url: null,
    path: path.join(os.homedir(), '.cursor', 'skills-cursor'),
    lastSynced: null,
    status: 'ready',
  },
  {
    id: 'cursor-skills',
    label: 'User Skills',
    url: null,
    path: path.join(os.homedir(), '.cursor', 'skills'),
    lastSynced: null,
    status: 'ready',
  },
];

function loadSources() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return Array.isArray(data.sources) ? data.sources : DEFAULT_SOURCES;
    } catch {
      return DEFAULT_SOURCES;
    }
  }
  return DEFAULT_SOURCES;
}

function saveSources(sources) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ sources }, null, 2));
}

function isGitUrl(str) {
  return (
    str.startsWith('https://') ||
    str.startsWith('http://') ||
    str.startsWith('git@') ||
    str.startsWith('git://')
  );
}

function urlToLocalDir(url) {
  // Turn https://github.com/vercel-labs/skills → vercel-labs__skills
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^git@[^:]+:/, '')
    .replace(/\.git$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '__')
    .slice(0, 128);
}

async function cloneSource(url) {
  fs.mkdirSync(REPOS_DIR, { recursive: true });
  const dir = path.join(REPOS_DIR, urlToLocalDir(url));
  const git = simpleGit();
  await git.clone(url, dir, ['--depth', '1']);
  return dir;
}

async function pullSource(localPath) {
  const git = simpleGit(localPath);
  await git.pull(['--depth', '1', '--rebase']);
}

function scanDirectory(baseDir, sourceId, sourceLabel) {
  const skills = [];
  if (!fs.existsSync(baseDir)) return skills;

  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(baseDir, entry.name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    try {
      const rawContent = fs.readFileSync(skillFile, 'utf-8');
      const { data: frontmatter } = matter(rawContent);
      const stat = fs.statSync(skillFile);

      // Validate required fields per Agent Skills spec
      if (!frontmatter.name || !frontmatter.description) continue;

      skills.push({
        id: `${sourceId}__${entry.name}`,
        slug: entry.name,
        name: String(frontmatter.name),
        description: String(frontmatter.description).trim(),
        category: typeof frontmatter.category === 'string' ? frontmatter.category.trim() : null,
        allowedTools: Array.isArray(frontmatter['allowed-tools'])
          ? frontmatter['allowed-tools']
          : typeof frontmatter['allowed-tools'] === 'string'
          ? [frontmatter['allowed-tools']]
          : [],
        sourceId,
        sourceLabel,
        skillPath: skillDir,
        frontmatter,
        installCommand: typeof frontmatter.source === 'string'
          ? `cursor install ${frontmatter.source} --skill ${entry.name}`
          : `cp -r "${skillDir}" "$HOME/.cursor/skills/"`,
        lastModified: stat.mtime.toISOString(),
      });
    } catch {
      // skip unreadable skills
    }
  }

  return skills;
}

function scanSource(source) {
  const allSkills = [];
  const seen = new Set();

  for (const discoveryPath of DISCOVERY_PATHS) {
    const dir = discoveryPath
      ? path.join(source.path, discoveryPath)
      : source.path;

    const skills = scanDirectory(dir, source.id, source.label);
    for (const skill of skills) {
      if (!seen.has(skill.id)) {
        seen.add(skill.id);
        allSkills.push(skill);
      }
    }
  }

  return allSkills;
}

function getAllSkills() {
  const sources = loadSources().filter((s) => s.status !== 'error');
  const allSkills = [];
  for (const source of sources) {
    allSkills.push(...scanSource(source));
  }
  return allSkills;
}

function getSkillById(id) {
  const separatorIdx = id.indexOf('__');
  if (separatorIdx === -1) return null;

  const sourceId = id.slice(0, separatorIdx);
  const slug = id.slice(separatorIdx + 2);

  const sources = loadSources();
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return null;

  // Search discovery paths for the skill
  for (const discoveryPath of DISCOVERY_PATHS) {
    const base = discoveryPath ? path.join(source.path, discoveryPath) : source.path;
    const skillDir = path.join(base, slug);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(skillFile)) continue;

    try {
      const rawContent = fs.readFileSync(skillFile, 'utf-8');
      const { data: frontmatter, content } = matter(rawContent);
      const stat = fs.statSync(skillFile);

      if (!frontmatter.name || !frontmatter.description) return null;

      return {
        id,
        slug,
        name: String(frontmatter.name),
        description: String(frontmatter.description).trim(),
        category: typeof frontmatter.category === 'string' ? frontmatter.category.trim() : null,
        allowedTools: Array.isArray(frontmatter['allowed-tools'])
          ? frontmatter['allowed-tools']
          : typeof frontmatter['allowed-tools'] === 'string'
          ? [frontmatter['allowed-tools']]
          : [],
        sourceId,
        sourceLabel: source.label,
        sourceUrl: source.url || null,
        skillPath: skillDir,
        frontmatter,
        content,
        installCommand: typeof frontmatter.source === 'string'
          ? `cursor install ${frontmatter.source} --skill ${slug}`
          : `cp -r "${skillDir}" "$HOME/.cursor/skills/"`,
        lastModified: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  return null;
}

function getSkillFiles(skillPath) {
  const files = [];
  if (!fs.existsSync(skillPath)) return files;
  try {
    const entries = fs.readdirSync(skillPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const contents = fs.readFileSync(path.join(skillPath, entry.name), 'utf-8');
        files.push({ path: entry.name, contents });
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return files;
}

function searchSkills(query) {
  const q = query.toLowerCase();
  const all = getAllSkills();
  const scored = all.map((skill) => {
    let score = 0;
    const name = (skill.name || '').toLowerCase();
    const desc = (skill.description || '').toLowerCase();
    const source = ((skill.frontmatter && skill.frontmatter.source) || '').toLowerCase();
    const category = (skill.category || '').toLowerCase();

    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 60;
    else if (name.includes(q)) score += 40;
    if (desc.includes(q)) score += 20;
    if (source.includes(q)) score += 15;
    if (category.includes(q)) score += 10;

    if (score === 0) {
      let idx = 0;
      for (const ch of q) {
        const found = name.indexOf(ch, idx);
        if (found === -1) { score = -1; break; }
        idx = found + 1;
      }
      if (score === 0) score = 5;
    }

    return { skill, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ skill }) => skill);
}

module.exports = {
  loadSources,
  saveSources,
  getAllSkills,
  getSkillById,
  getSkillFiles,
  searchSkills,
  cloneSource,
  pullSource,
  isGitUrl,
  urlToLocalDir,
  REPOS_DIR,
  DEFAULT_SOURCES,
};
