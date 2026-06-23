---
name: accessibility-guidelines
description: Build inclusive web experiences that meet WCAG 2.1 AA standards — semantic HTML, ARIA, keyboard navigation, and screen reader testing.
version: 1.0.0
author: anthropics
source: anthropics/skills
category: Design & UI
tags:
  - accessibility
  - a11y
  - wcag
  - aria
---

# Accessibility Guidelines

Build accessible web applications that work for everyone — keyboard users, screen reader users, and people with cognitive or visual impairments.

## Core Rules

### 1. Semantic HTML first

```html
<!-- Bad -->
<div class="button" onclick="submit()">Submit</div>

<!-- Good -->
<button type="submit">Submit</button>
```

### 2. Every image needs a text alternative

```html
<!-- Decorative -->
<img src="divider.png" alt="" role="presentation" />

<!-- Informative -->
<img src="chart.png" alt="Bar chart showing 40% increase in Q4 revenue" />
```

### 3. Forms need accessible labels

```html
<label for="email">Email address</label>
<input id="email" type="email" autocomplete="email" />
```

### 4. Keyboard navigation

Every interactive element must be:
- Reachable by Tab
- Operable by Enter/Space
- Visible with a focus indicator (min 2px outline)

### 5. Color contrast

| Text | Minimum ratio |
|---|---|
| Normal text | 4.5:1 |
| Large text (18pt+) | 3:1 |
| UI components | 3:1 |

## Installation

```
npx skills add https://github.com/anthropics/skills --skill accessibility-guidelines
```
