# Single-container build for Cloud Run: builds the Vite frontend and serves it
# from the Node backend, which also proxies Vertex AI calls.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm ci
COPY . .
RUN npm run build --prefix frontend && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

# Cloud Run sets PORT; listen on all interfaces inside the container.
# GOOGLE_CLOUD_PROJECT must be provided at deploy time (--set-env-vars).
ENV API_BACKEND_HOST=0.0.0.0 \
    API_PAYLOAD_MAX_SIZE=7mb \
    GOOGLE_CLOUD_LOCATION=global \
    FRONTEND_DIST=/app/frontend/dist \
    PROXY_HEADER=hHz9LjnLs_-9J8UB7pmMnb5ZkBpnjQdZ
CMD ["sh", "-c", "API_BACKEND_PORT=${PORT:-8080} node backend/server.js"]
