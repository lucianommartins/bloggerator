# Stage 1: Build Angular app
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments from Cloud Build substitutions
ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_STORAGE_BUCKET
ARG FIREBASE_MESSAGING_SENDER_ID
ARG FIREBASE_APP_ID

# Copy package files
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy Angular config files
COPY angular.json tsconfig*.json ./

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Generate environment.ts from build args
RUN echo "export const environment = { \
  production: true, \
  firebase: { \
    apiKey: '${FIREBASE_API_KEY}', \
    authDomain: '${FIREBASE_AUTH_DOMAIN}', \
    projectId: '${FIREBASE_PROJECT_ID}', \
    storageBucket: '${FIREBASE_STORAGE_BUCKET}', \
    messagingSenderId: '${FIREBASE_MESSAGING_SENDER_ID}', \
    appId: '${FIREBASE_APP_ID}' \
  } \
};" > ./src/environments/environment.ts

# Build Angular app for production
RUN npm run build

# Stage 2: Nginx to serve static files
FROM nginx:alpine AS production

# Copy custom nginx config
COPY deploy/cloudrun/nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from builder stage
COPY --from=builder /app/dist/bloggerator-app/browser /usr/share/nginx/html

# Cloud Run sets PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
