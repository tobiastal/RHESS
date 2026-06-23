const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
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
} = require('./skillsService');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'rhess-admin';

app.use(cors());
app.use(express.json());

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing admin token.' });
  }
  next();
}

// ── Health probes ─────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => {
  try {
    loadSources();
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

// ── .well-known/agent-skills/ discovery (npx skills CLI compatibility) ────────
app.get('/.well-known/agent-skills/', (_req, res) => {
  const skills = getAllSkills();
  res.json({
    apiVersion: 'v1',
    api: '/api/v1',
    skills: skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      source: (s.frontmatter && s.frontmatter.source) || null,
      installCommand: s.installCommand,
    })),
  });
});

app.get('/.well-known/agent-skills/:source/:slug', (req, res) => {
  const id = `${req.params.source}__${req.params.slug}`;
  const skill = getSkillById(id);
  if (!skill) return res.status(404).json({ error: 'Skill not found.' });
  skill.files = getSkillFiles(skill.skillPath);
  res.json(skill);
});

// ── Skills ───────────────────────────────────────────────────────────────────

function buildSkillsHandler(req, res) {
  try {
    let skills = getAllSkills();

    const sort = req.query.sort || 'name';
    const order = req.query.order === 'desc' ? -1 : 1;
    const sortKey = ['name', 'description', 'lastModified', 'category'].includes(sort) ? sort : 'name';
    skills = skills.slice().sort((a, b) => {
      const av = (a[sortKey] || '').toString().toLowerCase();
      const bv = (b[sortKey] || '').toString().toLowerCase();
      return av < bv ? -order : av > bv ? order : 0;
    });

    const total = skills.length;
    const perPage = Math.max(1, Math.min(100, parseInt(req.query.per_page) || 50));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const totalPages = Math.ceil(total / perPage);
    const paginated = skills.slice((page - 1) * perPage, page * perPage);

    res.json({ skills: paginated, total, page, per_page: perPage, total_pages: totalPages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildSearchHandler(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ skills: [], total: 0, query: q });
    const results = searchSkills(q);
    res.json({ skills: results, total: results.length, query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildSkillDetailHandler(req, res) {
  try {
    const id = req.params.id
      ? decodeURIComponent(req.params.id)
      : `${req.params.source}__${req.params.slug}`;
    const skill = getSkillById(id);
    if (!skill) return res.status(404).json({ error: 'Skill not found.' });
    skill.files = getSkillFiles(skill.skillPath);
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// v1 routes
app.get('/api/v1/skills/search', buildSearchHandler);
app.get('/api/v1/skills/:source/:slug', buildSkillDetailHandler);
app.get('/api/v1/skills/:id', buildSkillDetailHandler);
app.get('/api/v1/skills', buildSkillsHandler);

// Legacy routes (backward compat)
app.get('/api/skills/search', buildSearchHandler);
app.get('/api/skills/:source/:slug', buildSkillDetailHandler);
app.get('/api/skills/:id', buildSkillDetailHandler);
app.get('/api/skills', buildSkillsHandler);

// ── Sources ──────────────────────────────────────────────────────────────────

function buildSourcesListHandler(_req, res) {
  const sources = loadSources();
  const allSkills = getAllSkills();
  const annotated = sources.map((s) => ({
    ...s,
    skillCount: allSkills.filter((sk) => sk.sourceId === s.id).length,
  }));
  res.json({ sources: annotated });
}

async function buildAddSourceHandler(req, res) {
  const { path: sourcePath, label } = req.body || {};
  if (!sourcePath || !label) {
    return res.status(400).json({ error: '"path" and "label" are required.' });
  }

  const sources = loadSources();
  let localPath = sourcePath;
  let sourceUrl = null;

  if (isGitUrl(sourcePath)) {
    sourceUrl = sourcePath;
    localPath = path.join(REPOS_DIR, urlToLocalDir(sourcePath));

    // Kick off clone
    const newSource = {
      id: uuidv4(),
      label,
      url: sourceUrl,
      path: localPath,
      lastSynced: null,
      status: 'cloning',
    };
    sources.push(newSource);
    saveSources(sources);

    // Respond immediately, clone in background
    res.status(202).json({ source: newSource, message: 'Clone started. Sync when ready.' });

    try {
      await cloneSource(sourceUrl);
      const updated = loadSources();
      const idx = updated.findIndex((s) => s.id === newSource.id);
      if (idx !== -1) {
        updated[idx].status = 'ready';
        updated[idx].lastSynced = new Date().toISOString();
        saveSources(updated);
      }
    } catch (err) {
      const updated = loadSources();
      const idx = updated.findIndex((s) => s.id === newSource.id);
      if (idx !== -1) {
        updated[idx].status = 'error';
        updated[idx].error = err.message;
        saveSources(updated);
      }
    }
    return;
  }

  // Local path source
  const newSource = {
    id: uuidv4(),
    label,
    url: null,
    path: localPath,
    lastSynced: null,
    status: 'ready',
  };
  sources.push(newSource);
  saveSources(sources);
  res.status(201).json({ source: newSource });
}

function buildUpdateSourceHandler(req, res) {
  const { path: sourcePath, label } = req.body || {};
  if (!sourcePath || !label) {
    return res.status(400).json({ error: '"path" and "label" are required.' });
  }
  const sources = loadSources();
  const idx = sources.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Source not found.' });
  sources[idx] = { ...sources[idx], path: sourcePath, label };
  saveSources(sources);
  res.json({ source: sources[idx] });
}

function buildDeleteSourceHandler(req, res) {
  const sources = loadSources();
  const source = sources.find((s) => s.id === req.params.id);
  if (!source) return res.status(404).json({ error: 'Source not found.' });

  const skills = getAllSkills().filter((sk) => sk.sourceId === req.params.id);
  for (const skill of skills) {
    try { fs.rmSync(skill.skillPath, { recursive: true, force: true }); } catch {}
  }

  // Also remove the cloned repo directory if it was a Git source
  if (source.url && source.path && source.path.startsWith(REPOS_DIR)) {
    try { fs.rmSync(source.path, { recursive: true, force: true }); } catch {}
  }

  saveSources(sources.filter((s) => s.id !== req.params.id));
  res.json({ ok: true, skillsRemoved: skills.length });
}

async function buildSyncSourceHandler(req, res) {
  try {
    const sources = loadSources();
    const idx = sources.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Source not found.' });

    const source = sources[idx];

    // Pull latest if this is a Git source
    if (source.url && source.path) {
      try {
        await pullSource(source.path);
      } catch {
        // If pull fails (e.g. no .git yet), try recloning
        try { await cloneSource(source.url); } catch {}
      }
    }

    const now = new Date().toISOString();
    sources[idx] = { ...sources[idx], lastSynced: now, status: 'ready' };
    saveSources(sources);

    const skills = getAllSkills().filter((sk) => sk.sourceId === req.params.id);
    res.json({ synced: true, count: skills.length, lastSynced: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// v1 source routes
app.get('/api/v1/sources', buildSourcesListHandler);
app.post('/api/v1/sources', requireAdmin, buildAddSourceHandler);
app.put('/api/v1/sources/:id', requireAdmin, buildUpdateSourceHandler);
app.delete('/api/v1/sources/:id', requireAdmin, buildDeleteSourceHandler);
app.post('/api/v1/sources/:id/sync', requireAdmin, buildSyncSourceHandler);

// Legacy source routes
app.get('/api/sources', buildSourcesListHandler);
app.post('/api/sources', requireAdmin, buildAddSourceHandler);
app.put('/api/sources/:id', requireAdmin, buildUpdateSourceHandler);
app.delete('/api/sources/:id', requireAdmin, buildDeleteSourceHandler);
app.post('/api/sources/:id/sync', requireAdmin, buildSyncSourceHandler);

// ── Single skill delete (admin) ───────────────────────────────────────────────
function buildDeleteSkillHandler(req, res) {
  try {
    const skill = getSkillById(decodeURIComponent(req.params.id));
    if (!skill) return res.status(404).json({ error: 'Skill not found.' });
    fs.rmSync(skill.skillPath, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.delete('/api/v1/skills/:id', requireAdmin, buildDeleteSkillHandler);
app.delete('/api/skills/:id', requireAdmin, buildDeleteSkillHandler);

// ── Global sync (legacy) ─────────────────────────────────────────────────────
app.post('/api/sync', requireAdmin, (_req, res) => {
  try {
    const skills = getAllSkills();
    const sources = loadSources();
    const now = new Date().toISOString();
    saveSources(sources.map((s) => ({ ...s, lastSynced: now })));
    res.json({ synced: true, count: skills.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  RHESS API Server');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Admin token: ${ADMIN_TOKEN}`);
  console.log('');
});
