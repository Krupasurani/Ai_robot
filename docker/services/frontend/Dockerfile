# =============================================================================
# Thero AI - Frontend Service
# =============================================================================
# Lightweight nginx container serving static React/Vite build.
#
# Build:  docker build -f docker/services/frontend/Dockerfile -t thero-frontend .
# Size:   ~50MB
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
COPY frontend/packages ./packages/

RUN npm config set legacy-peer-deps true && \
    npm ci --prefer-offline

# Copy source and build
COPY frontend/ ./
RUN npm exec vite build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Copy custom nginx config
COPY docker/services/frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]

