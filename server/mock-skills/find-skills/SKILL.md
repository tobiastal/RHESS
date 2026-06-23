---
name: find-skills
description: Discover and install specialized agent skills from the open ecosystem when users need extended capabilities.
version: 1.0.0
author: vercel-labs
source: vercel-labs/skills
category: Agent Workflows
tags:
  - registry
  - discovery
  - tooling
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

## How to Find Skills

### Search by query
```
npx skills find [query]
```

### Install from a source
```
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

## Recommendation Criteria

When recommending skills, prefer:

- **Install count**: Skills with 1K+ installs are battle-tested
- **Source reputation**: Official sources (Vercel, Anthropic, Microsoft) are preferred
- **GitHub stars**: Higher star count signals community trust
- **Recency**: Check when the skill was last updated

## Discovery Workflow

1. Check the skills.sh leaderboard first for popular options
2. Search by domain (design, testing, deployment, etc.)
3. Compare install counts and source reputation
4. Recommend top 3 options with install commands
5. Let the user choose and install with `npx skills add`
