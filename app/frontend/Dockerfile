# Build stage
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# # Create non-root user
# RUN addgroup -g 1001 -S appgroup && \
#     adduser -S appuser -u 1001 -G appgroup && \
#     chown -R appuser:appgroup /app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
#     touch /var/run/nginx.pid && \
#     chown -R appuser:appgroup /var/run/nginx.pid

RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup \
    /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /etc/nginx/conf.d \
    /var/run/nginx.pid

USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]