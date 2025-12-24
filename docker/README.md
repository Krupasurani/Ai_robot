# Thero AI - Docker Setup

This directory contains all Docker-related configuration for Thero AI using a **microservices architecture**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (nginx)                       │
│                         :3000                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Node.js)                     │
│                         :8080                               │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Query Service  │ │Indexing Service │ │Connector Service│
│     :8000       │ │     :8091       │ │     :8088       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Directory Structure

```
docker/
├── services/                    # Microservice Dockerfiles
│   ├── frontend/
│   │   ├── Dockerfile          # nginx + static files (~50MB)
│   │   └── nginx.conf
│   ├── api-gateway/
│   │   └── Dockerfile          # Node.js BFF (~300MB)
│   ├── query/
│   │   └── Dockerfile          # Python RAG/Chat (~2GB)
│   ├── indexing/
│   │   └── Dockerfile          # Python Doc Processing (~2.5GB)
│   └── connector/
│       └── Dockerfile          # Python OAuth/Sync (~1GB)
│
├── compose.infra.yml           # Infrastructure (DBs, Cache, Messaging)
├── compose.services.yml        # Application services
├── compose.dev.yml             # Development overrides (hot-reload)
├── compose.websearch.yml       # Web search add-on
│
├── Dockerfile                  # Legacy monolith (deprecated)
├── .env.example
└── config/
    └── searxng/
```

## Quick Start

### 1. Setup Environment

```bash
cp docker/.env.example docker/.env
# Edit docker/.env with your configuration
```

### 2. Start Stack

```bash
# Production mode
./start.sh -d

# Development mode (hot-reload)
./start.sh --dev -d

# Infrastructure only
./start.sh --infra -d
```

### 3. Common Commands

```bash
./start.sh --status           # Show service status
./start.sh --logs             # Follow all logs
./start.sh --logs query       # Follow specific service
./start.sh --down             # Stop all services
./start.sh --clean            # Remove volumes and restart
```

### 4. Rebuild Specific Service

```bash
./start.sh --build --service frontend   # ~30s
./start.sh --build --service api-gateway # ~2min
./start.sh --build --service query       # ~5min
```

## Stacks

### Core Stack (`compose.yml`)

Essential services for development:

| Service   | Port  | Description          |
|-----------|-------|----------------------|
| app       | 3000  | Frontend             |
| app       | 8000  | Query API            |
| app       | 8088  | Connector API        |
| app       | 8091  | Indexing API         |
| mongodb   | 27017 | Document database    |
| arango    | 8529  | Graph database       |
| qdrant    | 6333  | Vector database      |
| redis     | 6379  | Cache                |
| etcd      | 2379  | Configuration store  |
| kafka     | 9092  | Message broker       |
| zookeeper | 2181  | Kafka coordination   |

### Web Search Stack (`compose.websearch.yml`)

Add-on for web search capabilities:

| Service             | Port | Description           |
|---------------------|------|-----------------------|
| searxng             | 8085 | Meta search engine    |
| firecrawl-api       | 3002 | Web scraping API      |
| firecrawl-worker    | -    | Scraping workers      |
| postgres            | 5433 | Firecrawl database    |

### Production Stack (`compose.prod.yml`)

Uses pre-built images from registry:

```bash
IMAGE_TAG=v1.0.0 docker compose -f docker/compose.prod.yml up -d
```

## Building Images

### Main Application

```bash
DOCKER_BUILDKIT=1 docker build -f docker/Dockerfile -t thero-ai .
```

### Firecrawl

```bash
docker build -f docker/Dockerfile.firecrawl -t firecrawl-api .
```

## Environment Variables

See `docker/.env.example` for all available configuration options.

### Required for Production

- `SECRET_KEY` - Encryption key (generate with `openssl rand -hex 32`)
- `ARANGO_PASSWORD` - ArangoDB password
- `MONGO_USERNAME` / `MONGO_PASSWORD` - MongoDB credentials
- `REDIS_PASSWORD` - Redis password
- `QDRANT_API_KEY` - Qdrant API key

### Optional

- `DOCLING_URL` - External Docling service

## Networking

All stacks use the `thero-network` bridge network, allowing services to communicate by container name.

The websearch stack connects to the same network as an external network, sharing Redis and other services from the core stack.

## Volumes

Data is persisted in Docker volumes:

- `app_data` - Application data
- `app_cache` - ML models and caches
- `mongodb_data` - MongoDB data
- `arango_data` - ArangoDB data
- `qdrant_data` - Vector embeddings
- `redis_data` - Cache data
- `etcd_data` - Configuration data

To reset all data:

```bash
./start-core.sh --clean
```

## Troubleshooting

### Build fails with cache issues

```bash
DOCKER_BUILDKIT=1 docker build --no-cache -f docker/Dockerfile -t thero-ai .
```

### Services can't connect

Ensure all services are on the same network:

```bash
docker network inspect thero-network
```

### Out of disk space

Clean up unused Docker resources:

```bash
docker system prune -a --volumes
```

