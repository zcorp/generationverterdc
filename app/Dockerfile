# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# --- Développement : hot reload via volume monté ---
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Build de production ---
FROM base AS build
ARG DEPLOY_MODE=server
ARG NEXT_PUBLIC_BASE_PATH=
ENV DEPLOY_MODE=$DEPLOY_MODE
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
COPY package*.json ./
RUN npm install
COPY . .
RUN if [ "$DEPLOY_MODE" = "github-pages" ]; then rm -rf src/pages/api src/pages/admin; fi \
	&& npm run build

# --- Image de production, allégée ---
FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
