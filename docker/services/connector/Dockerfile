# =============================================================================
# Thero AI - Connector Service
# =============================================================================
# OAuth flows, sync jobs, and entity management.
#
# Build:  docker build -f docker/services/connector/Dockerfile -t thero-connector .
# Size:   ~1GB
# =============================================================================

FROM python:3.10-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg ca-certificates wget git \
    build-essential gcc g++ make cmake \
    iputils-ping dnsutils \
    librocksdb-dev libgflags-dev libsnappy-dev zlib1g-dev \
    libbz2-dev liblz4-dev libzstd-dev libssl-dev \
    libspatialindex-dev libpq5 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies Stage
# -----------------------------------------------------------------------------
FROM base AS dependencies

# Copy requirements and libs
COPY services/python/requirements/base.txt /app/requirements/base.txt
COPY services/python/requirements/connector.txt /app/requirements/connector.txt
COPY services/python/libs/ /app/libs/

# Install only connector-specific dependencies (~3 min instead of 28 min)
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /app/requirements/connector.txt

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM dependencies AS production

# Copy application code
COPY services/python/app/ /app/app/

ENV PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8088/health || exit 1

EXPOSE 8088

CMD ["python", "-m", "uvicorn", "app.connectors_main:app", "--host", "0.0.0.0", "--port", "8088"]

