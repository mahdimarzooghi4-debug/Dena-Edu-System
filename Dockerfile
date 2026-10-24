FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Keep Drizzle CLI and migration files out of the web runtime image.
FROM dependencies AS migrator
WORKDIR /app
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db ./src/db
COPY src/domain/access ./src/domain/access
CMD ["npm", "run", "db:migrate"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/scripts/livekit-quota-worker.mjs ./scripts/livekit-quota-worker.mjs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
