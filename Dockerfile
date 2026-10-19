# 一個容器同時提供網頁與 /api(Gemini 代理),適合 Google Cloud Run。
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/game ./src/game
EXPOSE 8080
CMD ["node", "server/index.js"]
