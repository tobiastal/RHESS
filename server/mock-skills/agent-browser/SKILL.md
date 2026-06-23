---
name: agent-browser
description: Full browser automation — navigate, click, fill forms, extract data, and screenshot any web page.
version: 1.0.0
author: vercel-labs
source: vercel-labs/agent-browser
category: Agent Workflows
tags:
  - browser
  - automation
  - scraping
---

# Agent Browser

Full browser automation for AI agents. Navigate pages, interact with UI elements, extract structured data, and take screenshots.

## Capabilities

- Navigate to URLs and follow redirects
- Click elements by text, role, or CSS selector
- Fill and submit forms
- Wait for network idle or element visibility
- Take full-page and element-scoped screenshots
- Extract structured data from tables, lists, and cards
- Handle login flows and authentication

## Usage Examples

```
npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser
```

Then ask the agent:

> "Go to github.com/vercel/next.js and find the latest release"
> "Fill in the contact form with my name and email, then submit"
> "Extract all product names and prices from this page as JSON"
> "Take a screenshot of the dashboard after logging in"

## Supported Contexts

- Chromium-based browsers (Chrome, Edge, Arc)
- Headless mode for CI/automation
- Authenticated sessions (cookies, localStorage)
- SPA / client-rendered pages

## Limitations

- Cannot bypass CAPTCHA challenges
- Does not support browser extensions
- PDF viewing requires workarounds
