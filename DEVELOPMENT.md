# Development Guide

This guide covers setting up and developing the private Nodash infrastructure.

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for local databases)
- Git

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nodash-ai/nodash-dev.git
   cd nodash-dev
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build all packages**:
   ```bash
   npm run build
   ```

## Development

### Analytics Server

The analytics server handles event collection and processing:

```bash
cd packages/nodash-analytics-server
npm run dev
```

Server will start on `http://localhost:3001`

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nodash
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key

# External Services
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
```

## Testing

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/nodash-analytics-server
npm test
```

## Deployment

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

## Architecture

- **Analytics Server**: Event ingestion and processing
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for session and query caching
- **Monitoring**: Structured logging and metrics

## Security

- All API endpoints require authentication
- Data is encrypted at rest
- Rate limiting is enforced
- Input validation on all endpoints 