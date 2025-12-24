# =============================================================================
# Thero AI - Docling Service
# =============================================================================
# Document processing service using local Docling and OCRmyPDF.
# Uses PyMuPDF for digital PDFs, OCRmyPDF for scanned PDFs.
#
# Build:  docker build -f docker/services/docling/Dockerfile -t thero-docling .
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
    curl gnupg ca-certificates \
    # Image processing dependencies
    libgl1 libglib2.0-0 \
    # PDF processing
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies Stage
# -----------------------------------------------------------------------------
FROM base AS dependencies

# Copy requirements and libs
COPY services/python/requirements/base.txt /app/requirements/base.txt
COPY services/python/libs/ /app/libs/
COPY services/python/pyproject.toml /app/pyproject.toml

# Install dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /app/requirements/base.txt

# Install PyMuPDF for digital PDF processing
RUN pip install PyMuPDF==1.24.14

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM dependencies AS production

# Copy application code
COPY services/python/app/ /app/app/

# Install the package
RUN pip install -e .

ENV PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

EXPOSE 8081

CMD ["python", "-m", "uvicorn", "app.docling_main:app", "--host", "0.0.0.0", "--port", "8081"]

