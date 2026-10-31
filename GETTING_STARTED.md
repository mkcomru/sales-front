# Getting Started Guide

Welcome to the sales-front project! This guide will help you set up the project and understand the codebase structure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Environment Configuration](#environment-configuration)
4. [Development Workflow](#development-workflow)
5. [Project Structure](#project-structure)
6. [Key Concepts](#key-concepts)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Useful Resources](#useful-resources)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js) or **yarn**
- **Git**
- A code editor (VS Code recommended)
- Basic knowledge of:
  - React
  - TypeScript
  - REST APIs

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sales-front
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local  # If .env.example exists
# Or create manually:
touch .env.local
```

Add the following to `.env.local`:

```env
# Service API Key (default for development)
VITE_SERVICE_API_KEY=1251431351

# API Base URL (leave empty to use Vite proxy in development)
VITE_API_BASE_URL=

# Optional: Logging configuration
# VITE_LOG_LEVEL=debug
# VITE_ENABLE_LOGGING=true
```

**Note**: `.env.local` is gitignored and won't be committed.

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

---

## Environment Configuration

### Required Variables

**None** - All variables have defaults for development.

### Optional Variables

- `VITE_SERVICE_API_KEY`: Service authentication key (default: `1251431351`)
- `VITE_API_BASE_URL`: Backend API URL (empty = uses Vite proxy)
- `VITE_LOG_LEVEL`: Logging level (`debug` | `info` | `warn` | `error` | `silent`)
- `VITE_ENABLE_LOGGING`: Enable/disable logging (`true` | `false`)

**See `ENV_SETUP.md` for detailed documentation.**

---

## Development Workflow

### Running the App

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

The project uses TypeScript for type safety. Ensure your code:
- Has no TypeScript errors
- Follows the patterns documented in `.cursor/rules/react-typescript.mdc`
- Uses the logger utility instead of `console.log`

### Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Commit with clear messages
4. Push and create a pull request

---

## Project Structure

```
sales-front/
├── components/          # React components
│   └── workspace/      # Workspace-specific components
├── config/             # Configuration modules
│   └── env.ts          # Environment variable configuration
├── contexts/           # React Context providers
│   └── WorkspaceContext.tsx
├── hooks/              # Custom React hooks
│   ├── useWorkspace.ts
│   ├── useThreads.ts
│   ├── useMessages.ts
│   ├── usePolling.ts
│   ├── useToast.ts
│   └── useRetry.ts
├── services/           # API service layer
│   ├── api/
│   │   ├── client.ts   # Axios instance
│   │   └── endpoints.ts # API endpoints
│   ├── auth.ts
│   ├── companies.ts
│   ├── customers.ts
│   ├── products.ts
│   └── threads.ts
├── shared/             # Shared utilities
│   └── constants/      # Constants and mock data
├── types/              # TypeScript type definitions
│   ├── api.ts
│   ├── errors.ts
│   └── connectors.ts
├── utils/              # Utility functions
│   ├── errors.ts       # Error handling utilities
│   ├── logger.ts       # Logging utility
│   └── typeGuards.ts   # Type guard functions
└── docs/               # Documentation
    ├── ARCHITECTURE.md
    ├── LOGGING.md
    └── VITE_ENV_EXPLAINED.md
```

---

## Key Concepts

### 1. State Management

**Pattern**: Context API + useReducer

- Global state lives in `contexts/WorkspaceContext.tsx`
- Access via `useWorkspace()` hook
- Actions dispatched through reducer

**Example**:
```typescript
import { useWorkspace } from '../hooks/useWorkspace';

const { state, dispatch, setSelectedChatId } = useWorkspace();
// state.threads, state.selectedChatId, etc.
```

**See `docs/ARCHITECTURE.md` for details.**

### 2. API Layer

**Pattern**: Service layer with typed methods

- All API calls go through `services/` modules
- Endpoints centralized in `services/api/endpoints.ts`
- Error handling via custom error classes

**Example**:
```typescript
import { threadsService } from '../services';

const threads = await threadsService.getThreads(companyId);
```

**Never make direct `fetch()` or `axios()` calls in components.**

### 3. Error Handling

**Pattern**: Custom error classes + Toast notifications

- Custom errors in `utils/errors.ts`
- Toast notifications via `useToast()` hook
- Error boundary catches React errors

**Example**:
```typescript
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';

const toast = useToast();

try {
  await operation();
  toast.success('Success!');
} catch (error) {
  logger.error('Operation failed', error);
  toast.error('Operation failed');
}
```

### 4. Logging

**Pattern**: Logger utility (never `console.log`)

- Use `logger` from `utils/logger.ts`
- Configurable via env vars
- Hot-swappable at runtime

**Example**:
```typescript
import { logger } from '../utils/logger';

logger.debug('Debug info', { context: 'value' });
logger.info('Info message');
logger.warn('Warning');
logger.error('Error', error, { context });
```

**See `docs/LOGGING.md` for details.**

### 5. Type Safety

**Pattern**: No `any` types, use type guards

- All types defined in `types/` directory
- Use `unknown` for untyped data
- Type guards in `utils/typeGuards.ts`

**Example**:
```typescript
import { isApiErrorResponse } from '../utils/typeGuards';

if (isApiErrorResponse(error)) {
  // TypeScript knows error is ApiErrorResponse
  console.log(error.detail);
}
```

---

## Common Tasks

### Adding a New API Endpoint

1. Add endpoint to `services/api/endpoints.ts`:
```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  NEW_FEATURE: {
    BASE: '/api/v1/new-feature',
    BY_ID: (id: number) => `/api/v1/new-feature/${id}`,
  },
};
```

2. Create service method in appropriate service file:
```typescript
// services/newFeature.ts
import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { handleApiError } from '../utils/errors';

export const newFeatureService = {
  getItems: async (): Promise<Item[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NEW_FEATURE.BASE);
      return response.data.items || [];
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
```

3. Export from `services/index.ts`:
```typescript
export * from './newFeature';
```

### Adding a New Component

1. Create component file in `components/`:
```typescript
// components/NewComponent.tsx
import React from 'react';
import { logger } from '../utils/logger';

interface NewComponentProps {
  // Props interface
}

export const NewComponent: React.FC<NewComponentProps> = ({ prop1 }) => {
  logger.debug('NewComponent rendered');
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

2. Use memoization if component receives stable props:
```typescript
export const NewComponent = React.memo<NewComponentProps>(({ prop1 }) => {
  // ...
});
```

### Adding State to Global Context

1. Add state property to `WorkspaceState` in `contexts/WorkspaceContext.tsx`:
```typescript
interface WorkspaceState {
  // ... existing state
  newProperty: string;
}
```

2. Add action type:
```typescript
type WorkspaceAction =
  // ... existing actions
  | { type: 'SET_NEW_PROPERTY'; payload: string };
```

3. Handle action in reducer:
```typescript
case 'SET_NEW_PROPERTY':
  return { ...state, newProperty: action.payload };
```

4. Add convenience method in `useWorkspace` hook if needed.

### Adding a Custom Hook

1. Create hook file in `hooks/`:
```typescript
// hooks/useNewFeature.ts
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export function useNewFeature() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    logger.debug('useNewFeature initialized');
    // Hook logic
  }, []);
  
  return { data };
}
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or change port in vite.config.ts
```

### TypeScript Errors

1. Check `tsconfig.json` configuration
2. Ensure types are properly imported
3. Run `npm run build` to see all errors
4. Check `vite-env.d.ts` for environment variable types

### API Calls Not Working

1. Check `.env.local` has correct `VITE_SERVICE_API_KEY`
2. Verify `VITE_API_BASE_URL` (empty = uses proxy)
3. Check browser console for CORS errors
4. Verify backend is running and accessible

### Logging Not Working

1. Check `VITE_ENABLE_LOGGING` is set to `'true'`
2. Check `VITE_LOG_LEVEL` is appropriate
3. Verify you're using `logger` utility, not `console.log`
4. Check browser console for errors

### State Not Updating

1. Verify you're using `dispatch` from `useWorkspace()`
2. Check action type matches reducer case
3. Ensure state updates return new objects (no mutations)
4. Check React DevTools for state changes

---

## Useful Resources

### Documentation Files

- **`docs/ARCHITECTURE.md`** - Architecture overview and patterns
- **`docs/LOGGING.md`** - Logging guide and best practices
- **`ENV_SETUP.md`** - Environment variable documentation
- **`docs/VITE_ENV_EXPLAINED.md`** - How Vite environment works
- **`REFACTOR_PLAN.md`** - Refactoring history and decisions

### Code Style Guides

- **`.cursor/rules/react-typescript.mdc`** - Cursor rules and patterns
- Follow patterns documented in architecture docs

### External Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vite.dev/)
- [React Router Documentation](https://reactrouter.com/)

---

## Quick Reference

### Common Imports

```typescript
// State management
import { useWorkspace } from '../hooks/useWorkspace';

// API calls
import { threadsService, companiesService } from '../services';

// Error handling
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { handleApiError } from '../utils/errors';

// Types
import { ChatSession, Message } from '../types';
import { ApiThread, ApiMessage } from '../types/api';

// Configuration
import { API_BASE_URL, IS_DEVELOPMENT } from '../config/env';
```

### Common Patterns

```typescript
// Component with state and API call
const MyComponent = () => {
  const { state } = useWorkspace();
  const toast = useToast();
  
  const handleAction = async () => {
    try {
      const result = await someService.getData();
      toast.success('Success');
    } catch (error) {
      logger.error('Failed', error);
      toast.error('Failed');
    }
  };
  
  return <div>...</div>;
};
```

---

## Next Steps

1. **Read the Architecture Docs**: Start with `docs/ARCHITECTURE.md`
2. **Explore the Codebase**: Look at existing components and services
3. **Set Up Your Environment**: Configure `.env.local` for your needs
4. **Start Small**: Make a small change to understand the workflow
5. **Ask Questions**: Don't hesitate to ask if something is unclear

---

## Support

If you encounter issues or have questions:

1. Check the documentation files in `docs/`
2. Review the refactoring plan in `REFACTOR_PLAN.md` for context
3. Check existing code for examples
4. Review `.cursor/rules/react-typescript.mdc` for patterns

Good luck! 🚀
