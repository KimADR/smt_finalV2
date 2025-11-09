
# Builder stage: install deps and build
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Ensure OpenSSL and CA certs are available in the builder for Prisma binaries
RUN apt-get update && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy only lockfile and package manifest and install
COPY package.json pnpm-lock.yaml ./
# allow pnpm to update the lockfile in the builder if package.json changed
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .
# Generate Prisma client before building so TypeScript can find @prisma/client types
# After building, prune dev dependencies so we can copy a prod-only node_modules to the runner
RUN pnpm prisma generate && pnpm build && pnpm prune --prod

# Runner stage: smaller production image
FROM node:18-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL and postgresql-client for Prisma and health checks
RUN apt-get update && \
    apt-get install -y openssl postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Add wait-for script
COPY wait-for-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for-db.sh

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nestjs

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/prisma ./prisma

# Copy production node_modules (we pruned dev deps in the builder)
COPY --from=builder /app/node_modules ./node_modules

# Ensure OpenSSL is present in runner for Prisma native binaries (apk add may already have run above)
RUN apk add --no-cache openssl || true

EXPOSE 3333

ENV PORT 3333
ENV HOSTNAME "0.0.0.0"

# Make app folder owned by the non-root user and run as them
RUN chown -R nestjs:nodejs /app || true
USER nestjs

CMD ["node", "dist/main"]