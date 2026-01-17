# Parallel Claude

A native macOS desktop application for running multiple Claude AI sessions in parallel with integrated terminal, browser preview, and git management.

<br>

## Features

- **Multi-Session Management** - Run multiple Claude AI sessions simultaneously in separate tabs
- **Integrated Terminal** - Full-featured terminal emulator with xterm.js for each session
- **Browser Preview** - Built-in browser preview per session for web development
- **Git Integration** - Real-time git status, diff viewing, and commit functionality
- **Session Settings** - Configure session names, preview ports, and working directories
- **Transparent UI** - Native macOS design with backdrop blur effects
- **Session Persistence** - Sessions and their state are saved and restored across app launches

<br>

## Prerequisites

- **Node.js** >= 14.x
- **npm** >= 7.x or **bun**
- **Claude CLI** - Install from [claude.ai](https://claude.ai)
  ```bash
  # Verify Claude CLI is installed
  claude --version
  ```

<br>

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/parallel-claude.git
cd parallel-claude
npm install
# or
bun install
```

<br>

## Development

Start the app in development mode with hot-reload:

```bash
npm start
```

The app will automatically:
- Start webpack dev server
- Launch Electron
- Enable React Fast Refresh
- Watch for file changes

<br>

## Building for Production

### Package for macOS

Build the app for your local platform:

```bash
npm run package
```

This creates a distributable `.app` file in `release/build/`:
- `Parallel Claude.app` - Application bundle
- `Parallel Claude-{version}-arm64.dmg` - DMG for Apple Silicon
- `Parallel Claude-{version}-x64.dmg` - DMG for Intel Macs
- `Parallel Claude-{version}-universal.dmg` - Universal DMG

### First Launch

Since the app is not notarized, macOS will show a security warning on first launch:
1. Right-click the app → "Open"
2. Or go to System Preferences → Security & Privacy → "Open Anyway"

<br>

## Project Structure

```
parallel-claude/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── main.ts           # Main entry point
│   │   ├── services/         # Backend services
│   │   │   ├── session.ts    # Session management
│   │   │   ├── git.ts        # Git operations
│   │   │   └── storage.ts    # Data persistence
│   │   └── ipc/              # IPC handlers
│   │       ├── sessionHandlers.ts
│   │       └── repositoryHandlers.ts
│   │
│   └── renderer/              # React app
│       ├── components/
│       │   ├── dashboard/    # Main dashboard
│       │   └── workstation/  # Session workspace
│       │       ├── terminal/ # Terminal component
│       │       ├── sidebar/  # Session sidebar
│       │       └── git-sidebar/ # Git integration
│       ├── stores/           # Zustand state management
│       └── types/            # TypeScript types
│
├── assets/                    # Icons and resources
└── release/                   # Build output
```

<br>

## Key Technologies

- **Electron** - Cross-platform desktop app framework
- **React 19** - UI framework
- **TypeScript** - Type safety
- **xterm.js** - Terminal emulator
- **node-pty** - Pseudo-terminal for shells
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI components
- **node-git** - Git integration
- **Webpack** - Module bundler

<br>

## Usage

### Creating a Session

1. Click "Add Folder" on the dashboard
2. Select a project directory
3. Sessions are automatically created with Claude CLI

### Managing Sessions

- **Switch Sessions**: Click session tabs in the sidebar
- **Rename Session**: Right-click session → Rename
- **Session Settings**: Click gear icon in topbar
  - Configure session name
  - Set default preview port
  - View working directory

### Terminal

- Full terminal emulator with shell profile sourcing
- Supports all standard terminal features
- Auto-runs `claude` command on session start

### Browser Preview

- Toggle between Terminal/Preview tabs
- Independent preview per session
- Configurable preview port per session
- URLs persist across sessions

### Git Integration

- Real-time git status display
- View file diffs
- Stage/unstage files
- Commit changes
- Toggle git sidebar with button in topbar

<br>

## Configuration

### Session Data Location

Sessions are stored in:
```
~/ParallelClaude/components/branches/session-{id}/
```

### Application Data

Application data is stored in:
```
~/Library/Application Support/parallel-claude/
```

<br>

## Troubleshooting

### Claude CLI Not Found

If Claude command is not found in the built app, ensure:
1. Claude CLI is installed and in your PATH
2. Your shell profile (`.zshrc`, `.bashrc`) is properly configured
3. Try restarting the app after installing Claude CLI

### Terminal Issues

If terminal doesn't work properly:
1. Check that node-pty is properly rebuilt:
   ```bash
   npm run rebuild-node-pty
   ```
2. Verify shell exists: `echo $SHELL`

### Build Issues

If you encounter build errors:
1. Clear cache and rebuild:
   ```bash
   rm -rf node_modules release
   npm install
   npm run build
   ```

<br>

## Development Commands

```bash
# Start development
npm start

# Build for production
npm run build

# Package app
npm run package

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Rebuild native modules
npm run rebuild

# Rebuild node-pty specifically
npm run rebuild-node-pty
```

<br>

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

<br>

## License

MIT © Parallel Claude

<br>

## Acknowledgments

Built with [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)
