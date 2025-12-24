# =============================================================================
# Thero AI - API Gateway Service
# =============================================================================
# Node.js BFF handling authentication, routing, and API aggregation.
#
# Build:  docker build -f docker/services/api-gateway/Dockerfile -t thero-api-gateway .
# Size:   ~300MB
# =============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY services/nodejs/apps/package*.json ./
COPY services/nodejs/apps/tsconfig.json ./

# Install dependencies
RUN npm ci --prefer-offline --legacy-peer-deps

# Copy source and build
COPY services/nodejs/apps/src ./src
RUN npm run build

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy runtime assets (email templates, swagger docs)
COPY services/nodejs/apps/src/modules/mail/views ./src/modules/mail/views
COPY services/nodejs/apps/src/modules/storage/docs ./src/modules/storage/docs

# Environment
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["node", "dist/index.js"]

