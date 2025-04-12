# 🚀 Express TypeScript Boilerplate 2024

[![Build Express Application](https://github.com/edwinhern/express-typescript-2024/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/build.yml)
[![CodeQL](https://github.com/edwinhern/express-typescript-2024/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/codeql.yml)
[![Docker Image CI](https://github.com/edwinhern/express-typescript-2024/actions/workflows/docker-image.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/docker-image.yml)
[![Release](https://github.com/edwinhern/express-typescript-2024/actions/workflows/release.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/release.yml)

## 🌟 Introduction

Welcome to the Express TypeScript Boilerplate 2024 – a streamlined, efficient, and scalable foundation for building powerful backend services. This boilerplate merges modern tools and practices in Express.js and TypeScript, enhancing productivity, code quality, and performance.

## 💡 Motivation and Intentions

Developed to streamline backend development, this boilerplate is your solution for:

- ✨ Reducing setup time for new projects.
- 📊 Ensuring code consistency and quality.
- ⚡ Facilitating rapid development with cutting-edge tools.
- 🛡️ Encouraging best practices in security, testing, and performance.

## 🚀 Features

- 📁 Modular Structure: Organized by feature for easy navigation and scalability.
- 💨 Faster Execution with tsx: Rapid TypeScript execution with esbuild, complemented by tsc for type checking.
- 🌐 Stable Node Environment: Latest LTS Node version in .nvmrc.
- 🔧 Simplified Environment Variables with Envalid: Centralized and easy-to-manage configuration.
- 🔗 Path Aliases: Cleaner code with shortcut imports.
- 🔄 Dependabot Integration: Automatic updates for secure and up-to-date dependencies.
- 🔒 Security: Helmet for HTTP header security and CORS setup.
- 📊 Logging: Efficient logging with pino-http.
- 🧪 Comprehensive Testing: Robust setup with Vitest and Supertest.
- 🔑 Code Quality Assurance: Husky and lint-staged for consistent quality.
- ✅ Unified Code Style: ESLint and Prettier for a consistent coding standard.
- 📃 API Response Standardization: ServiceResponse class for consistent API responses.
- 🐳 Docker Support: Ready for containerization and deployment.
- 📝 Input Validation with Zod: Strongly typed request validation using Zod.
- 🧩 API Spec Generation: Automated OpenAPI specification generation from Zod schemas to ensure up-to-date and accurate API documentation.

## 🛠️ Getting Started

### Step 1: 🚀 Initial Setup

- Clone the repository: `git clone https://github.com/edwinhern/express-typescript-2024.git`
- Navigate: `cd express-typescript-2024`
- Install dependencies: `npm ci`

### Step 2: ⚙️ Environment Configuration

- Create `.env`: Copy `.env.example` to `.env`
- Update `.env`: Fill in necessary environment variables

### Step 3: 🏃‍♂️ Running the Project

- Development Mode: `npm run dev`
- Building: `npm run build`
- Production Mode: Set `.env` to `NODE_ENV="production"` then `npm run build && npm run start`

## 📁 Project Structure

```
.
├── api
│   ├── healthCheck
│   │   ├── __tests__
│   │   │   └── healthCheckRouter.test.ts
│   │   └── healthCheckRouter.ts
│   └── user
│       ├── __tests__
│       │   ├── userRouter.test.ts
│       │   └── userService.test.ts
│       ├── userModel.ts
│       ├── userRepository.ts
│       ├── userRouter.ts
│       └── userService.ts
├── api-docs
│   ├── __tests__
│   │   └── openAPIRouter.test.ts
│   ├── openAPIDocumentGenerator.ts
│   ├── openAPIResponseBuilders.ts
│   └── openAPIRouter.ts
├── common
│   ├── __tests__
│   │   ├── errorHandler.test.ts
│   │   └── requestLogger.test.ts
│   ├── middleware
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── requestLogger.ts
│   ├── models
│   │   └── serviceResponse.ts
│   └── utils
│       ├── commonValidation.ts
│       ├── envConfig.ts
│       └── httpHandlers.ts
├── index.ts
└── server.ts

```

## 🤝 Feedback and Contributions

We'd love to hear your feedback and suggestions for further improvements. Feel free to contribute and join us in making backend development cleaner and faster!

🎉 Happy coding!

## Docker Setup

This project includes Docker configuration for both development and production environments.

### Development

To start the development environment:

```bash
# Start the development environment
npm run docker:dev

# Rebuild and start the development environment
npm run docker:dev:build
```

### Production

To start the production environment:

```bash
# Start the production environment
npm run docker:prod

# Rebuild and start the production environment
npm run docker:prod:build
```

### Other Docker Commands

```bash
# Stop all containers
npm run docker:down

# View logs
npm run docker:logs
```

### Environment Variables

You can customize the Docker setup by setting the following environment variables:

- `NODE_ENV`: The environment (development or production)
- `PORT`: The port to expose the application on (default: 8080)
- `DB_PORT`: The port to expose the database on (default: 3306)
- `LOCAL_DB_USERNAME`: The database username (default: root)
- `LOCAL_DB_PASSWORD`: The database password (default: password)
- `LOCAL_DB_NAME`: The database name (default: nextdeal)

## Git Hooks with Husky

This project uses Husky to manage Git hooks for code quality and consistency.

### Pre-commit Hook

The pre-commit hook runs lint-staged, which:

- Formats code using Prettier
- Fixes linting issues using ESLint

### Commit Message Hook

The commit-msg hook enforces commit message conventions using commitlint.

### Commit Message Format

Follow the conventional commit format:

```
type(scope): subject

body

footer
```

Where:

- `type`: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- `scope`: optional scope of the commit (e.g., auth, api)
- `subject`: short description of the change
- `body`: optional detailed description
- `footer`: optional footer with breaking changes or issue references

Example:

```
feat(auth): add JWT authentication

Implement JWT-based authentication with refresh tokens.
Add middleware to protect routes.

Closes #123
```
