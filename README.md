# PoolMind Monorepo

A Turborepo-based monorepo containing the PoolMind platform and orchestrator backend.

## Structure

```
poolmind/
├── apps/
│   ├── platform/          # Next.js frontend application
│   └── orchestrator/      # NestJS backend API
├── packages/
│   └── shared/
│       ├── types/         # Shared TypeScript types and schemas
│       └── utils/         # Shared utility functions
└── turbo.json            # Turborepo configuration
```

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Build all packages:

```bash
pnpm build
```

3. Start development servers:

```bash
pnpm dev
```

This will start:

- Platform frontend at http://localhost:3000
- Orchestrator backend at http://localhost:3001

## Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Lint all apps and packages
- `pnpm type-check` - Type check all apps and packages
- `pnpm clean` - Clean all build artifacts

## Apps

### Platform (Frontend)

Next.js application serving the PoolMind user interface.

### Orchestrator (Backend)

NestJS API server handling backend operations and orchestration.

## Shared Packages

### @poolmind/shared-types

Common TypeScript types and Zod schemas used across applications.

### @poolmind/shared-utils

Utility functions for validation, formatting, and common operations.
