---
name: vercel-react-best-practices
description: Production-ready React patterns for Vercel deployments — Server Components, caching, streaming, and Core Web Vitals optimization.
version: 1.0.0
author: vercel-labs
source: vercel-labs/agent-skills
category: Frontend & React
tags:
  - react
  - vercel
  - nextjs
  - performance
---

# Vercel React Best Practices

Opinionated guidance for building React applications optimized for Vercel's infrastructure.

## Server vs Client Components

```tsx
// Server Component — data fetching, no interactivity
export default async function Page() {
  const data = await fetchData(); // runs on server
  return <ClientComponent data={data} />;
}

// Client Component — interactivity only
'use client';
export function ClientComponent({ data }) { ... }
```

**Rule**: Default to Server Components. Only add `'use client'` when you need event handlers, state, or browser APIs.

## Caching Strategy

| Data type | Strategy |
|---|---|
| Static content | `force-cache` (default) |
| User-specific | `no-store` |
| Frequently updated | `revalidate: 60` |
| On-demand | `revalidateTag()` / `revalidatePath()` |

## Streaming with Suspense

```tsx
export default function Page() {
  return (
    <>
      <StaticContent />
      <Suspense fallback={<Skeleton />}>
        <DynamicContent />  {/* streams in */}
      </Suspense>
    </>
  );
}
```

## Core Web Vitals

- **LCP**: Use `next/image` with `priority` for above-the-fold images
- **CLS**: Set explicit `width`/`height` on all images and iframes
- **INP**: Avoid blocking the main thread; defer non-critical work

## Installation

```
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
```
