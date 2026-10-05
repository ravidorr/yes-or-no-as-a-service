FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts

RUN npm ci --omit=dev

COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "scripts/docker-healthcheck.mjs"]

CMD ["node", "src/server.js"]
