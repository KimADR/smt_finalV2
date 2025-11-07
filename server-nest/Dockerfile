
# Builder stage: install deps and build
FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy only lockfile and package manifest and install
COPY package.json pnpm-lock.yaml ./
# allow pnpm to update the lockfile in the builder if package.json changed
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .
# Generate Prisma client before building so TypeScript can find @prisma/client types
RUN pnpm prisma generate && pnpm build

# Runner stage: smaller production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nestjs

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/prisma ./prisma

# Install dependencies and generate Prisma client
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm prisma generate && \
    rm -f pnpm-lock.yaml

EXPOSE 3333

ENV PORT 3333
ENV HOSTNAME "0.0.0.0"

CMD ["node", "dist/main"]