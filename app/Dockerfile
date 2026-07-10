# Multi-stage Dockerfile for MERN application
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY app/frontend/package*.json ./
RUN npm ci
COPY app/frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY app/backend/package*.json ./
RUN npm ci --only=production
COPY app/backend/ ./

# Stage 3: Production image with Nginx serving frontend and proxying API
FROM nginx:1.25-alpine

# Install Node.js for backend runtime
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy backend
COPY --from=backend-build /app/backend ./backend

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copy Nginx config
COPY app/nginx/default.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 8080

# Start backend and nginx
CMD ["sh", "-c", "cd /app/backend && node server.js & nginx -g 'daemon off;'"]