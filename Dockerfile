FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install && npm prune --omit=dev

COPY backend ./backend
COPY www ./www

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_BASE_PATH=/filminho

EXPOSE 3000

CMD ["node", "backend/server.js"]
