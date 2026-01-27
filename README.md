# Web Application

Next.js 14 frontend with App Router, TypeScript, and Tailwind CSS.

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Set up Husky git hooks (required for pre-push validation)
npm run prepare

# Copy environment variables template
cp .env.example .env
# Edit .env with your actual values

# Run development server
npm run dev
```

The app will be available at http://localhost:3000

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Linting

```bash
npm run lint
npm run type-check
```

## Features

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Authentication (to be implemented with NextAuth)
- Workspace management
- Project and task management
