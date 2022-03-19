FROM node:16-buster AS deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY node-aribts/package.json ./node-aribts/package.json
RUN yarn install --frozen-lockfile

FROM node:16-buster AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node-aribts ./node-aribts
COPY . .
ENV NODE_ENV production
RUN yarn workspace @chinachu/aribts build && yarn run build
RUN node -e "require('./build/font').downloadFonts()"

FROM node:16-buster AS runner
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY --from=builder /app/node-aribts/lib ./node-aribts/lib
COPY --from=builder /app/node-aribts/node_modules ./node-aribts/node_modules
COPY --from=builder /app/node-aribts/package.json ./node-aribts
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 23234

ENV HOST 0.0.0.0

CMD ["node", "build/index.js"]
