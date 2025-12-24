# =============================================================================
# Thero AI - Indexing Service
# =============================================================================
# Document processing, embedding generation, and Kafka consumer.
#
# Build:  docker build -f docker/services/indexing/Dockerfile -t thero-indexing .
# Size:   ~2.5GB (includes ML models + LibreOffice)
# =============================================================================

FROM python:3.10-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    NLTK_DATA=/app/.cache/nltk

# Install system dependencies (includes document processing tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg ca-certificates wget git \
    build-essential gcc g++ make cmake \
    iputils-ping dnsutils \
    librocksdb-dev libgflags-dev libsnappy-dev zlib1g-dev \
    libbz2-dev liblz4-dev libzstd-dev libssl-dev \
    libspatialindex-dev libpq5 \
    # Document processing
    libreoffice \
    ocrmypdf tesseract-ocr ghostscript unpaper qpdf \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies Stage
# -----------------------------------------------------------------------------
FROM base AS dependencies

# Copy requirements and libs
COPY services/python/requirements/base.txt /app/requirements/base.txt
COPY services/python/requirements/indexing.txt /app/requirements/indexing.txt
COPY services/python/libs/ /app/libs/

# Install only indexing-specific dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /app/requirements/indexing.txt

# Download NLTK/spaCy models (required for text processing)
RUN python3 -m nltk.downloader -d /app/.cache/nltk punkt punkt_tab && \
    python3 -m spacy download en_core_web_sm

# NOTE: HuggingFace embedding models are NOT pre-downloaded because:
# - External embedding providers (OpenAI, etc.) are typically configured
# - Models are downloaded on-demand at runtime if needed
# - This saves ~3GB image size and ~3min build time
#
# To pre-download models, uncomment below:
# RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; \
#     HuggingFaceEmbeddings(model_name='BAAI/bge-large-en-v1.5')"

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM dependencies AS production

# Copy application code
COPY services/python/app/ /app/app/

ENV PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8091/health || exit 1

EXPOSE 8091

CMD ["python", "-m", "uvicorn", "app.indexing_main:app", "--host", "0.0.0.0", "--port", "8091"]

