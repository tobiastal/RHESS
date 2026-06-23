#!/usr/bin/env node
/**
 * Generates static JSON files under public/static-api/ so the GitLab Pages
 * build can serve mock skills without a running backend.
 *
 * File layout (all have .json extension to avoid directory name conflicts):
 *   public/static-api/skills.json          ← paginated list
 *   public/static-api/skills/<id>.json     ← individual skill detail
 *   public/static-api/sources.json         ← sources list
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..');
const MOCK_DIR = path.join(ROOT, 'server', 'mock-skills');
const OUT_DIR = path.join(ROOT, 'public', 'static-api');

const CATEGORY_OVERRIDES = {
  'rhdh-ux-designer': 'Design & UI',
};

function inferCategory(slug, fm) {
  if (typeof fm.category === 'string' && fm.category.trim()) return fm.category.trim();
  return CATEGORY_OVERRIDES[slug] || null;
}

const skills = [];
for (const slug of fs.readdirSync(MOCK_DIR).sort()) {
  const skillFile = path.join(MOCK_DIR, slug, 'SKILL.md');
  if (!fs.existsSync(skillFile)) continue;
  const { data: fm, content } = matter(fs.readFileSync(skillFile, 'utf8'));
  if (!fm.name || !fm.description) continue;

  const id = `mock-skills__${slug}`;
  skills.push({
    id, slug,
    name: String(fm.name),
    description: String(fm.description).trim(),
    category: inferCategory(slug, fm),
    sourceId: 'mock-skills',
    sourceLabel: 'Community Skills',
    installCommand: fm.source ? `cursor install ${fm.source} --skill ${slug}` : null,
    lastModified: new Date().toISOString(),
    allowedTools: Array.isArray(fm['allowed-tools']) ? fm['allowed-tools'] : [],
    sourceUrl: fm.source || null,
    frontmatter: fm,
    content,
    files: [],
  });
}

fs.mkdirSync(path.join(OUT_DIR, 'skills'), { recursive: true });

// List
fs.writeFileSync(
  path.join(OUT_DIR, 'skills.json'),
  JSON.stringify({ skills, total: skills.length, page: 1, per_page: 200 })
);
console.log(`  ✓ static-api/skills.json  (${skills.length} skills)`);

// Individual detail files
for (const skill of skills) {
  fs.writeFileSync(
    path.join(OUT_DIR, 'skills', `${encodeURIComponent(skill.id)}.json`),
    JSON.stringify(skill)
  );
}
console.log(`  ✓ static-api/skills/<id>.json  (${skills.length} files)`);

// Sources
fs.writeFileSync(
  path.join(OUT_DIR, 'sources.json'),
  JSON.stringify({ sources: [{ id: 'mock-skills', label: 'Community Skills', url: null, path: null, lastSynced: null, status: 'ready' }] })
);
console.log('  ✓ static-api/sources.json');
console.log('\nStatic API files generated successfully.');
