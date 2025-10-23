# Contributing to Tauri Notice Window

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Tauri v2 development environment

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tauri-notice-window.git
cd tauri-notice-window
```

2. Install dependencies:
```bash
npm install
```

3. Build the library:
```bash
npm run build
```

4. Watch mode for development:
```bash
npm run dev
```

## Project Structure

```
src/
├── types/          # TypeScript type definitions
├── stores/         # Zustand store with zustand-sync
├── hooks/          # React hooks
├── components/     # React components
├── utils/          # Utilities (DB, window management)
├── config/         # Configuration
└── index.ts        # Main exports
```

## Making Changes

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

Before submitting:

1. Build the library: `npm run build`
2. Test in a real Tauri application
3. Verify cross-window synchronization works
4. Check that persistence works across restarts

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add tests`

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Build and test: `npm run build`
5. Commit your changes with clear messages
6. Push to your fork
7. Open a Pull Request

### PR Guidelines

- Provide a clear description of changes
- Reference related issues
- Keep PRs focused on a single feature/fix
- Update documentation if needed
- Ensure builds pass

## Areas for Contribution

### Features

- Additional hooks for common use cases
- Enhanced error handling
- Performance optimizations
- Animation support for windows
- Priority queue implementation
- Message grouping/batching

### Documentation

- More usage examples
- Video tutorials
- Migration guides
- API reference improvements

### Testing

- Unit tests
- Integration tests
- E2E tests with Tauri

### Bug Fixes

- Check the issue tracker
- Reproduce the bug
- Fix and test
- Submit PR with test case

## Questions?

- Open an issue for discussion
- Check existing issues and PRs
- Read the documentation

## Code of Conduct

- Be respectful and constructive
- Focus on technical merit
- Help others learn
- Follow best practices

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing!

