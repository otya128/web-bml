FROM node:22-trixie AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY node-aribts/package.json ./node-aribts/package.json
RUN npm ci

FROM node:22-trixie AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node-aribts ./node-aribts
COPY . .
ENV NODE_ENV=production
RUN npm -w @chinachu/aribts run build && npm run build

FROM node:22-trixie AS runner
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install -y ffmpeg
WORKDIR /app
COPY --from=builder /app/node-aribts/lib ./node-aribts/lib
COPY --from=builder /app/node-aribts/node_modules ./node-aribts/node_modules
COPY --from=builder /app/node-aribts/package.json ./node-aribts
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 23234

ENV HOST=0.0.0.0

CMD ["node", "build/index.js"]
