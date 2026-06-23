#!/usr/bin/env node
/**
 * Generates static JSON files under public/static-api/ so the GitLab Pages
 * build can serve all skills without a running backend.
 *
 * Sources scanned (mirrors server/skillsService.js DEFAULT_SOURCES):
 *   - server/mock-skills/
 *   - ~/.cursor/skills-cursor/
 *   - ~/.cursor/skills/
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'static-api');

const CATEGORY_OVERRIDES = {
  automate:               'Cursor Tooling',
  babysit:                'Code Review',
  canvas:                 'Cursor Tooling',
  'create-hook':          'Cursor Tooling',
  'create-rule':          'Cursor Tooling',
  'create-skill':         'Cursor Tooling',
  'create-subagent':      'Cursor Tooling',
  loop:                   'Utilities',
  'migrate-to-skills':    'Cursor Tooling',
  review:                 'Code Review',
  'review-bugbot':        'Code Review',
  'review-security':      'Code Review',
  sdk:                    'Development',
  shell:                  'Utilities',
  'split-to-prs':         'Code Review',
  statusline:             'Cursor Tooling',
  'update-cli-config':    'Cursor Tooling',
  'update-cursor-settings': 'Cursor Tooling',
  'rhdh-ux-designer':     'Design & UI',
};

function inferCategory(slug, fm) {
  if (typeof fm.category === 'string' && fm.category.trim()) return fm.category.trim();
  if (CATEGORY_OVERRIDES[slug]) return CATEGORY_OVERRIDES[slug];
  const n = (fm.name || slug || '').toLowerCase();
  if (n.includes('review') || n.includes('babysit') || n.includes('split')) return 'Code Review';
  if (n.includes('canvas') || n.includes('rule') || n.includes('hook') ||
      n.includes('skill') || n.includes('cursor') || n.includes('status'))  return 'Cursor Tooling';
  if (n.includes('sdk') || n.includes('api') || n.includes('dev'))          return 'Development';
  if (n.includes('shell') || n.includes('loop') || n.includes('util'))      return 'Utilities';
  return null;
}

const SOURCES = [
  { id: 'mock-skills',          label: 'Community Skills',       dir: path.join(ROOT, 'server', 'mock-skills'),                         lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'cursor-skills-cursor', label: 'Cursor Built-in Skills',  dir: path.join(os.homedir(), '.cursor', 'skills-cursor'),              lastSynced: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 'cursor-skills',        label: 'User Skills',             dir: path.join(os.homedir(), '.cursor', 'skills'),                     lastSynced: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
];

const skills = [];

for (const source of SOURCES) {
  if (!fs.existsSync(source.dir)) {
    console.log(`  ⚠  Skipping ${source.id} (not found: ${source.dir})`);
    continue;
  }

  for (const slug of fs.readdirSync(source.dir).sort()) {
    const skillFile = path.join(source.dir, slug, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    try {
      const { data: fm, content } = matter(fs.readFileSync(skillFile, 'utf8'));
      if (!fm.name || !fm.description) continue;

      const id = `${source.id}__${slug}`;
      skills.push({
        id, slug,
        name: String(fm.name),
        description: String(fm.description).trim(),
        category: inferCategory(slug, fm),
        sourceId: source.id,
        sourceLabel: source.label,
        installCommand: fm.source ? `install ${fm.source} --skill ${slug}` : `install ${source.id}/${slug}`,
        lastModified: fs.statSync(skillFile).mtime.toISOString(),
        allowedTools: Array.isArray(fm['allowed-tools']) ? fm['allowed-tools'] : [],
        sourceUrl: null,
        frontmatter: fm,
        content,
        files: [],
      });
    } catch {
      // skip unreadable files
    }
  }

  console.log(`  ✓ ${source.id}  (${skills.filter(s => s.sourceId === source.id).length} skills)`);
}

// Write output files
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, 'skills'), { recursive: true });

// List endpoint
fs.writeFileSync(
  path.join(OUT_DIR, 'skills.json'),
  JSON.stringify({ skills, total: skills.length, page: 1, per_page: 200 })
);

// Detail endpoints
for (const skill of skills) {
  fs.writeFileSync(
    path.join(OUT_DIR, 'skills', `${encodeURIComponent(skill.id)}.json`),
    JSON.stringify(skill)
  );
}

// Sources endpoint
fs.writeFileSync(
  path.join(OUT_DIR, 'sources.json'),
  JSON.stringify({
    sources: SOURCES
      .filter(s => fs.existsSync(s.dir))
      .map(s => ({ id: s.id, label: s.label, url: null, path: null, lastSynced: s.lastSynced, status: 'ready' }))
  })
);

console.log(`\n  Total: ${skills.length} skills written to public/static-api/`);
