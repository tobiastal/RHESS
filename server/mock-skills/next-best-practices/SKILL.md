---
name: next-best-practices
description: Next.js App Router best practices — routing conventions, data fetching, authentication, and deployment patterns.
version: 1.0.0
author: vercel-labs
source: vercel-labs/next-skills
category: Frontend & React
tags:
  - nextjs
  - app-router
  - typescript
---

# Next.js Best Practices

Production patterns for Next.js App Router applications.

## Project Structure

```
app/
  (auth)/           # Route group — no URL segment
    login/
    register/
  (dashboard)/
    layout.tsx      # Protected layout
    page.tsx
  api/
    auth/[...nextauth]/route.ts
components/
  ui/               # Primitives
  features/         # Feature components
lib/
  auth.ts
  db.ts
```

## Authentication with Middleware

```tsx
// middleware.ts
import { auth } from '@/lib/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard');

  if (isProtected && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.url));
  }
});
```

## Parallel Data Fetching

```tsx
// Fetch in parallel in Server Components
const [user, posts] = await Promise.all([
  getUser(params.id),
  getUserPosts(params.id),
]);
```

## Installation

```
npx skills add https://github.com/vercel-labs/next-skills --skill next-best-practices
```
