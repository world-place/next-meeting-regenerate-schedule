FROM node:20-alpine AS base

WORKDIR /app

COPY regenerate-schedule/package*.json ./
RUN npm ci --omit=dev

COPY regenerate-schedule/ .

ENV NODE_ENV=production

CMD ["node", "fly-entry.js"]
