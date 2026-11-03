# Build from the repository root: docker build -f backend/Dockerfile .
FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app/backend

FROM base AS dependencies
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --no-audit --no-fund
RUN npx --no-install prisma generate

# Tools are kept in this separate image, not in the API runtime.
FROM dependencies AS migration
COPY fixtures/seed-data.json /app/fixtures/seed-data.json
USER node
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node prisma/seed.js"]

FROM base AS production-dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-dependencies /app/backend/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY backend/package.json ./package.json
COPY backend/src ./src
RUN mkdir -p storage && chown node:node storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
