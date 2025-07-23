# LinguaQL Developer Guide

## Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable version)
- **PostgreSQL** (for testing database connections)
- **Git** for version control

## Development Setup

1. **Clone and setup**

   ```bash
   git clone https://github.com/zhy0216/linguaql.git
   cd linguaql
   npm install
   ```

2. **Install Rust dependencies**

   ```bash
   cargo install tauri-cli
   ```

3. **Development server**

   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## Architecture

**Frontend (React + TypeScript)**

- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS
- **SQL Editor**: CodeMirror with SQL syntax highlighting
- **Internationalization**: i18next (English/Chinese)
- **UI Components**: Custom components with modern design

**Backend (Rust + Tauri)**

- **Database**: PostgreSQL connectivity via `tokio-postgres`
- **Connection Management**: Global connection pool with window-based isolation
- **Security**: Native API with secure IPC communication
- **Cross-platform**: Windows, macOS, Linux support

**AI Integration**

- **APIs**: OpenAI-compatible endpoints (OpenAI, OpenRouter)
- **Features**: Natural language to SQL, query explanation, optimization
- **Configuration**: User-configurable API keys and models

## Key Components

- **`src/stores/`**: Zustand stores for state management
  - `serverConfigStore.ts`: Database server configurations
  - `querySessionStore.ts`: Query sessions per server
  - `settingsStore.ts`: Application settings and AI config

- **`src/services/`**: Core business logic
  - `DBService.ts`: Database operations and connection management
  - `AIService.ts`: AI-powered query generation and explanation

- **`src/pages/`**: Main application pages
  - `DatabaseConnection.tsx`: Server management interface
  - `Query.tsx`: Main query interface with AI integration
  - `Settings.tsx`: Configuration and security settings

- **`src-tauri/`**: Rust backend
  - Database connection handling
  - Secure native API endpoints
  - Cross-platform window management

## Development Tips

- **Hot Reload**: Frontend changes auto-reload, Rust changes require restart
- **Debugging**: Use browser DevTools for frontend, `println!` for Rust backend
- **Database Testing**: Set up local PostgreSQL for development
- **AI Testing**: Configure OpenRouter API key for development (free tier available)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Project Structure

```
linguaql/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   ├── pages/             # Main application pages
│   ├── services/          # Business logic services
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript type definitions
│   └── i18n/              # Internationalization files
├── src-tauri/             # Rust backend source
│   ├── src/               # Rust source files
│   └── Cargo.toml         # Rust dependencies
├── docs/                  # Documentation
└── screenshots/           # Application screenshots
```

## Deployment

### Development Build

```bash
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

The built application will be available in `src-tauri/target/release/bundle/`.

## Troubleshooting

### Common Issues

1. **Rust compilation errors**: Ensure you have the latest stable Rust version
2. **Node.js version issues**: Use Node.js v18 or higher
3. **Database connection failures**: Check PostgreSQL server is running and accessible
4. **AI API errors**: Verify API keys are correctly configured in settings

### Getting Help

- Check the [Issues](https://github.com/zhy0216/linguaql/issues) page
- Join our community discussions
- Read the [FAQ](docs/faq.md) for common questions
