# ---------- Builder ----------
FROM node:lts-alpine AS build
WORKDIR /app

# Copy manifests first for caching
COPY package*.json ./

# Install ALL deps (dev deps required to build)
# Falls back to `npm install` if there's no lockfile
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest and build
COPY . .
RUN npm run build

# ---------- Runner ----------
FROM node:lts-alpine AS runner
WORKDIR /app

# Tiny static file server
RUN npm i -g serve

# Only ship the built assets
COPY --from=build /app/dist ./dist

EXPOSE 8000
CMD ["serve", "-s", "dist", "-l", "8000"]
