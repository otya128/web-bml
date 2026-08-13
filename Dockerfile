FROM node:24-trixie AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY example/package.json ./example/package.json ./fonts/package.json
RUN npm ci

FROM node:24-trixie AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build && npm -w example run build

FROM node:24-trixie AS runner
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install -y ffmpeg
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/fonts ./fonts
COPY --from=builder /app/example/dist ./example/dist
COPY --from=builder /app/example/build ./example/build
COPY --from=builder /app/example/public ./example/public
COPY --from=builder /app/example/package.json ./example/
COPY --from=builder /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 23234

ENV HOST=0.0.0.0

WORKDIR /app/example
CMD ["node", "build/server/index.js"]
