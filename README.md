# Sales Front

A modern React + TypeScript frontend application for sales management and customer communication.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local  # Edit with your values

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

## 📚 Documentation

- **[Getting Started Guide](./GETTING_STARTED.md)** - Complete setup and onboarding guide
- **[Architecture Documentation](./docs/ARCHITECTURE.md)** - Architecture patterns and best practices
- **[Logging Guide](./docs/LOGGING.md)** - Logging system documentation
- **[Environment Setup](./ENV_SETUP.md)** - Environment variable configuration

## 🏗️ Project Structure

```
sales-front/
├── components/      # React components
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── services/        # API service layer
├── config/          # Configuration
├── types/           # TypeScript types
├── utils/           # Utility functions
└── docs/            # Documentation
```

## 🛠️ Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons

## 📋 Key Features

- ✅ Centralized state management (Context + useReducer)
- ✅ Typed API service layer
- ✅ Comprehensive error handling
- ✅ Configurable logging system
- ✅ Performance optimizations (memoization)
- ✅ Type-safe throughout

## 🎯 Development

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 📖 Key Concepts

### State Management
- Global state via `WorkspaceContext` (Context API + useReducer)
- Access via `useWorkspace()` hook

### API Layer
- All API calls through service layer (`services/`)
- Centralized endpoints (`services/api/endpoints.ts`)
- Custom error handling

### Error Handling
- Custom error classes
- Toast notifications for user feedback
- Error boundary for React errors

### Logging
- Logger utility (never `console.log`)
- Configurable via environment variables
- Hot-swappable at runtime

## 🔧 Configuration

Environment variables (see `ENV_SETUP.md` for details):

- `VITE_SERVICE_API_KEY` - Service authentication key
- `VITE_API_BASE_URL` - Backend API URL (optional, uses proxy in dev)
- `VITE_LOG_LEVEL` - Logging level (`debug` | `info` | `warn` | `error` | `silent`)
- `VITE_ENABLE_LOGGING` - Enable/disable logging (`true` | `false`)

## 📝 Code Style

Follow the patterns documented in:
- `.cursor/rules/react-typescript.mdc` - Cursor rules and patterns
- `docs/ARCHITECTURE.md` - Architecture patterns

**Key Rules:**
- No `any` types - use `unknown` and type guards
- Use `logger` utility, never `console.log`
- All API calls through service layer
- Use Context + useReducer for global state
- Memoize components and expensive computations

## 🐛 Troubleshooting

See [Getting Started Guide](./GETTING_STARTED.md#troubleshooting) for common issues and solutions.

## 📚 Learn More

- [Getting Started Guide](./GETTING_STARTED.md) - Complete onboarding guide
- [Architecture Documentation](./docs/ARCHITECTURE.md) - Deep dive into architecture
- [Logging Guide](./docs/LOGGING.md) - Logging system details

## 🤝 Contributing

1. Read the [Getting Started Guide](./GETTING_STARTED.md)
2. Follow patterns in `.cursor/rules/react-typescript.mdc`
3. Ensure TypeScript compiles without errors
4. Use logger utility instead of console.log
5. Add types for all new code

## 📄 License

[Your License Here]
