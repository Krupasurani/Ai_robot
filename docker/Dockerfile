# syntax=docker/dockerfile:1.4
# =============================================================================
# Thero AI - Main Application Image
# =============================================================================
# Multi-stage build for optimized image size and build caching.
#
# Build:  DOCKER_BUILDKIT=1 docker build -f docker/Dockerfile -t thero-ai .
# Usage:  docker compose -f docker/compose.yml up
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base - System dependencies
# -----------------------------------------------------------------------------
FROM python:3.10-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials (needed for Rust/Python native extensions)
    curl gnupg ca-certificates wget git \
    build-essential gcc g++ make cmake \
    # Network debugging tools
    iputils-ping dnsutils \
    # RocksDB dependencies
    librocksdb-dev libgflags-dev libsnappy-dev zlib1g-dev \
    libbz2-dev liblz4-dev libzstd-dev libssl-dev \
    # Other runtime libs
    libspatialindex-dev libpq5 \
    # Document processing
    libreoffice \
    ocrmypdf tesseract-ocr ghostscript unpaper qpdf \
    # Node.js 20.x
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# -----------------------------------------------------------------------------
# Stage 2: Python dependencies
# -----------------------------------------------------------------------------
FROM base AS python-deps

WORKDIR /app/python

COPY ./services/python/pyproject.toml ./

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    pip install -e .

# -----------------------------------------------------------------------------
# Stage 3: ML Models (cached - rarely changes)
# -----------------------------------------------------------------------------
FROM python-deps AS ml-models

ENV HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    NLTK_DATA=/app/.cache/nltk

# Download NLTK and spaCy models
RUN python3 -m nltk.downloader -d /app/.cache/nltk punkt punkt_tab && \
    python3 -m spacy download en_core_web_sm

# Pre-download ML models
RUN --mount=type=cache,target=/app/.cache/huggingface \
    python -c "from langchain_huggingface import HuggingFaceEmbeddings; \
    HuggingFaceEmbeddings(model_name='BAAI/bge-large-en-v1.5')" && \
    python -c "from langchain_qdrant import FastEmbedSparse; \
    FastEmbedSparse(model_name='Qdrant/BM25')" && \
    python -c "from sentence_transformers import CrossEncoder; \
    CrossEncoder(model_name='BAAI/bge-reranker-base')"

# -----------------------------------------------------------------------------
# Stage 4: Node.js Backend Builder
# -----------------------------------------------------------------------------
FROM base AS backend-builder

WORKDIR /app/backend

COPY services/nodejs/apps/package*.json ./
COPY services/nodejs/apps/tsconfig.json ./

# Use npm install instead of npm ci for better compatibility with outdated lock files
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --legacy-peer-deps

COPY services/nodejs/apps/src ./src
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 5: Frontend Builder
# -----------------------------------------------------------------------------
FROM base AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
COPY frontend/packages ./packages/

RUN --mount=type=cache,target=/root/.npm \
    npm config set legacy-peer-deps true && \
    npm install --prefer-offline

COPY frontend/ ./
# Skip tsc check (Vite handles TypeScript), just run vite build
RUN npm exec vite build

# -----------------------------------------------------------------------------
# Stage 6: Final Runtime Image
# -----------------------------------------------------------------------------
FROM ml-models AS runtime

WORKDIR /app

# Copy Python libs
COPY services/python/libs/ /app/python/libs/

# Copy Python application code
COPY services/python/app/ /app/python/app/

# Copy built backend
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/package.json /app/backend/package.json

# Copy runtime assets (email templates, swagger docs, etc.)
COPY services/nodejs/apps/src/modules/mail/views /app/backend/src/modules/mail/views
COPY services/nodejs/apps/src/modules/storage/docs /app/backend/src/modules/storage/docs

# Copy built frontend into backend public folder
COPY --from=frontend-builder /app/frontend/dist /app/backend/dist/public

EXPOSE 3000 8000 8088 8091

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["sh", "-c", "cd /app/backend && node dist/index.js & cd /app/python && python -m app.connectors_main & cd /app/python && python -m app.indexing_main & cd /app/python && python -m app.query_main & wait"]

