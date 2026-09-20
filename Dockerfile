# ===================================================
# Multi-Stage Production Dockerfile for Ticket Audit Agent
# ===================================================

# --- Stage 1: Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for Vite/esbuild)
RUN npm ci

# Copy source code and configuration
COPY . .

# Build frontend and compile Node server
RUN npm run build

# --- Stage 2: Production Runtime Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mandatory_metrics_config.json* ./

# Expose standard application port
EXPOSE 3000

# Healthcheck to ensure background services are responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/servicenow/credentials || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]
