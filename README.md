# Nodash Dev

Private development infrastructure for the Nodash Analytics Platform.

## 🏗️ Architecture

This repository contains the private server components that power the Nodash analytics platform. These servers handle data collection, processing, and provide APIs for the public SDK.

## 📦 Packages

### [nodash-analytics-server](packages/nodash-analytics-server)
Core analytics data collection and processing server.

- Event ingestion and validation
- Real-time data processing
- Data storage and retrieval
- API endpoints for dashboard and SDK

## 🚀 Development

### Prerequisites

- Node.js 18+
- TypeScript
- Docker (for local development)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/nodash-ai/nodash-dev.git
cd nodash-dev

# Install dependencies
npm install

# Build all packages
npm run build

# Start development servers
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nodash

# Redis
REDIS_URL=redis://localhost:6379

# API Keys
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# External Services
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
```

## 🔧 Configuration

### Production Deployment

Servers are deployed using Docker containers with environment-specific configurations:

- **Staging**: `staging.nodash.ai`
- **Production**: `api.nodash.ai`

### Monitoring

- **Logs**: Centralized logging with structured JSON
- **Metrics**: Prometheus metrics collection
- **Alerts**: PagerDuty integration for critical issues
- **Health Checks**: Kubernetes readiness and liveness probes

## 🔒 Security

- **Authentication**: JWT-based API authentication
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: AES-256 encryption for sensitive data
- **Rate Limiting**: Redis-based rate limiting
- **Input Validation**: Comprehensive request validation

## 📊 Scaling

### Database
- **Primary**: PostgreSQL with read replicas
- **Cache**: Redis for session and query caching
- **Search**: Elasticsearch for analytics queries

### Infrastructure
- **Containers**: Docker with Kubernetes orchestration
- **Load Balancing**: NGINX with auto-scaling
- **CDN**: CloudFlare for global edge caching

## 🧪 Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

## 📚 Documentation

- **API Documentation**: [docs/api.md](docs/api.md)
- **Database Schema**: [docs/schema.md](docs/schema.md)
- **Deployment Guide**: [docs/deployment.md](docs/deployment.md)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Update documentation
5. Submit a pull request

## 📄 License

Proprietary - All rights reserved to Nodash AI Inc. 