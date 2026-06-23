---
name: web-design-guidelines
description: Audit UI code against Vercel's Web Interface Guidelines for design and accessibility compliance.
version: 1.0.0
author: vercel-labs
source: vercel-labs/agent-skills
category: Design & UI
tags:
  - design
  - accessibility
  - vercel
  - audit
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

## Usage

```
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
```

Then ask the agent:

> "Review my UI components against Vercel's web interface guidelines"
> "Audit src/components/ for design and accessibility compliance"

## Output Format

Findings are reported in terse `file:line` format for quick scanning:

```
src/components/Button.tsx:12 — Missing focus-visible outline
src/pages/index.tsx:45 — Line length exceeds 80ch for body copy
src/styles/global.css:8 — Hardcoded color value, use CSS variable
```
