# =============================================================================
# Thero AI - Python Base Image
# =============================================================================
# Shared base image for all Python services with common dependencies.
# Individual services extend this with their specific requirements.
#
# Build:  docker build -f docker/services/python-base/Dockerfile -t thero-python-base .
# =============================================================================

FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials
    curl gnupg ca-certificates wget git \
    build-essential gcc g++ make cmake \
    # Network tools
    iputils-ping dnsutils \
    # RocksDB dependencies
    librocksdb-dev libgflags-dev libsnappy-dev zlib1g-dev \
    libbz2-dev liblz4-dev libzstd-dev libssl-dev \
    # Other runtime libs
    libspatialindex-dev libpq5 \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy shared libs
COPY services/python/libs/ /app/libs/

# Copy pyproject.toml for dependency installation
COPY services/python/pyproject.toml /app/

# Install base Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -e .

# Set Python path
ENV PYTHONPATH=/app

