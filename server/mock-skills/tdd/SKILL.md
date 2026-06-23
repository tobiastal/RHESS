---
name: tdd
description: Test-driven development with vertical slices, behavior-focused tests, and incremental red-green-refactor cycles.
version: 1.0.0
author: mattpocock
source: mattpocock/skills
category: Testing & QA
tags:
  - tdd
  - testing
  - typescript
---

# Test-Driven Development

## Philosophy

Core principle: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

Good tests are integration-style: they exercise real code paths through public APIs. They describe what the system does, not how it does it. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

Bad tests are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed.

## Anti-Pattern: Horizontal Slices

**DO NOT** write all tests first, then all implementation. This is "horizontal slicing."

Instead, use **vertical slices**:

1. Write one test for a single behavior
2. Implement just enough to make it pass
3. Refactor
4. Repeat

## The Red-Green-Refactor Cycle

```
RED   → Write a failing test for the next behavior
GREEN → Write the minimum code to pass the test
REFACTOR → Clean up duplication, improve design
```

## Planning Phase

Before writing any code:

1. Confirm interface changes with the user
2. Prioritize which behaviors to test first
3. Design for testability — dependency injection, pure functions, clear boundaries

## Refactoring Guidelines

Apply only after all tests pass:

- Extract duplication into shared utilities
- Deepen modules by hiding implementation details
- Apply SOLID principles where they reduce coupling
- Never refactor and add features simultaneously
